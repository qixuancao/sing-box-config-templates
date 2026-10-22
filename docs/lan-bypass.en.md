# LAN, link-local and multicast bypass for TUN profiles

All platforms' **TUN** profiles use `inbounds[].route_exclude_address`
for common RFC 1918 addresses, CGNAT, link-local, multicast and IPv4
limited broadcast. This routes local traffic outside the sing-box userspace
TUN path when supported by the OS. **Mixed HTTP/SOCKS** profiles do not
set this field. Disable LAN bypass in the generator or use CLI `--no-lan-bypass` to remove the exclusions.

| Platform | LAN bypass policy |
| --- | --- |
| Android / SFA | Excludes common LAN ranges, but **not** `127.0.0.0/8` or `::1/128`, which may cause VpnService `Bad address` errors |
| iOS / SFI | Also bypasses loopback, link-local and multicast |
| macOS / SFM | Bypasses local ranges on TUN profiles; `mixed` is unaffected |
| Linux | TUN-only exclusions; verify interplay with `auto_redirect` |
| Windows | TUN-only exclusions; `mixed` is unaffected |

The generator removes **protected networks** from exclusions: the TUN
subnet (`172.19.0.0/30` by default), the explicit or inferred virtual
DNS address (`172.19.0.2`), and any IPv4/IPv6 FakeIP ranges. A wider
RFC 1918 exclusion may therefore be split into smaller CIDR prefixes.

**IPv6 option:** On all platforms, enabling IPv6 keeps ULA inside TUN and
uses private-IP direct rules. This protects virtual DNS, TUN and FakeIP ranges
without excessive route splitting. Link-local and multicast bypass remains.
For custom Android source addresses, the builder also caps splitting at 32
prefixes per network; this is a project guardrail, not an OS limit.

**Trade-offs and limitations:** Bypassed traffic cannot be subjected to
sing-box DNS hijacking or Global-mode proxy rules. Private
addresses may belong to enterprise, overlay, or other VPN networks; disable
bypass and place explicit proxy rules before private-IP direct rules when needed. Local bypass
does not guarantee LAN hostname/mDNS resolution. Apple Include All Networks
may affect route behavior. A valid JSON configuration and passing core
checks do **not** prove actual VPN startup or LAN reachability on the device.

Implementation: `scripts/lib/lan_routes.py`; configuration:
`modules/catalog.json` (`lan_bypass`); tests:
`tests/test_lan_routes.py`. To edit the default policy, modify source
modules and run the generator rather than editing generated JSON files.

Reference: [sing-box TUN route_exclude_address](https://sing-box.sagernet.org/configuration/inbound/tun/#route_exclude_address).
