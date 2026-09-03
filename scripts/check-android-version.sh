#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
sing_box=${SING_BOX:-sing-box}
version_line=${1:-}

case "$version_line" in
  1.12|1.13|1.14)
    ;;
  *)
    printf 'Usage: %s 1.12|1.13|1.14\n' "$0" >&2
    exit 2
    ;;
esac

command -v jq >/dev/null 2>&1 || {
  printf '%s\n' 'error: jq is required' >&2
  exit 1
}
command -v "$sing_box" >/dev/null 2>&1 || {
  printf 'error: sing-box checker not found: %s\n' "$sing_box" >&2
  exit 1
}

version_output=$("$sing_box" version | sed -n '1p')
case "$version_output" in
  *"version $version_line."*)
    ;;
  *)
    printf 'error: checker %s does not match Android line %s\n' \
      "$version_output" "$version_line" >&2
    exit 1
    ;;
esac

profile_dir="$repo_dir/platforms/android/$version_line"
[[ -d "$profile_dir" ]] || {
  printf 'error: Android version directory not found: %s\n' "$profile_dir" >&2
  exit 1
}

tmp_dir=$(mktemp -d)
cleanup() {
  find "$tmp_dir" -type f -delete 2>/dev/null || true
  find "$tmp_dir" -depth -type d -empty -delete 2>/dev/null || true
}
trap cleanup EXIT

profiles=()
while IFS= read -r profile; do
  profiles+=("$profile")
done < <(find "$profile_dir" -type f -name '*.json' -print | LC_ALL=C sort)

[[ ${#profiles[@]} -eq 8 ]] || {
  printf 'error: expected 8 Android %s profiles, found %d\n' \
    "$version_line" "${#profiles[@]}" >&2
  exit 1
}

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

for profile in "${profiles[@]}"; do
  jq empty "$profile"
  jq -e --argjson required "$required_groups" '
    [.outbounds[].tag] as $tags
    | all($required[]; . as $tag | ($tags | index($tag)) != null)
  ' "$profile" >/dev/null
  jq -e '
    (.inbounds[0].type == "tun")
    and (.inbounds[0] | has("strict_route") | not)
    and (.route | has("auto_detect_interface") | not)
  ' "$profile" >/dev/null

  if [[ "$version_line" == "1.14" ]]; then
    jq -e '
      (.http_clients | type == "array" and length > 0)
      and (.route.default_http_client == "rule-set-direct")
      and all(.route.rule_set[];
        if .type == "remote" then
          .http_client == "rule-set-direct" and (has("download_detour") | not)
        else
          true
        end
      )
    ' "$profile" >/dev/null
  else
    jq -e '
      (has("http_clients") | not)
      and (.route | has("default_http_client") | not)
      and all(.route.rule_set[];
        if .type == "remote" then
          .download_detour == "direct" and (has("http_client") | not)
        else
          true
        end
      )
      and all(.dns.rules[];
        .action != "evaluate" and (has("match_response") | not)
      )
    ' "$profile" >/dev/null
  fi

  (
    cd "$tmp_dir"
    "$sing_box" check -c "$profile"
  )

  rendered="$tmp_dir/$(basename "$profile")"
  "$repo_dir/scripts/render.sh" \
    "$profile" \
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

printf 'Android %s: %d public and rendered profiles passed %s.\n' \
  "$version_line" "${#profiles[@]}" "$version_output"
