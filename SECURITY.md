# Security policy

This repository contains public templates only. Never commit a real proxy
server address, port, password, UUID, Reality key, WireGuard key, subscription
token, private hostname, or device-specific address.

Keep real node data in the ignored `nodes.json` file and render into the
ignored `generated/` directory. Before publishing a fork, inspect the entire
Git history—not only the current files. Rotating a credential is required if
it was ever committed, even if it was later deleted.

Please report a suspected credential leak privately to the repository owner;
do not open a public issue containing the credential.
