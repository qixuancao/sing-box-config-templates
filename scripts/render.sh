#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  printf 'Usage: %s TEMPLATE NODES_JSON OUTPUT\n' "$0" >&2
  exit 2
fi
command -v node >/dev/null 2>&1 || {
  printf '%s\n' 'error: Node.js 22+ is required' >&2
  exit 1
}
repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
exec node "$repo_dir/scripts/generate.mjs" --template "$1" --input "$2" --output "$3"
