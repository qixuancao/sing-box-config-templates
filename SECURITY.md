# Security policy

This repository contains public templates only. Never commit a real proxy
server address, port, password, UUID, Reality key, WireGuard key, subscription
token, private hostname, device-specific address, or a complete private
configuration.

Keep real node data in the ignored `nodes.json` file and render into the
ignored `generated/` directory. Before publishing a fork, inspect the entire
Git history—not only the current files. Rotating a credential is required if
it was ever committed, even if it was later deleted.

The automated audit detects common secret shapes and private-network markers,
but it cannot recognize every credential. A passing workflow is not permission
to publish an unreviewed generated file.

Please report a suspected credential leak via GitHub Private Vulnerability
Reporting ([report a vulnerability](https://github.com/qixuancao/sing-box-config-templates/security/advisories/new));
do not open a public issue containing the credential. For ordinary bugs, share
only the minimum redacted log described in `CONTRIBUTING.md`.
