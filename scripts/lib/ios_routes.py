"""Build iOS LAN bypass routes without excluding TUN, DNS or FakeIP addresses."""

import ipaddress


# Policy for iOS only. In particular, do not apply this to privacy-strict.
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


def as_list(value):
    return [value] if isinstance(value, str) else value


def route_exclusions(profile):
    tun = profile["inbounds"][0]
    if tun["type"] != "tun" or not tun.get("auto_route"):
        raise ValueError("iOS LAN bypass requires a TUN inbound with auto_route")

    addresses = [ipaddress.ip_interface(value) for value in as_list(tun["address"])]
    protected = [address.network for address in addresses]
    dns_addresses = list(as_list(tun.get("dns_address", [])))
    if not dns_addresses:
        # sing-box 1.14 defaults to the next IP after the first address per family.
        for version in (4, 6):
            first = next((a for a in addresses if a.version == version), None)
            if first is not None:
                dns_addresses.append(str(first.ip + 1))
    protected.extend(ipaddress.ip_network(value) for value in dns_addresses)

    for server in profile["dns"]["servers"]:
        if server["type"] == "fakeip":
            for field in ("inet4_range", "inet6_range"):
                if server.get(field):
                    protected.append(ipaddress.ip_network(server[field]))

    routes = [ipaddress.ip_network(value) for value in LOCAL_NETWORKS]
    for reserved in protected:
        remaining = []
        for route in routes:
            if route.version != reserved.version or not route.overlaps(reserved):
                remaining.append(route)
            elif reserved.subnet_of(route):
                remaining.extend(route.address_exclude(reserved))
            # Otherwise the reserved range covers this whole exclusion.
        routes = remaining
    return [str(route) for route in sorted(
        routes, key=lambda route: (route.version, int(route.network_address), route.prefixlen)
    )]
