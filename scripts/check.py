#!/usr/bin/env python3
"""Unified checks: default runs static checks, the selected real core and Chrome.

Network rule-set downloads are opt-in via the rule-sets task. No task starts a proxy.
"""
import argparse
import os
import subprocess
import sys

sys.dont_write_bytecode = True

from build import build
from lib.common import CheckError, executable, run
from lib.core import checker, check_profiles, check_rule_sets
from lib.pages import check as check_pages
from lib.static import audit, check_links


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("task", nargs="?", default="all", choices=("all", "static", "core", "browser", "rule-sets"))
    parser.add_argument("--core", choices=("1.13", "1.14", "1.15"), help="require this core line; otherwise detect from the checker")
    parser.add_argument("--sing-box", default=os.environ.get("SING_BOX", "sing-box"), help="checker executable (or set SING_BOX)")
    args = parser.parse_args()
    if args.core and args.task not in ("all", "core", "rule-sets"):
        parser.error("--core applies only to all, core or rule-sets")
    try:
        if args.task in ("all", "static"):
            build(check=True)
            audit()
            check_links()
            check_pages()
            run([sys.executable, "-B", "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"])
            run([executable("node"), "--test", "tests/generator.test.mjs"])
        if args.task in ("all", "core", "rule-sets"):
            binary, line, version = checker(args.sing_box, args.core)
            if args.task == "rule-sets":
                check_rule_sets(binary, line, version)
            else:
                check_profiles(binary, line, version)
                env = {**os.environ, "SING_BOX": binary, "PYTHONDONTWRITEBYTECODE": "1"}
                run([sys.executable, "-B", "tests/core_render.py"], env=env)
                run([executable("node"), "--test", "tests/core.test.mjs"], env=env)
        if args.task in ("all", "browser"):
            run([executable("node"), "tests/browser.mjs"])
    except subprocess.CalledProcessError as error:
        print(f"error: validation subprocess failed (exit {error.returncode})", file=sys.stderr)
        return 1
    except (CheckError, OSError, ValueError, KeyError, IndexError, TypeError, SyntaxError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(f"Checks passed: {args.task}.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
