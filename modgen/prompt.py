"""Structures that describe chat prompts for OpenAI's API."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence, Tuple

_ALLOWED_ROLES: Tuple[str, ...] = ("system", "user", "assistant", "tool")


class PromptValidationError(ValueError):
    """Raised when a prompt is constructed with invalid data."""


@dataclass(frozen=True)
class PromptMessage:
    """A single message that forms part of a chat prompt."""

    role: str
    content: Any
    name: Optional[str] = None

    def __post_init__(self) -> None:
        if self.role not in _ALLOWED_ROLES:
            raise PromptValidationError(
                f"Invalid role '{self.role}'. Expected one of {', '.join(_ALLOWED_ROLES)}"
            )
        if self.content is None:
            raise PromptValidationError("Prompt message content cannot be None")

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"role": self.role, "content": self.content}
        if self.name:
            payload["name"] = self.name
        return payload


@dataclass(frozen=True)
class StructuredPrompt:
    """Represents a full structured prompt for the chat completions API."""

    model: str
    messages: Sequence[PromptMessage]
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    response_format: Optional[Mapping[str, Any]] = None
    extra_parameters: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.model:
            raise PromptValidationError("A model must be provided for the prompt")
        if not self.messages:
            raise PromptValidationError("At least one message is required to build a prompt")
        # Validate extra parameters do not collide with reserved keys.
        reserved = {"model", "messages", "temperature", "max_tokens", "response_format"}
        conflicts = reserved.intersection(self.extra_parameters.keys())
        if conflicts:
            conflict_str = ", ".join(sorted(conflicts))
            raise PromptValidationError(
                f"extra_parameters cannot contain reserved keys: {conflict_str}"
            )

    def to_payload(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [message.to_dict() for message in self.messages],
        }
        if self.temperature is not None:
            payload["temperature"] = self.temperature
        if self.max_tokens is not None:
            payload["max_tokens"] = self.max_tokens
        if self.response_format is not None:
            payload["response_format"] = dict(self.response_format)
        if self.extra_parameters:
            payload.update(dict(self.extra_parameters))
        return payload

    @classmethod
    def from_messages(
        cls,
        model: str,
        messages: Iterable[Tuple[str, Any]],
        *,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_format: Optional[Mapping[str, Any]] = None,
        extra_parameters: Optional[Mapping[str, Any]] = None,
    ) -> "StructuredPrompt":
        prompt_messages = [PromptMessage(role=role, content=content) for role, content in messages]
        return cls(
            model=model,
            messages=prompt_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
            extra_parameters=extra_parameters or {},
        )

