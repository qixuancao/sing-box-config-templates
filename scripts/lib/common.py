"""Shared paths, strict JSON loading and subprocess helpers."""
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]


class CheckError(RuntimeError):
    """A validation failure safe to report without printing configuration values."""


def require(condition, message):
    if not condition:
        raise CheckError(message)


def read_json(path):
    def reject_constant(_):
        raise ValueError("Non-finite JSON number")

    try:
        return json.loads(path.read_text(encoding="utf-8"), parse_constant=reject_constant)
    except (ValueError, UnicodeError) as error:
        raise CheckError(f"Invalid JSON: {path}") from error


def executable(command):
    path = shutil.which(command)
    require(path is not None, f"Required executable not found: {command}")
    return str(Path(path).resolve())


def run(command, *, cwd=ROOT, env=None, capture=False):
    return subprocess.run(command, cwd=cwd, env=env, check=True,
                          text=True, encoding="utf-8", capture_output=capture)
