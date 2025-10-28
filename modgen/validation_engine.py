"""Validation utilities for project assets.

This module provides utilities to validate syntax for JSON and Java files as
well as utilities to verify that a project directory contains the expected
structure.  The validators return a :class:`ValidationResult` instance which
collects any issues that were discovered.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

import javalang


@dataclass(frozen=True)
class ValidationIssue:
    """Represents a single validation issue discovered during a check."""

    message: str
    path: Optional[Path] = None
    line: Optional[int] = None
    column: Optional[int] = None


@dataclass
class ValidationResult:
    """Aggregate of issues discovered by a validator."""

    issues: List[ValidationIssue] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        """Return ``True`` when the validation produced no issues."""

        return not self.issues

    def add_issue(
        self,
        message: str,
        *,
        path: Optional[Path] = None,
        line: Optional[int] = None,
        column: Optional[int] = None,
    ) -> None:
        """Record a validation issue and mark the result as invalid."""

        self.issues.append(
            ValidationIssue(message=message, path=path, line=line, column=column)
        )


class ValidationEngine:
    """Perform syntax and file structure validation for project assets."""

    def validate_json(
        self, payload: str, *, source_path: Optional[Path] = None
    ) -> ValidationResult:
        """Validate that ``payload`` contains valid JSON syntax."""

        result = ValidationResult()
        try:
            json.loads(payload)
        except json.JSONDecodeError as exc:
            message = (
                f"JSON syntax error: {exc.msg} (line {exc.lineno} column {exc.colno})"
            )
            result.add_issue(
                message,
                path=source_path,
                line=exc.lineno,
                column=exc.colno,
            )
        return result

    def validate_java(
        self, source: str, *, source_path: Optional[Path] = None
    ) -> ValidationResult:
        """Validate that ``source`` contains syntactically valid Java."""

        result = ValidationResult()
        if not source.strip():
            result.add_issue("Java source is empty", path=source_path)
            return result

        try:
            javalang.parse.parse(source)
        except javalang.parser.JavaSyntaxError as exc:
            line, column = self._extract_position(getattr(exc, "position", None))
            if line is None and hasattr(exc, "at"):
                line, column = self._extract_position(getattr(exc.at, "position", None))
            description = getattr(exc, "description", str(exc))
            result.add_issue(
                f"Java syntax error: {description}",
                path=source_path,
                line=line,
                column=column,
            )
        except javalang.tokenizer.LexerError as exc:
            line, column = self._extract_position(getattr(exc, "position", None))
            result.add_issue(
                f"Java lexical error: {exc}",
                path=source_path,
                line=line,
                column=column,
            )
        except ValueError as exc:  # pragma: no cover - defensive branch
            result.add_issue(
                f"Java parsing failed: {exc}",
                path=source_path,
            )
        return result

    def validate_file_structure(
        self,
        root: Path | str,
        expected_entries: Sequence[str],
    ) -> ValidationResult:
        """Ensure that ``root`` contains the expected files and directories."""

        result = ValidationResult()
        root_path = Path(root)
        if not root_path.exists():
            result.add_issue(f"Root path does not exist: {root_path}", path=root_path)
            return result

        for entry in expected_entries:
            normalized_entry = entry.rstrip("/")
            expected_path = root_path / Path(normalized_entry)
            expect_directory = entry.endswith("/")

            if expect_directory:
                if not expected_path.exists():
                    result.add_issue(
                        f"Missing directory: {expected_path}",
                        path=expected_path,
                    )
                elif not expected_path.is_dir():
                    result.add_issue(
                        f"Expected directory but found file: {expected_path}",
                        path=expected_path,
                    )
                continue

            if not expected_path.exists():
                result.add_issue(
                    f"Missing file: {expected_path}",
                    path=expected_path,
                )
            elif expected_path.is_dir():
                result.add_issue(
                    f"Expected file but found directory: {expected_path}",
                    path=expected_path,
                )
        return result

    @staticmethod
    def _extract_position(
        position: Optional[Tuple[int | None, int | None]]
    ) -> Tuple[Optional[int], Optional[int]]:
        if position is None:
            return None, None
        line, column = position
        return line, column
