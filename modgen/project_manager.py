"""Project management utilities for Modgen.

The :class:`ProjectManager` coordinates the creation, loading and saving of
projects on the local filesystem. Projects are represented by the
:class:`Project` dataclass which stores metadata and timestamps that are
persisted to JSON.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, Mapping, Optional

from .exceptions import (
    InvalidProjectNameError,
    ProjectExistsError,
    ProjectNotFoundError,
    ProjectNotInitializedError,
    ProjectSerializationError,
)

PROJECT_FILE_NAME = "project.json"


@dataclass
class Project:
    """Container for project metadata."""

    name: str
    path: Path
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc).replace(microsecond=0)
    )
    updated_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc).replace(microsecond=0)
    )

    def __post_init__(self) -> None:
        self.path = Path(self.path)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize the project to a dictionary suitable for JSON encoding."""

        return {
            "name": self.name,
            "path": str(self.path),
            "description": self.description,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "Project":
        """Construct a project instance from a dictionary."""

        try:
            created_at = datetime.fromisoformat(payload["created_at"])
            updated_at = datetime.fromisoformat(payload["updated_at"])
        except KeyError as exc:  # pragma: no cover - defensive branch
            raise ProjectNotInitializedError("Project metadata is incomplete") from exc
        except ValueError as exc:  # pragma: no cover - defensive branch
            raise ProjectSerializationError("Invalid timestamp in metadata") from exc

        return cls(
            name=payload["name"],
            path=Path(payload["path"]),
            description=payload.get("description", ""),
            metadata=payload.get("metadata", {}),
            created_at=created_at,
            updated_at=updated_at,
        )


class ProjectManager:
    """Manage Modgen projects stored on the local filesystem."""

    def __init__(self, root_directory: Optional[Path | str] = None) -> None:
        if root_directory is None:
            root_directory = Path.home() / ".modgen" / "projects"
        self._root = Path(root_directory).expanduser().resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    @property
    def root(self) -> Path:
        """Return the root directory under which projects are stored."""

        return self._root

    def create_project(
        self,
        name: str,
        *,
        description: str = "",
        metadata: Optional[Mapping[str, Any]] = None,
        overwrite: bool = False,
    ) -> Project:
        """Create a new project on disk.

        Args:
            name: Human readable project name.
            description: Optional description for the project.
            metadata: Arbitrary metadata that must be JSON serialisable.
            overwrite: If ``True`` an existing project directory is reused.

        Returns:
            The newly created :class:`Project` instance.

        Raises:
            InvalidProjectNameError: The supplied name results in an empty slug.
            ProjectExistsError: The project already exists and ``overwrite`` is ``False``.
            ProjectSerializationError: The metadata cannot be encoded as JSON.
        """

        project_path = self._project_path_for_name(name)
        if project_path.exists() and not overwrite:
            raise ProjectExistsError(f"Project '{name}' already exists")
        project_path.mkdir(parents=True, exist_ok=True)
        project_metadata = dict(metadata) if metadata is not None else {}
        project = Project(
            name=name,
            path=project_path,
            description=description,
            metadata=project_metadata,
        )
        self.save_project(project)
        return project

    def save_project(self, project: Project) -> None:
        """Persist the given project to disk."""

        project.updated_at = datetime.now(timezone.utc).replace(microsecond=0)
        payload = project.to_dict()
        self._ensure_json_serializable(payload["metadata"])
        metadata_path = project.path / PROJECT_FILE_NAME
        metadata_path.parent.mkdir(parents=True, exist_ok=True)
        metadata_path.write_text(json.dumps(payload, indent=2, sort_keys=True))

    def load_project(self, name: str) -> Project:
        """Load a project by name."""

        project_path = self._project_path_for_name(name)
        if not project_path.exists():
            raise ProjectNotFoundError(f"Project '{name}' does not exist")
        metadata_path = project_path / PROJECT_FILE_NAME
        if not metadata_path.exists():
            raise ProjectNotInitializedError(
                f"Project '{name}' is missing metadata at {metadata_path}"
            )
        payload = json.loads(metadata_path.read_text())
        project = Project.from_dict(payload)
        project.path = project_path
        return project

    def list_projects(self) -> Iterable[str]:
        """Iterate over all project names stored in the root directory."""

        for candidate in sorted(self._root.iterdir()):
            if not candidate.is_dir():
                continue
            metadata_path = candidate / PROJECT_FILE_NAME
            if not metadata_path.exists():
                continue
            try:
                payload = json.loads(metadata_path.read_text())
            except json.JSONDecodeError:  # pragma: no cover - defensive branch
                continue
            yield payload.get("name", candidate.name)

    def project_exists(self, name: str) -> bool:
        """Return ``True`` if a project with ``name`` exists."""

        project_path = self._project_path_for_name(name)
        return project_path.exists() and (project_path / PROJECT_FILE_NAME).exists()

    def _project_path_for_name(self, name: str) -> Path:
        slug = self._slugify(name)
        return self._root / slug

    @staticmethod
    def _slugify(name: str) -> str:
        """Create a filesystem-friendly slug for ``name``."""

        if not isinstance(name, str):
            raise InvalidProjectNameError("Project name must be a string")
        slug = re.sub(r"[^A-Za-z0-9._-]+", "-", name.strip())
        slug = re.sub(r"[-_.]{2,}", "-", slug)
        slug = slug.strip("-_.")
        if not slug:
            raise InvalidProjectNameError("Project name results in an empty slug")
        return slug

    @staticmethod
    def _ensure_json_serializable(metadata: Dict[str, Any]) -> None:
        try:
            json.dumps(metadata)
        except (TypeError, ValueError) as exc:  # pragma: no cover - simple passthrough
            raise ProjectSerializationError("Metadata must be JSON serialisable") from exc
