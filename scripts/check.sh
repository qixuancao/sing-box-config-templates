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

for template in "$repo_dir"/templates/*.json; do
  normalized="$tmp_dir/normalized-$(basename "$template")"
  jq -f "$repo_dir/scripts/policy-layout.jq" "$template" >"$normalized"
  cmp -s -- "$normalized" "$template" || {
    printf 'error: policy layout is out of date: %s\n' "$template" >&2
    exit 1
  }
done

profiles=()
while IFS= read -r profile; do
  profiles+=("$profile")
done < <(
  find "$repo_dir/templates" "$repo_dir/platforms" \
    -type f -name '*.json' \
    ! -path '*/platforms/android/1.12/*' \
    ! -path '*/platforms/android/1.13/*' \
    -print | LC_ALL=C sort
)

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

for template in "${profiles[@]}"; do
  jq empty "$template"
  jq -e --argjson required "$required_groups" '
    [.outbounds[].tag] as $tags
    | all($required[]; . as $tag | ($tags | index($tag)) != null)
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

mobile_profiles=()
while IFS= read -r profile; do
  mobile_profiles+=("$profile")
done < <(
  find "$repo_dir/platforms/android" "$repo_dir/platforms/ios" \
    -type f -name '*.json' -print | LC_ALL=C sort
)

for profile in "${mobile_profiles[@]}"; do
  jq -e '
    (.inbounds[0].type == "tun")
    and (.inbounds[0] | has("strict_route") | not)
    and (.route | has("auto_detect_interface") | not)
  ' "$profile" >/dev/null
done

for profile in \
  "$repo_dir"/platforms/android/*.json \
  "$repo_dir"/platforms/android/1.14/*.json; do
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
done

for android_dir in \
  "$repo_dir/platforms/android" \
  "$repo_dir/platforms/android/1.14" \
  "$repo_dir/platforms/android/1.13" \
  "$repo_dir/platforms/android/1.12"; do
  for variant in \
    fakeip realip tcp-stable privacy-strict \
    dual-stack no-adblock battery-saver udp-first; do
    [[ -f "$android_dir/$variant.json" ]] || {
      printf 'error: missing Android profile: %s/%s.json\n' "$android_dir" "$variant" >&2
      exit 1
    }
  done

  jq -e '
    any(.inbounds[0].address[]; contains(":"))
    and (.dns.strategy == "prefer_ipv4")
    and (all(.route.rules[];
      (((.ip_version // 0) == 6) and .action == "reject") | not
    ))
    and (all(.dns.rules[];
      (((.action == "predefined") and ((.query_type // []) | index("AAAA") != null)) | not)
    ))
  ' "$android_dir/dual-stack.json" >/dev/null

  jq -e '
    ([.route.rules[] | .rule_set? // empty] | index("category-ads-all") | not)
    and ([.route.rule_set[].tag] | index("category-ads-all") | not)
  ' "$android_dir/no-adblock.json" >/dev/null

  jq -e '
    (.log.level == "error")
    and all(.outbounds[];
      if .type == "urltest" then
        .interval == "15m" and .tolerance == 300
      else
        true
      end
    )
  ' "$android_dir/battery-saver.json" >/dev/null

  jq -e '
    (.outbounds[] | select(.tag == "select") | .default) == "udp-auto"
  ' "$android_dir/udp-first.json" >/dev/null

  jq -e '
    [.. | objects | .client_subnet? // empty] | length == 0
  ' "$android_dir/privacy-strict.json" >/dev/null
done

jq -e '
  (.inbounds[0].type == "tun")
  and (.inbounds[0].strict_route == true)
  and (.inbounds[0].auto_redirect == true)
  and (.route.auto_detect_interface == true)
' "$repo_dir/platforms/linux/tun.json" >/dev/null

jq -e '
  (.inbounds[0].type == "tun")
  and (.inbounds[0].strict_route == true)
  and (.inbounds[0] | has("auto_redirect") | not)
  and (.route.auto_detect_interface == true)
' "$repo_dir/platforms/windows/tun.json" >/dev/null

for profile in \
  "$repo_dir/platforms/linux/mixed.json" \
  "$repo_dir/platforms/macos/mixed.json" \
  "$repo_dir/platforms/windows/mixed.json"; do
  jq -e '
    (.inbounds[0].type == "mixed")
    and (.inbounds[0].listen == "127.0.0.1")
    and ([.route.rules[].action] | index("hijack-dns") | not)
  ' "$profile" >/dev/null
done

printf '%s\n' 'All public profiles, platform contracts, and rendered examples passed.'
