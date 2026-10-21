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
command -v python3 >/dev/null 2>&1 || {
  printf '%s\n' 'error: python3 is required to generate safe iOS LAN bypass routes' >&2
  exit 1
}

tmp_dir=$(mktemp -d)
cleanup() {
  find "$tmp_dir" -type f -delete 2>/dev/null || true
  find "$tmp_dir" -depth -type d -empty -delete 2>/dev/null || true
}
trap cleanup EXIT

changed=0
expected_outputs=()

emit() {
  local source=$1
  local relative_output=$2
  local filter=$3
  local generated="$tmp_dir/$relative_output"
  local destination="$repo_dir/$relative_output"
  expected_outputs+=("$relative_output")

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
legacy_filter='
  del(."$schema", .http_clients, .route.default_http_client)
  | .inbounds |= map(del(.dns_mode, .dns_address))
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

emit_versioned() {
  local platform=$1 variant=$2 source=$3 platform_filter=$4
  local version version_filter
  for version in 1.14 1.13; do
    version_filter='.'
    if [[ "$version" == "1.13" ]]; then
      version_filter=$legacy_filter
    fi
    emit "$source" "platforms/$platform/$version/$variant.json" \
      "$platform_filter | $version_filter | .experimental.cache_file.cache_id = \"$platform-$version-$variant\""
  done
}

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

  emit_versioned android "$variant" "$source" "$variant_filter"
}

for variant in \
  fakeip realip tcp-stable privacy-strict \
  dual-stack no-adblock battery-saver udp-first; do
  emit_android_variant "$variant"
done

for variant in fakeip realip; do
  ios_excludes=$(python3 "$repo_dir/scripts/ios_route_excludes.py" \
    "$repo_dir/templates/$variant.json")
  emit_versioned ios "$variant" "templates/$variant.json" \
    "$apple_filter | .inbounds[0].route_exclude_address = $ios_excludes"
  emit_versioned macos "$variant" "templates/$variant.json" "$macos_filter"
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

for platform in macos linux windows; do
  emit_versioned "$platform" mixed "templates/realip.json" "$mixed_filter"
done

emit_versioned linux tun "templates/realip.json" '
  .inbounds[0].strict_route = true
  | .inbounds[0].auto_redirect = true
  | .inbounds[0].dns_mode = "hijack"
  | .route.auto_detect_interface = true
'

emit_versioned windows tun "templates/realip.json" '
  .inbounds[0].strict_route = true
  | del(.inbounds[0].auto_redirect)
  | .inbounds[0].dns_mode = "hijack"
  | .route.auto_detect_interface = true
'

# Refuse aliases, retired versions, and stray profiles instead of silently
# publishing a configuration outside the maintained platform/version matrix.
printf '%s\n' "${expected_outputs[@]}" | LC_ALL=C sort >"$tmp_dir/expected-paths"
while IFS= read -r path; do
  printf '%s\n' "${path#"$repo_dir/"}"
done < <(find "$repo_dir/platforms" -type f -name '*.json' -print) \
  | LC_ALL=C sort >"$tmp_dir/actual-paths"
if ! cmp -s "$tmp_dir/expected-paths" "$tmp_dir/actual-paths"; then
  printf '%s\n' 'error: platform JSON files must live in the maintained 1.13/1.14 directories:' >&2
  diff -u "$tmp_dir/expected-paths" "$tmp_dir/actual-paths" >&2 || true
  exit 1
fi

if [[ "$mode" == "--check" ]]; then
  if (( changed != 0 )); then
    printf '%s\n' 'Platform profiles are not synchronized. Run ./scripts/sync-platforms.sh.' >&2
    exit 1
  fi
  printf '%s\n' 'Platform profiles are synchronized.'
  python3 -B "$repo_dir/scripts/sync-web-profiles.py" --check
else
  python3 -B "$repo_dir/scripts/sync-web-profiles.py"
fi
