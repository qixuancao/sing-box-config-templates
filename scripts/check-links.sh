#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
subscriptions="$repo_dir/SUBSCRIPTIONS.md"
raw_prefix='https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/'

command -v rg >/dev/null 2>&1 || {
  printf '%s\n' 'error: ripgrep is required' >&2
  exit 1
}

raw_urls=()
while IFS= read -r url; do
  raw_urls+=("$url")
done < <(
  rg --only-matching --no-filename \
    'https://raw\.githubusercontent\.com/qixuancao/sing-box-config-templates/main/[A-Za-z0-9._!/-]+\.json' \
    "$subscriptions" | LC_ALL=C sort -u
)

[[ ${#raw_urls[@]} -gt 0 ]] || {
  printf '%s\n' 'error: no Raw profile URLs found' >&2
  exit 1
}

for url in "${raw_urls[@]}"; do
  relative=${url#"$raw_prefix"}
  [[ "$relative" != "$url" && -f "$repo_dir/$relative" ]] || {
    printf 'error: Raw URL has no matching public file: %s\n' "$url" >&2
    exit 1
  }
done

import_uris=()
while IFS= read -r uri; do
  import_uris+=("$uri")
done < <(
  rg --only-matching --no-filename \
    'sing-box://import-remote-profile\?url=[^># ]+#[^> ]+' \
    "$subscriptions"
)

[[ ${#import_uris[@]} -eq 24 ]] || {
  printf 'error: expected 24 import URIs, found %d\n' "${#import_uris[@]}" >&2
  exit 1
}

for uri in "${import_uris[@]}"; do
  encoded=${uri#*'?url='}
  encoded=${encoded%%'#'*}
  decoded=${encoded//%3A/:}
  decoded=${decoded//%2F//}
  relative=${decoded#"$raw_prefix"}
  [[ "$relative" != "$decoded" && -f "$repo_dir/$relative" ]] || {
    printf 'error: import URI has no matching public file: %s\n' "$uri" >&2
    exit 1
  }
done

# Every stable platform profile must have an explicit versioned Raw URL.
for profile in "$repo_dir"/platforms/*/1.{13,14}/*.json; do
  expected="${raw_prefix}${profile#"$repo_dir/"}"
  rg --fixed-strings --quiet "$expected" "$subscriptions" || {
    printf 'error: missing versioned subscription URL: %s\n' "$expected" >&2
    exit 1
  }
done

[[ ${#raw_urls[@]} -eq 34 ]] || {
  printf 'error: expected 34 versioned Raw URLs, found %d\n' "${#raw_urls[@]}" >&2
  exit 1
}

printf 'Subscription links passed: %d Raw URLs, %d import URIs.\n' \
  "${#raw_urls[@]}" "${#import_uris[@]}"
