"""Generate platform-aware TUN LAN bypasses without excluding TUN, virtual DNS or FakeIP."""
import ipaddress

LOCAL_NETWORKS = (
    "10.0.0.0/8",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "224.0.0.0/4",
    "255.255.255.255/32",
    "::1/128",
    "fc00::/7",
    "fe80::/10",
    "ff00::/8",
)
ANDROID_LOOPBACK = (
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
)
# Avoid generating excessive Android exclusion routes: splitting ULA around
# a tiny IPv6 TUN subnet can create 100+ prefixes. The threshold below is
# a conservative project guardrail, not a documented OS limit.
ANDROID_MAX_SPLITS_PER_NETWORK = 32


def as_list(value):
    if value is None:
        return []
    return [value] if isinstance(value, str) else value


def route_exclusions(profile, platform):
    if platform not in {"android", "ios", "macos", "linux", "windows"}:
        raise ValueError(f"Unsupported LAN bypass platform: {platform}")
    tun = next((item for item in profile["inbounds"] if item["type"] == "tun"), None)
    if not tun or not tun.get("auto_route"):
        raise ValueError("LAN bypass requires an auto-routed TUN inbound")

    addresses = [ipaddress.ip_interface(value) for value in as_list(tun["address"])]
    protected = [address.network for address in addresses]
    dns_addresses = as_list(tun.get("dns_address"))
    if not dns_addresses:
        # Core 1.14+ defaults to the next address after the first per family.
        # Keep the inferred addresses reserved on older core profiles too.
        for version in (4, 6):
            first = next((address for address in addresses if address.version == version), None)
            if first is not None:
                dns_addresses.append(str(first.ip + 1))
    protected.extend(ipaddress.ip_network(value, strict=False) for value in dns_addresses)

    for server in profile["dns"]["servers"]:
        if server["type"] == "fakeip":
            for field in ("inet4_range", "inet6_range"):
                if server.get(field):
                    protected.append(ipaddress.ip_network(server[field]))

    excluded = []
    for candidate in map(ipaddress.ip_network, LOCAL_NETWORKS):
        if platform == "android" and candidate in ANDROID_LOOPBACK:
            # Android VpnService may reject loopback exclusions with Bad address.
            continue
        segments = [candidate]
        for reserved in protected:
            next_segments = []
            for segment in segments:
                if segment.version != reserved.version or not segment.overlaps(reserved):
                    next_segments.append(segment)
                elif reserved.subnet_of(segment):
                    next_segments.extend(segment.address_exclude(reserved))
                # Otherwise the protected net contains the entire segment.
            segments = next_segments
        if platform == "android" and len(segments) > ANDROID_MAX_SPLITS_PER_NETWORK:
            # Never produce hundreds of Android VpnService routes; leave this
            # LAN block inside TUN to be handled by existing direct rules.
            continue
        excluded.extend(segments)
    return [str(route) for route in sorted(
        excluded, key=lambda route: (route.version, int(route.network_address), route.prefixlen)
    )]
