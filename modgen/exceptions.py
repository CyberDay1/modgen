"""Custom exceptions used by the Modgen project management system."""

from __future__ import annotations


class ProjectError(Exception):
    """Base class for project related errors."""


class ProjectExistsError(ProjectError):
    """Raised when attempting to create a project that already exists."""


class ProjectNotFoundError(ProjectError):
    """Raised when a requested project cannot be located on disk."""


class ProjectNotInitializedError(ProjectError):
    """Raised when the project directory exists but lacks the metadata file."""


class InvalidProjectNameError(ProjectError):
    """Raised when a project name fails validation."""


class ProjectSerializationError(ProjectError):
    """Raised when project metadata cannot be serialized to JSON."""
