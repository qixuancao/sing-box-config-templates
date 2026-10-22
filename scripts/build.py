#!/usr/bin/env python3
"""Build all public profiles, browser bundles and bilingual Pages (Python 3.10+)."""
import argparse
import sys

sys.dont_write_bytecode = True

from lib.common import ROOT, CheckError, require
from lib.configs import outputs as config_outputs
from lib.pages import outputs as page_outputs


def build(root=ROOT, *, check=False):
    generated = {**config_outputs(root), **page_outputs(root)}
    expected = {name for name in generated if name.endswith(".json")}
    actual = {path.relative_to(root).as_posix() for path in (root / "platforms").rglob("*.json")}
    require(not actual - expected, "Unexpected generated profiles: " + ", ".join(sorted(actual - expected)))
    stale = [name for name, content in generated.items()
             if not (root / name).is_file() or (root / name).read_bytes() != content.encode("utf-8")]
    if check:
        require(not stale, "Generated files are stale; run python3 scripts/build.py:\n" + "\n".join(stale))
    else:
        for name in stale:
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(generated[name].encode("utf-8"))
    print(f"{'Checked' if check else 'Built'} {len(expected)} public profiles, browser bundles and bilingual Pages.", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail on stale output without writing any files")
    args = parser.parse_args()
    try:
        build(check=args.check)
    except (CheckError, OSError, ValueError, KeyError, TypeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
