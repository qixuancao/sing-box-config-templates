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

"$repo_dir/scripts/sync-platforms.sh" --check
python3 -B "$repo_dir/scripts/check-ios-routes.py"

for template in "$repo_dir"/templates/*.json; do
  normalized="$tmp_dir/normalized-$(basename "$template")"
  jq -f "$repo_dir/scripts/policy-layout.jq" "$template" >"$normalized"
  cmp -s -- "$normalized" "$template" || {
    printf 'error: policy layout is out of date: %s\n' "$template" >&2
    exit 1
  }
done

required_groups='[
  "select",
  "auto",
  "udp-auto",
  "streaming",
  "ai",
  "telegram",
  "microsoft",
  "apple",
  "google",
  "github",
  "direct",
  "GLOBAL"
]'

for template in "$repo_dir"/templates/*.json; do
  jq empty "$template"
  jq -e --argjson required "$required_groups" '
    [.outbounds[].tag] as $tags
    | (."$schema" == "https://sing-box.sagernet.org/schema.json")
      and all($required[]; . as $tag | ($tags | index($tag)) != null)
  ' "$template" >/dev/null
  (
    cd "$tmp_dir"
    "$sing_box" check -c "$template"
  )

  rendered="$tmp_dir/$(basename "$template")"
  "$repo_dir/scripts/render.sh" \
    "$template" \
    "$repo_dir/examples/nodes.example.json" \
    "$rendered" >/dev/null
  if rendered_mode=$(stat -c '%a' "$rendered" 2>/dev/null); then
    :
  else
    rendered_mode=$(stat -f '%Lp' "$rendered")
  fi
  [[ "$rendered_mode" == "600" ]] || {
    printf 'error: rendered profile is not mode 600: %s\n' "$rendered" >&2
    exit 1
  }
  (
    cd "$tmp_dir"
    "$sing_box" check -c "$rendered"
  )
done

"$repo_dir/scripts/check-platform-version.sh" 1.14
printf '%s\n' 'Common templates and platform profiles passed.'
