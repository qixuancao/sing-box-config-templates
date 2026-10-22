#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_dir"

for command_name in jq rg; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'error: %s is required\n' "$command_name" >&2
    exit 1
  }
done

json_files=()
while IFS= read -r file; do
  json_files+=("$file")
done < <(
  find templates platforms experimental modules presets examples -type f -name '*.json' -print | LC_ALL=C sort
)

for file in "${json_files[@]}"; do
  jq empty "$file"

  jq -e '
    [.. | objects | select(has("password")) | .password]
    | all(. == "CHANGE_ME")
  ' "$file" >/dev/null

  jq -e '
    [paths(objects) as $p | getpath($p) | keys[]]
    | all(. != "uuid" and . != "private_key" and . != "public_key" and . != "short_id")
  ' "$file" >/dev/null

  jq -e '
    [.outbounds[]?
     | select(.type == "hysteria2")
     | (.server == "example.com" and .password == "CHANGE_ME")]
    | all
  ' "$file" >/dev/null
done

# Allow only the exact public CGNAT CIDR, not individual device addresses.
if rg -n --pcre2 --hidden --glob '!.git/**' \
  '(100\.(?!64\.0\.0/10(?![0-9A-Za-z_./]))(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.[0-9]{1,3}\.[0-9]{1,3}|[a-z0-9-]+\.ts\.net|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|eyJ[a-zA-Z0-9_-]{20,}\.)' .; then
  printf '%s\n' 'error: a forbidden private marker was found' >&2
  exit 1
else
  search_status=$?
  if [[ "$search_status" != 1 ]]; then
    printf '%s\n' 'error: public-marker scan failed' >&2
    exit "$search_status"
  fi
fi

printf '%s\n' 'Public-template audit passed.'
