#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
mode=${1:-write}

if [[ "$mode" != "write" && "$mode" != "--check" ]]; then
  printf 'Usage: %s [--check]\n' "$0" >&2
  exit 2
fi

command -v jq >/dev/null 2>&1 || {
  printf '%s\n' 'error: jq is required' >&2
  exit 1
}

tmp_dir=$(mktemp -d)
cleanup() {
  find "$tmp_dir" -type f -delete 2>/dev/null || true
  find "$tmp_dir" -depth -type d -empty -delete 2>/dev/null || true
}
trap cleanup EXIT

changed=0

emit() {
  local source=$1
  local relative_output=$2
  local filter=$3
  local generated="$tmp_dir/$relative_output"
  local destination="$repo_dir/$relative_output"

  mkdir -p -- "$(dirname -- "$generated")"
  jq "$filter" "$repo_dir/$source" >"$generated"
  jq empty "$generated"

  if [[ "$mode" == "--check" ]]; then
    if ! cmp -s -- "$generated" "$destination"; then
      printf 'out of date: %s\n' "$relative_output" >&2
      changed=1
    fi
  else
    mkdir -p -- "$(dirname -- "$destination")"
    install -m 0644 -- "$generated" "$destination"
    printf 'updated: %s\n' "$relative_output"
  fi
}

android_filter='del(.inbounds[0].strict_route, .route.auto_detect_interface)'
android_dual_stack_filter='
  del(.inbounds[0].strict_route, .route.auto_detect_interface)
  | .dns.rules |= map(select(
      ((.action == "predefined") and ((.query_type // []) | index("AAAA") != null))
      | not
    ))
  | .dns.strategy = "prefer_ipv4"
  | .route.rules |= map(select(
      (((.ip_version // 0) == 6) and .action == "reject")
      | not
    ))
  | (.route.rules[] | select(.action == "resolve") | .strategy) = "prefer_ipv4"
  | .inbounds[0].address += ["fdfe:dcba:9876::1/126"]
'
android_no_adblock_filter='
  del(.inbounds[0].strict_route, .route.auto_detect_interface)
  | .route.rules |= map(select((.rule_set // "") != "category-ads-all"))
  | .route.rule_set |= map(select(.tag != "category-ads-all"))
'
android_battery_saver_filter='
  del(.inbounds[0].strict_route, .route.auto_detect_interface)
  | .log.level = "error"
  | (.outbounds[] | select(.type == "urltest") | .interval) = "15m"
  | (.outbounds[] | select(.type == "urltest") | .tolerance) = 300
'
android_udp_first_filter='
  del(.inbounds[0].strict_route, .route.auto_detect_interface)
  | (.outbounds[] | select(.tag == "select") | .default) = "udp-auto"
'
legacy_android_filter='
  del(.http_clients, .route.default_http_client)
  | .route.rule_set |= map(
      del(.http_client)
      | .download_detour = "direct"
    )
  | .dns.rules |= map(select(
      (.action != "evaluate")
      and (has("match_response") | not)
    ))
'
apple_filter='del(.inbounds[0].strict_route, .route.auto_detect_interface)'
macos_filter='.route.auto_detect_interface = true | del(.inbounds[0].strict_route)'

emit_android_variant() {
  local variant=$1
  local source
  local variant_filter

  case "$variant" in
    fakeip|realip|tcp-stable|privacy-strict)
      source="templates/$variant.json"
      variant_filter=$android_filter
      ;;
    dual-stack)
      source="templates/realip.json"
      variant_filter=$android_dual_stack_filter
      ;;
    no-adblock)
      source="templates/realip.json"
      variant_filter=$android_no_adblock_filter
      ;;
    battery-saver)
      source="templates/realip.json"
      variant_filter=$android_battery_saver_filter
      ;;
    udp-first)
      source="templates/realip.json"
      variant_filter=$android_udp_first_filter
      ;;
    *)
      printf 'error: unknown Android variant: %s\n' "$variant" >&2
      exit 1
      ;;
  esac

  # The top-level path is the stable alias for the current core line.
  emit "$source" "platforms/android/$variant.json" \
    "$variant_filter | .experimental.cache_file.cache_id = \"android-$variant\""

  emit "$source" "platforms/android/1.14/$variant.json" \
    "$variant_filter | .experimental.cache_file.cache_id = \"android-1.14-$variant\""

  emit "$source" "platforms/android/1.13/$variant.json" \
    "$variant_filter | $legacy_android_filter | .experimental.cache_file.cache_id = \"android-1.13-$variant\""

  emit "$source" "platforms/android/1.12/$variant.json" \
    "$variant_filter | $legacy_android_filter | .experimental.cache_file.cache_id = \"android-1.12-$variant\""
}

for variant in \
  fakeip realip tcp-stable privacy-strict \
  dual-stack no-adblock battery-saver udp-first; do
  emit_android_variant "$variant"
done

for variant in fakeip realip; do
  emit "templates/$variant.json" "platforms/ios/$variant.json" \
    "$apple_filter | .experimental.cache_file.cache_id = \"ios-$variant\""
  emit "templates/$variant.json" "platforms/macos/$variant.json" \
    "$macos_filter | .experimental.cache_file.cache_id = \"macos-$variant\""
done

mixed_filter='
  .inbounds = [{
    "type": "mixed",
    "tag": "mixed-in",
    "listen": "127.0.0.1",
    "listen_port": 2080
  }]
  | .route.rules |= map(select(.action != "hijack-dns"))
  | .route.auto_detect_interface = true
'

emit "templates/realip.json" "platforms/macos/mixed.json" \
  "$mixed_filter | .experimental.cache_file.cache_id = \"macos-mixed\""
emit "templates/realip.json" "platforms/linux/mixed.json" \
  "$mixed_filter | .experimental.cache_file.cache_id = \"linux-mixed\""
emit "templates/realip.json" "platforms/windows/mixed.json" \
  "$mixed_filter | .experimental.cache_file.cache_id = \"windows-mixed\""

emit "templates/realip.json" "platforms/linux/tun.json" '
  .inbounds[0].strict_route = true
  | .inbounds[0].auto_redirect = true
  | .inbounds[0].dns_mode = "hijack"
  | .route.auto_detect_interface = true
  | .experimental.cache_file.cache_id = "linux-tun"
'

emit "templates/realip.json" "platforms/windows/tun.json" '
  .inbounds[0].strict_route = true
  | del(.inbounds[0].auto_redirect)
  | .inbounds[0].dns_mode = "hijack"
  | .route.auto_detect_interface = true
  | .experimental.cache_file.cache_id = "windows-tun"
'

if [[ "$mode" == "--check" ]]; then
  if (( changed != 0 )); then
    printf '%s\n' 'Platform profiles are not synchronized. Run ./scripts/sync-platforms.sh.' >&2
    exit 1
  fi
  printf '%s\n' 'Platform profiles are synchronized.'
fi
