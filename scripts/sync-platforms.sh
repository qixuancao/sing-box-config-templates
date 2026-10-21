#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
mode=${1:-write}
if [[ "$mode" != "write" && "$mode" != "--check" ]]; then
  printf 'Usage: %s [--check]\n' "$0" >&2
  exit 2
fi
args=()
if [[ "$mode" == "--check" ]]; then args+=(--check); fi
python3 -B "$repo_dir/scripts/build-configs.py" "${args[@]}"
python3 -B "$repo_dir/scripts/sync-web-profiles.py" "${args[@]}"
