#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
sing_box=${SING_BOX:-sing-box}
version_line=${1:-}

case "$version_line" in
  1.13|1.14)
    ;;
  *)
    printf 'Usage: %s 1.13|1.14\n' "$0" >&2
    exit 2
    ;;
esac

for command_name in jq curl "$sing_box"; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'error: required command not found: %s\n' "$command_name" >&2
    exit 1
  }
done

version_output=$("$sing_box" version | sed -n '1p')
case "$version_output" in
  *"version $version_line."*)
    ;;
  *)
    printf 'error: checker %s does not match rule-set line %s\n' \
      "$version_output" "$version_line" >&2
    exit 1
    ;;
esac

profile="$repo_dir/platforms/android/$version_line/realip.json"
tmp_dir=$(mktemp -d)
cleanup() {
  find "$tmp_dir" -type f -delete 2>/dev/null || true
  find "$tmp_dir" -depth -type d -empty -delete 2>/dev/null || true
}
trap cleanup EXIT

rule_count=0
while IFS=$'\t' read -r tag url; do
  curl --fail --location --retry 3 --silent --show-error \
    --output "$tmp_dir/$tag.srs" "$url"
  [[ -s "$tmp_dir/$tag.srs" ]] || {
    printf 'error: downloaded rule set is empty: %s\n' "$tag" >&2
    exit 1
  }
  rule_count=$((rule_count + 1))
done < <(jq -r '.route.rule_set[] | [.tag, .url] | @tsv' "$profile")

[[ $rule_count -eq 17 ]] || {
  printf 'error: expected 17 rule sets, downloaded %d\n' "$rule_count" >&2
  exit 1
}

local_profile="$tmp_dir/local-rule-sets.json"
jq --arg directory "$tmp_dir" '
  .route.rule_set |= map(
    .type = "local"
    | .path = ($directory + "/" + .tag + ".srs")
    | del(.url, .http_client, .download_detour)
  )
' "$profile" >"$local_profile"

(
  cd "$tmp_dir"
  "$sing_box" check -c "$local_profile"
)

printf 'Rule sets passed: %d downloads parsed by %s.\n' \
  "$rule_count" "$version_output"
