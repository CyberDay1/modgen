"""Core package for the Modgen project management tooling."""

from .project_manager import Project, ProjectManager
from .exceptions import (
    ProjectError,
    ProjectExistsError,
    ProjectNotFoundError,
    ProjectNotInitializedError,
    InvalidProjectNameError,
    ProjectSerializationError,
)

__all__ = [
    "Project",
    "ProjectManager",
    "ProjectError",
    "ProjectExistsError",
    "ProjectNotFoundError",
    "ProjectNotInitializedError",
    "InvalidProjectNameError",
    "ProjectSerializationError",
"""Utilities for interacting with the OpenAI API using structured prompts.

This package provides a light-weight, dependency free client for sending
structured prompts to OpenAI's chat completion endpoint.  The goal is to keep
network interaction logic together with data-structures that represent requests
and responses.
"""

from .openai_client import OpenAIClient, OpenAIAPIError
from .prompt import PromptMessage, StructuredPrompt
from .response import OpenAIResponse, Choice, Usage

__all__ = [
    "OpenAIAPIError",
    "OpenAIClient",
    "PromptMessage",
    "StructuredPrompt",
    "OpenAIResponse",
    "Choice",
    "Usage",
]
