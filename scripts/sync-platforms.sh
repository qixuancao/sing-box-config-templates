#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
mode=${1:-write}
if [[ "$mode" != "write" && "$mode" != "--check" ]]; then
  printf 'Usage: %s [--check]\n' "$0" >&2
  exit 2
fi
# Unlike empty arrays under nounset, empty positional arguments work on Bash 3.2.
if [[ "$mode" == "--check" ]]; then set -- --check; else set --; fi
python3 -B "$repo_dir/scripts/build-configs.py" "$@"
python3 -B "$repo_dir/scripts/sync-web-profiles.py" "$@"
