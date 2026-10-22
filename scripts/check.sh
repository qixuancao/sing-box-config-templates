#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

"$repo_dir/scripts/sync-platforms.sh" --check
python3 -B "$repo_dir/scripts/check-ios-routes.py"
"$repo_dir/scripts/check-platform-version.sh" 1.14
printf '%s\n' 'Stable platform profiles and generated files passed.'
