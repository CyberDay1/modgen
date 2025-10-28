from __future__ import annotations

import json
from pathlib import Path

import pytest

from modgen import (
    InvalidProjectNameError,
    ProjectExistsError,
    ProjectManager,
    ProjectNotFoundError,
    ProjectSerializationError,
)


def test_create_project_creates_directory_and_metadata(tmp_path: Path) -> None:
    manager = ProjectManager(tmp_path)
    project = manager.create_project(
        "My Project", description="A sample", metadata={"language": "python"}
    )

    project_dir = tmp_path / "My-Project"
    assert project_dir.exists()
    metadata_path = project_dir / "project.json"
    data = json.loads(metadata_path.read_text())
    assert data["name"] == "My Project"
    assert data["description"] == "A sample"
    assert data["metadata"] == {"language": "python"}


def test_save_and_load_project_roundtrip(tmp_path: Path) -> None:
    manager = ProjectManager(tmp_path)
    project = manager.create_project("Roundtrip", metadata={"version": 1})
    project.description = "Updated"
    project.metadata["version"] = 2

    manager.save_project(project)
    loaded = manager.load_project("Roundtrip")

    assert loaded.description == "Updated"
    assert loaded.metadata == {"version": 2}
    assert loaded.created_at <= loaded.updated_at


def test_project_exists_and_list_projects(tmp_path: Path) -> None:
    manager = ProjectManager(tmp_path)
    manager.create_project("Example One")
    manager.create_project("Example Two")

    assert manager.project_exists("Example One")
    assert sorted(manager.list_projects()) == ["Example One", "Example Two"]


def test_create_existing_project_without_overwrite_raises(tmp_path: Path) -> None:
    manager = ProjectManager(tmp_path)
    manager.create_project("Duplicate")

    with pytest.raises(ProjectExistsError):
        manager.create_project("Duplicate")


def test_invalid_name_raises(tmp_path: Path) -> None:
    manager = ProjectManager(tmp_path)

    with pytest.raises(InvalidProjectNameError):
        manager.create_project("***")


def test_missing_project_raises(tmp_path: Path) -> None:
    manager = ProjectManager(tmp_path)

    with pytest.raises(ProjectNotFoundError):
        manager.load_project("Missing")


def test_non_serialisable_metadata_raises(tmp_path: Path) -> None:
    manager = ProjectManager(tmp_path)

    with pytest.raises(ProjectSerializationError):
        manager.create_project("Invalid Metadata", metadata={"bad": object()})
