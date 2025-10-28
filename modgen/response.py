"""Data structures for parsed OpenAI responses."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .prompt import PromptMessage


@dataclass(frozen=True)
class Usage:
    """Token usage metrics returned by the API."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Usage":
        return cls(
            prompt_tokens=int(data.get("prompt_tokens", 0)),
            completion_tokens=int(data.get("completion_tokens", 0)),
            total_tokens=int(data.get("total_tokens", 0)),
        )


@dataclass(frozen=True)
class Choice:
    """A single choice returned by a chat completion response."""

    index: int
    message: PromptMessage
    finish_reason: Optional[str]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Choice":
        message_payload = data.get("message") or {}
        message = PromptMessage(
            role=message_payload.get("role", "assistant"),
            content=message_payload.get("content", ""),
            name=message_payload.get("name"),
        )
        return cls(
            index=int(data.get("index", 0)),
            message=message,
            finish_reason=data.get("finish_reason"),
        )


@dataclass(frozen=True)
class OpenAIResponse:
    """Structured representation of a response from OpenAI."""

    id: str
    model: str
    choices: List[Choice]
    usage: Optional[Usage] = None
    created: Optional[int] = None

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "OpenAIResponse":
        choices_raw = payload.get("choices") or []
        choices = [Choice.from_dict(choice) for choice in choices_raw]
        usage_payload = payload.get("usage")
        usage = Usage.from_dict(usage_payload) if isinstance(usage_payload, dict) else None
        return cls(
            id=str(payload.get("id", "")),
            model=str(payload.get("model", "")),
            choices=choices,
            usage=usage,
            created=payload.get("created"),
        )

    def first_message(self) -> Optional[PromptMessage]:
        """Return the first available message from the choices if present."""

        return self.choices[0].message if self.choices else None

