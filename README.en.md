# sing-box multi-platform configuration templates

[中文](README.md) · [English](README.en.md)

Auditable, reproducible sing-box configuration templates for Android, iOS,
macOS, Linux, and Windows. Desktop and Apple profiles target 1.14.x; Android
also has separate 1.14, 1.13, and 1.12 compatibility lines. The repository
borrows the task-oriented policy-group experience popularized by ACL4SSR,
while keeping the actual configuration native to sing-box and using remote
binary rule sets.

> [!IMPORTANT]
> This repository is not a proxy provider. Every public profile deliberately
> contains `example.com` and `CHANGE_ME`; it validates, but it cannot connect.

## Choose a profile

| Platform | Recommended profile | Mode |
| --- | --- | --- |
| Android | [`platforms/android/fakeip.json`](platforms/android/fakeip.json) | SFA TUN |
| iOS / iPadOS | [`platforms/ios/fakeip.json`](platforms/ios/fakeip.json) | SFI TUN |
| macOS | [`platforms/macos/fakeip.json`](platforms/macos/fakeip.json) | SFM TUN |
| macOS | [`platforms/macos/mixed.json`](platforms/macos/mixed.json) | Local HTTP/SOCKS |
| Linux | [`platforms/linux/tun.json`](platforms/linux/tun.json) | TUN + nftables |
| Linux | [`platforms/linux/mixed.json`](platforms/linux/mixed.json) | Local HTTP/SOCKS |
| Windows | [`platforms/windows/tun.json`](platforms/windows/tun.json) | TUN |
| Windows | [`platforms/windows/mixed.json`](platforms/windows/mixed.json) | Local HTTP/SOCKS |

See [`platforms/`](platforms/) for platform instructions and
[`SUBSCRIPTIONS.md`](SUBSCRIPTIONS.md) for Raw URLs and import links.

## Android matrix

Eight behavior profiles are available: `fakeip`, `realip`, `tcp-stable`,
`privacy-strict`, `dual-stack`, `no-adblock`, `battery-saver`, and `udp-first`.
Choose the behavior after choosing the core line:

| Core line | Directory | Pinned CI checker |
| --- | --- | --- |
| 1.14.x | [`platforms/android/1.14/`](platforms/android/1.14/) | 1.14.0 |
| 1.13.x | [`platforms/android/1.13/`](platforms/android/1.13/) | 1.13.21 |
| 1.12.x | [`platforms/android/1.12/`](platforms/android/1.12/) | 1.12.25 |

The top-level Android files are stable current aliases. The 1.14 profiles use
the new shared HTTP-client schema; the 1.12/1.13 profiles use the legacy
rule-set download field and a compatible FakeIP DNS flow. They are generated
and validated separately, not merely renamed copies.

## Render a private profile

```bash
cp examples/nodes.example.json nodes.json
# Replace the placeholder outbound in nodes.json.
./scripts/render.sh platforms/android/fakeip.json nodes.json generated/android.json
sing-box check -c generated/android.json
```

`nodes.json` and `generated/` are ignored by Git, and rendered files use mode
`0600`. Read [`docs/getting-started.md`](docs/getting-started.md),
[`docs/nodes.md`](docs/nodes.md), and
[`docs/compatibility.md`](docs/compatibility.md) before use.

CI validates every public and rendered current profile with the pinned
official sing-box 1.14.0 binary, and validates the legacy Android directories
with 1.13.21 and 1.12.25 respectively. This is schema validation, not a claim
that every device, network, and server combination has been tested.

A weekly job also downloads all 17 remote rule sets and makes each pinned core
parse the `.srs` files, catching upstream link or binary-compatibility drift.

The repository is unofficial and is licensed under [MIT](LICENSE). Remote
third-party rule sets retain their upstream licenses; see
[`THIRD_PARTY.md`](THIRD_PARTY.md).
