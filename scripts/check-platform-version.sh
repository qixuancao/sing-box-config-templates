#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
sing_box=${SING_BOX:-sing-box}
version_line=${1:-}

case "$version_line" in
  1.13|1.14|1.15)
    ;;
  *)
    printf 'Usage: %s 1.13|1.14|1.15\n' "$0" >&2
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
    printf 'error: checker %s does not match platform line %s\n' \
      "$version_output" "$version_line" >&2
    exit 1
    ;;
esac

tmp_dir=$(mktemp -d)
cleanup() {
  find "$tmp_dir" -type f -delete 2>/dev/null || true
  find "$tmp_dir" -depth -type d -empty -delete 2>/dev/null || true
}
trap cleanup EXIT

profiles=()
profile_root="$repo_dir/platforms"
if [[ "$version_line" == "1.15" ]]; then profile_root="$repo_dir/experimental/1.15/platforms"; fi
while IFS= read -r profile; do
  profiles+=("$profile")
done < <(
  if [[ "$version_line" == "1.15" ]]; then
    find "$profile_root" -type f -name '*.json' -print | LC_ALL=C sort
  else
    find "$profile_root" -type f -path "*/$version_line/*.json" -print | LC_ALL=C sort
  fi
)

[[ ${#profiles[@]} -eq 17 ]] || {
  printf 'error: expected 17 platform %s profiles, found %d\n' \
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
  case "$profile" in
    */android/*|*/ios/*)
      jq -e '
        (.inbounds[0].type == "tun")
        and (.inbounds[0] | has("strict_route") | not)
        and (.inbounds[0] | has("auto_redirect") | not)
        and (.route | has("auto_detect_interface") | not)
      ' "$profile" >/dev/null
      ;;
    */linux/*/tun.json|*/linux/tun.json)
      jq -e '
        (.inbounds[0].type == "tun")
        and (.inbounds[0].strict_route == true)
        and (.inbounds[0].auto_redirect == true)
        and (.route.auto_detect_interface == true)
      ' "$profile" >/dev/null
      ;;
    */windows/*/tun.json|*/windows/tun.json)
      jq -e '
        (.inbounds[0].type == "tun")
        and (.inbounds[0].strict_route == true)
        and (.inbounds[0] | has("auto_redirect") | not)
        and (.route.auto_detect_interface == true)
      ' "$profile" >/dev/null
      ;;
    */macos/*)
      jq -e '
        (.inbounds[0] | has("strict_route") | not)
        and (.inbounds[0] | has("auto_redirect") | not)
        and (.route.auto_detect_interface == true)
      ' "$profile" >/dev/null
      ;;
  esac
  if [[ "$profile" == */mixed.json ]]; then
    jq -e '
      (.inbounds[0].type == "mixed")
      and (.inbounds[0].listen == "127.0.0.1")
      and ([.route.rules[].action] | index("hijack-dns") | not)
    ' "$profile" >/dev/null
  fi

  if [[ "$version_line" != "1.13" ]]; then
    jq -e '
      (."$schema" == "https://sing-box.sagernet.org/schema.json")
      and (.http_clients | type == "array" and length > 0)
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
      (has("$schema") | not)
      and (has("http_clients") | not)
      and (.route | has("default_http_client") | not)
      and all(.route.rule_set[];
        if .type == "remote" then
          .download_detour == "direct" and (has("http_client") | not)
        else
          true
        end
      )
      and all(.inbounds[]; (has("dns_mode") or has("dns_address")) | not)
      and all(.dns.rules[];
        .action != "evaluate" and (has("match_response") | not)
      )
    ' "$profile" >/dev/null
  fi
  if [[ "$version_line" == "1.15" ]]; then
    jq -e 'all(.inbounds[]; has("stack") | not)' "$profile" >/dev/null
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

android_dir="$repo_dir/platforms/android/$version_line"
if [[ "$version_line" == "1.15" ]]; then android_dir="$profile_root/android"; fi
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

printf 'Platform line %s: %d public and rendered profiles passed %s.\n' \
  "$version_line" "${#profiles[@]}" "$version_output"
