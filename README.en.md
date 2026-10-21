# sing-box configuration tools

[中文](README.md) · [Configuration selector](https://qixuancao.github.io/sing-box-config-templates/en/) · [Changelog](CHANGELOG.md)

Generate sing-box configurations for Android, iOS, macOS, Linux, and Windows, with domestic/international routing, service policy groups, FakeIP / RealIP DNS, TUN, and local HTTP/SOCKS proxy modes.

- Choose exits for streaming, AI, Telegram, Microsoft, Apple, Google, and GitHub.
- Select nodes manually or let URLTest choose by latency.
- Merge your nodes locally into an importable JSON configuration.
- Use versioned profiles for sing-box 1.13 and 1.14 on every platform.

## Quick start

Requires Bash, `jq`, and sing-box.

```bash
git clone https://github.com/qixuancao/sing-box-config-templates.git
cd sing-box-config-templates
cp examples/nodes.example.json nodes.json
```

Edit `nodes.json` with your sing-box outbounds, then generate a configuration:

```bash
./scripts/render.sh platforms/android/1.14/fakeip.json nodes.json generated/android.json
sing-box check -c generated/android.json
```

Import `generated/android.json` in your client. `nodes.json` and `generated/` are Git-ignored; generated files use mode `0600`. See the [node format](docs/nodes.md).

## Choose a platform

| Platform | Profiles | Guide |
| --- | --- | --- |
| Android / SFA | [FakeIP](platforms/android/1.14/fakeip.json) · [RealIP](platforms/android/1.14/realip.json) | [Scenarios and core versions](platforms/android/README.md) |
| iOS / SFI | [FakeIP](platforms/ios/1.14/fakeip.json) · [RealIP](platforms/ios/1.14/realip.json) | [Import and LAN access](platforms/ios/README.md) |
| macOS / SFM | [FakeIP](platforms/macos/1.14/fakeip.json) · [RealIP](platforms/macos/1.14/realip.json) · [mixed](platforms/macos/1.14/mixed.json) | [Guide](platforms/macos/README.md) |
| Linux | [TUN](platforms/linux/1.14/tun.json) · [mixed](platforms/linux/1.14/mixed.json) | [Guide](platforms/linux/README.md) |
| Windows | [TUN](platforms/windows/1.14/tun.json) · [mixed](platforms/windows/1.14/mixed.json) | [Guide](platforms/windows/README.md) |

Choose the core version on every platform: `platforms/<platform>/1.14/` or `platforms/<platform>/1.13/`. The table links to 1.14 profiles; use the same filename under `1.13/` when running a 1.13 core.

On desktop systems, start with `mixed.json` and set the application proxy to `127.0.0.1:2080`:

```bash
./scripts/render.sh platforms/linux/1.14/mixed.json nodes.json generated/linux.json
sing-box check -c generated/linux.json
sing-box run -c generated/linux.json
```

## Android scenarios

| Profile | Use case |
| --- | --- |
| `fakeip.json` | Everyday use; FakeIP for international domains |
| `realip.json` | Apps that do not work with FakeIP |
| `tcp-stable.json` | Unreliable UDP; blocks QUIC, DoT, and STUN, affecting some calls |
| `privacy-strict.json` | DNS through the proxy without ECS; also blocks QUIC, DoT, and STUN |
| `dual-stack.json` | IPv6 support on both the local network and nodes |
| `no-adblock.json` | Disable ad blocking to diagnose false positives |
| `battery-saver.json` | Less frequent probes and quieter logs |
| `udp-first.json` | Gaming and voice; prefer designated UDP nodes |

## Documentation

[Getting started](docs/getting-started.md) · [Policy groups](docs/policy-groups.md) · [Compatibility](docs/compatibility.md) · [Troubleshooting](docs/troubleshooting.md) · [Raw links](SUBSCRIPTIONS.md) · [Contributing](CONTRIBUTING.md)

Rule sets come from [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat); policy grouping takes inspiration from [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR). Code and configurations use the [MIT license](LICENSE). See [THIRD_PARTY.md](THIRD_PARTY.md) for rule-set licenses.
