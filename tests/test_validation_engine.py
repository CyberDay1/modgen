from pathlib import Path
import textwrap

from modgen.validation_engine import ValidationEngine


def test_validate_json_success() -> None:
    engine = ValidationEngine()
    result = engine.validate_json('{"name": "Modgen"}')
    assert result.is_valid
    assert result.issues == []


def test_validate_json_failure() -> None:
    engine = ValidationEngine()
    payload = '{"name": "Modgen", }'
    result = engine.validate_json(payload, source_path=Path("config.json"))
    assert not result.is_valid
    issue = result.issues[0]
    assert issue.path == Path("config.json")
    assert "JSON syntax error" in issue.message
    assert issue.line is not None
    assert issue.column is not None


def test_validate_java_success() -> None:
    engine = ValidationEngine()
    source = textwrap.dedent(
        """
        public class Example {
            public void run() {
                System.out.println("hello");
            }
        }
        """
    )
    result = engine.validate_java(source, source_path=Path("Example.java"))
    assert result.is_valid


def test_validate_java_failure() -> None:
    engine = ValidationEngine()
    source = textwrap.dedent(
        """
        public class Example {
            public void run() {
                System.out.println("hello")
            }
        }
        """
    )
    result = engine.validate_java(source, source_path=Path("Example.java"))
    assert not result.is_valid
    issue = result.issues[0]
    assert issue.path == Path("Example.java")
    assert issue.line is not None
    assert "Java" in issue.message


def test_validate_file_structure_success(tmp_path: Path) -> None:
    engine = ValidationEngine()
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "Example.java").write_text("class Example {}\n")
    expected = ["src/", "src/Example.java"]
    result = engine.validate_file_structure(tmp_path, expected)
    assert result.is_valid


def test_validate_file_structure_missing_file(tmp_path: Path) -> None:
    engine = ValidationEngine()
    (tmp_path / "src").mkdir()
    result = engine.validate_file_structure(tmp_path, ["src/", "src/Main.java"])
    assert not result.is_valid
    issue_messages = [issue.message for issue in result.issues]
    assert any(message.startswith("Missing file") for message in issue_messages)
