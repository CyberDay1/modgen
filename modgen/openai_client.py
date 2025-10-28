"""OpenAI API client focused on structured prompt workflows."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from .prompt import StructuredPrompt
from .response import OpenAIResponse

LOGGER = logging.getLogger(__name__)


class OpenAIAPIError(RuntimeError):
    """Raised when the OpenAI API returns an error or malformed response."""

    def __init__(self, message: str, *, status_code: Optional[int] = None, payload: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


@dataclass
class OpenAIClientConfig:
    """Configuration for :class:`OpenAIClient`."""

    api_key: str
    organization: Optional[str] = None
    project: Optional[str] = None
    base_url: str = "https://api.openai.com/v1/"
    timeout: Optional[float] = 30.0

    def headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        if self.organization:
            headers["OpenAI-Organization"] = self.organization
        if self.project:
            headers["OpenAI-Project"] = self.project
        return headers


class OpenAIClient:
    """Thin wrapper for sending structured prompts to the OpenAI API."""

    def __init__(self, api_key: str, **config_kwargs: Any) -> None:
        config_kwargs.setdefault("base_url", "https://api.openai.com/v1/")
        self._config = OpenAIClientConfig(api_key=api_key, **config_kwargs)

    @property
    def base_url(self) -> str:
        return self._config.base_url

    def _build_request(self, endpoint: str, payload: Dict[str, Any]) -> Request:
        url = urljoin(self.base_url, endpoint.lstrip("/"))
        data = json.dumps(payload).encode("utf-8")
        headers = self._config.headers()
        LOGGER.debug("Dispatching request to %s with headers %s", url, headers.keys())
        return Request(url=url, data=data, headers=headers, method="POST")

    def _execute(self, request: Request) -> Dict[str, Any]:
        status_code: Optional[int] = None
        try:
            with urlopen(request, timeout=self._config.timeout) as response:  # type: ignore[arg-type]
                body = response.read().decode("utf-8")
                status_code = getattr(response, "status", response.getcode())
        except HTTPError as exc:  # pragma: no cover - network errors are rare but handled
            body = exc.read().decode("utf-8") if exc.fp else ""
            raise OpenAIAPIError(
                f"OpenAI API request failed with status {exc.code}",
                status_code=exc.code,
                payload=body,
            ) from exc
        except URLError as exc:  # pragma: no cover - connectivity issues
            raise OpenAIAPIError("Failed to reach OpenAI API", payload=str(exc)) from exc

        try:
            payload: Dict[str, Any] = json.loads(body)
        except json.JSONDecodeError as exc:
            raise OpenAIAPIError(
                "OpenAI API returned invalid JSON", status_code=status_code, payload=body
            ) from exc
        if status_code >= 400:
            raise OpenAIAPIError(
                f"OpenAI API returned error status {status_code}",
                status_code=status_code,
                payload=body,
            )
        return payload

    def create_chat_completion(self, prompt: StructuredPrompt) -> OpenAIResponse:
        """Send the structured prompt to the chat completions endpoint."""

        payload = prompt.to_payload()
        request = self._build_request("chat/completions", payload)
        response_payload = self._execute(request)
        return OpenAIResponse.from_dict(response_payload)

