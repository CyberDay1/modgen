# Modgen

Utilities for managing Modgen projects on the local filesystem.

## Features

- Create new projects inside a configurable root directory
- Persist project metadata (name, description, and arbitrary JSON-friendly data)
- Load existing projects, update metadata, and list available projects

## Usage

```python
from modgen import ProjectManager

manager = ProjectManager("./projects")
project = manager.create_project(
    "Example Project",
    description="Demo project",
    metadata={"language": "python"},
)

project.metadata["language"] = "python-3.11"
manager.save_project(project)

loaded = manager.load_project("Example Project")
print(loaded.metadata)
```

## Development

Install dependencies and run the test suite using:

```bash
python -m pip install -e .[test]
python -m pytest
```
