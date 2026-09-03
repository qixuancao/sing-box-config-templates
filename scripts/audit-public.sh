#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_dir"

command -v jq >/dev/null 2>&1 || {
  printf '%s\n' 'error: jq is required' >&2
  exit 1
}

for file in templates/*.json examples/nodes.example.json; do
  jq empty "$file"

  jq -e '
    [.. | objects | select(has("password")) | .password]
    | all(. == "CHANGE_ME")
  ' "$file" >/dev/null

  jq -e '
    [paths(objects) as $p | getpath($p) | keys[]]
    | all(. != "uuid" and . != "private_key" and . != "public_key" and . != "short_id")
  ' "$file" >/dev/null
done

if command -v rg >/dev/null 2>&1; then
  if rg -n --hidden --glob '!.git/**' \
    '(100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.[0-9]{1,3}\.[0-9]{1,3}|[a-z0-9-]+\.ts\.net|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY)' .; then
    printf '%s\n' 'error: a forbidden private marker was found' >&2
    exit 1
  fi
fi

printf '%s\n' 'Public-template audit passed.'
