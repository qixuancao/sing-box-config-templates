#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s TEMPLATE NODES_JSON OUTPUT\n' "$0" >&2
  printf 'Example: %s templates/fakeip.json nodes.json generated/sing-box.json\n' "$0" >&2
}

if [[ $# -ne 3 ]]; then
  usage
  exit 2
fi

template=$1
nodes_file=$2
output=$3

command -v jq >/dev/null 2>&1 || {
  printf '%s\n' 'error: jq is required' >&2
  exit 1
}

[[ -f "$template" ]] || {
  printf 'error: template not found: %s\n' "$template" >&2
  exit 1
}
[[ -f "$nodes_file" ]] || {
  printf 'error: node file not found: %s\n' "$nodes_file" >&2
  exit 1
}
[[ "$output" != "$template" && "$output" != "$nodes_file" ]] || {
  printf '%s\n' 'error: output must not overwrite an input file' >&2
  exit 1
}

reserved='[
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

jq -e --argjson reserved "$reserved" '
  (.outbounds | type == "array" and length > 0)
  and (all(.outbounds[]; type == "object" and (.tag | type == "string" and length > 0)))
  and (([.outbounds[].tag] | length) == ([.outbounds[].tag] | unique | length))
  and ([.outbounds[].tag] as $tags | all($tags[]; . as $tag | ($reserved | index($tag) | not)))
  and ([.outbounds[].tag] as $tags
       | (.udp_outbounds // $tags) as $udp
       | ($udp | type == "array" and length > 0)
       and all($udp[]; . as $tag | ($tags | index($tag)) != null))
' "$nodes_file" >/dev/null || {
  printf '%s\n' 'error: invalid nodes file, duplicate/reserved tag, or invalid udp_outbounds' >&2
  exit 1
}

output_dir=$(dirname -- "$output")
mkdir -p -- "$output_dir"
tmp_file=$(mktemp "${output_dir}/.render.XXXXXX")
trap 'rm -f -- "$tmp_file"' EXIT

jq --slurpfile node_doc "$nodes_file" '
  ($node_doc[0]) as $nodes
  | ($nodes.outbounds | map(.tag)) as $all_tags
  | ($nodes.udp_outbounds // $all_tags) as $udp_tags
  | .outbounds = ($nodes.outbounds + [.outbounds[] | select(.tag != "proxy-example")])
  | (.outbounds[] | select(.tag == "select") | .outbounds) = (["auto", "udp-auto"] + $all_tags)
  | (.outbounds[] | select(.tag == "auto") | .outbounds) = $all_tags
  | (.outbounds[] | select(.tag == "udp-auto") | .outbounds) = $udp_tags
  | (.outbounds[] | select(.tag == "GLOBAL") | .outbounds) = (["select", "auto", "udp-auto"] + $all_tags + ["direct"])
' "$template" >"$tmp_file"

chmod 600 "$tmp_file"
mv -- "$tmp_file" "$output"
trap - EXIT
printf 'Rendered private configuration: %s (mode 600)\n' "$output"
