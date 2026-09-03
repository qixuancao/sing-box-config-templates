#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
sing_box=${SING_BOX:-sing-box}

command -v jq >/dev/null 2>&1 || {
  printf '%s\n' 'error: jq is required' >&2
  exit 1
}
command -v "$sing_box" >/dev/null 2>&1 || {
  printf 'error: sing-box checker not found: %s\n' "$sing_box" >&2
  exit 1
}

tmp_dir=$(mktemp -d)
cleanup() {
  find "$tmp_dir" -type f -delete 2>/dev/null || true
  find "$tmp_dir" -depth -type d -empty -delete 2>/dev/null || true
}
trap cleanup EXIT

for template in "$repo_dir"/templates/*.json; do
  jq empty "$template"
  (
    cd "$tmp_dir"
    "$sing_box" check -c "$template"
  )

  rendered="$tmp_dir/$(basename "$template")"
  "$repo_dir/scripts/render.sh" \
    "$template" \
    "$repo_dir/examples/nodes.example.json" \
    "$rendered" >/dev/null
  (
    cd "$tmp_dir"
    "$sing_box" check -c "$rendered"
  )
done

printf '%s\n' 'All public templates and rendered examples passed sing-box check.'
