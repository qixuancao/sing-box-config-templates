#!/usr/bin/env python3
"""Cross-platform LAN bypass regression checks; never starts TUN or changes system routes."""

import ipaddress
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from lib.lan_routes import route_exclusions

CATALOG = json.loads((ROOT / "modules/catalog.json").read_text(encoding="utf-8"))
LOCAL = [
    "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
    "172.16.0.0/12", "192.168.0.0/16", "224.0.0.0/4",
    "255.255.255.255/32", "::1/128", "fc00::/7", "fe80::/10", "ff00::/8",
]


def read_profile(platform, line, scenario):
    return json.loads((ROOT / f"platforms/{platform}/{line}/{scenario}.json").read_text())


def networks(values):
    return [ipaddress.ip_network(value) for value in values]


def includes(routes, address):
    target = ipaddress.ip_address(address)
    return any(target in route for route in routes)


class LanRoutesTest(unittest.TestCase):
    def test_each_generated_profile_has_the_correct_policy(self):
        for line in CATALOG["versions"]:
            for platform, settings in CATALOG["platforms"].items():
                for scenario in settings["scenarios"]:
                    with self.subTest(line=line, platform=platform, scenario=scenario):
                        profile = read_profile(platform, line, scenario)
                        inbound = profile["inbounds"][0]
                        entries = inbound.get("route_exclude_address", [])
                        expected = inbound["type"] == "tun"
                        self.assertEqual(bool(entries), expected)
                        if expected:
                            self.assertEqual(entries, route_exclusions(profile, platform))
                            self.assertEqual(len(entries), len(set(entries)))
                            self.assertEqual(entries, sorted(entries, key=lambda item: (
                                ipaddress.ip_network(item).version,
                                int(ipaddress.ip_network(item).network_address),
                                ipaddress.ip_network(item).prefixlen,
                            )))
                            self.assertLessEqual(len(entries), 64 if platform == "android" else 180)
                        if inbound["type"] == "mixed":
                            self.assertNotIn("route_exclude_address", inbound)

    def test_common_lan_traffic_bypasses_on_all_tun_platforms(self):
        for platform in CATALOG["platforms"]:
            scenario = "tun" if platform in ("linux", "windows") else "realip"
            routes = networks(read_profile(platform, "1.14", scenario)["inbounds"][0]["route_exclude_address"])
            with self.subTest(platform=platform):
                for address in [
                    "10.1.2.3", str(ipaddress.ip_network("100.64.0.0/10").network_address + 1), "169.254.1.1",
                    "172.16.0.1", "172.19.0.4", "192.168.1.1",
                    "224.0.0.251", "239.255.255.250", "255.255.255.255",
                    "fc00::1", "fe80::1", "ff02::fb",
                ]:
                    self.assertTrue(includes(routes, address), (platform, address))
                self.assertEqual(includes(routes, "127.0.0.1"), platform != "android")
                self.assertEqual(includes(routes, "::1"), platform != "android")

    def test_reserved_tun_dns_fakeip_and_public_addresses_never_bypass(self):
        for line in CATALOG["versions"]:
            for platform in CATALOG["platforms"]:
                scenario = "tun" if platform in ("linux", "windows") else "fakeip"
                with self.subTest(line=line, platform=platform):
                    profile = read_profile(platform, line, scenario)
                    routes = networks(profile["inbounds"][0]["route_exclude_address"])
                    for kept in networks(["172.19.0.0/30", "198.18.0.0/15", "8.8.8.8/32", "2000::/3"]):
                        for route in routes:
                            self.assertFalse(route.version == kept.version and route.overlaps(kept),
                                             (line, platform, route, kept))

    def test_ipv6_tun_android_keeps_ula_in_tun_to_limit_vpn_routes(self):
        for line in CATALOG["versions"]:
            profile = read_profile("android", line, "realip")
            profile["inbounds"][0]["address"].append("fdfe:dcba:9876::1/126")
            routes = networks(route_exclusions(profile, "android"))
            with self.subTest(line=line):
                self.assertFalse(includes(routes, "fdfe:dcba:9876::1"))
                self.assertFalse(includes(routes, "fdfe:dcba:9876::2"))
                self.assertFalse(includes(routes, "fdff::1"))
                self.assertTrue(includes(routes, "fe80::1"))
                self.assertLessEqual(len(routes), 64)
                self.assertIn({"ip_is_private": True, "action": "route", "outbound": "direct"},
                              profile["route"]["rules"])

    def test_custom_ipv4_ipv6_dns_and_fakeip_ranges_are_protected(self):
        profile = read_profile("android", "1.14", "fakeip")
        profile["inbounds"][0]["address"] = ["10.12.0.1/30", "fdfe:dcba:9876::1/126"]
        profile["inbounds"][0]["dns_address"] = ["192.168.3.53", "fd00::53"]
        fake = next(server for server in profile["dns"]["servers"] if server["type"] == "fakeip")
        fake.update(inet4_range="10.64.0.0/10", inet6_range="fc00::/18")
        for platform in CATALOG["platforms"]:
            with self.subTest(platform=platform):
                routes = networks(route_exclusions(profile, platform))
                for protected in networks([
                    "10.12.0.0/30", "fdfe:dcba:9876::/126", "192.168.3.53/32",
                    "fd00::53/128", "10.64.0.0/10", "fc00::/18",
                ]):
                    for route in routes:
                        self.assertFalse(route.version == protected.version and route.overlaps(protected))
                self.assertTrue(includes(routes, "192.168.3.52"))
                self.assertTrue(includes(routes, "10.200.0.1"))
                if platform != "android":
                    self.assertTrue(includes(routes, "fd00::54"))

    def test_default_dns_outside_host_prefix_is_protected(self):
        profile = read_profile("android", "1.14", "realip")
        profile["inbounds"][0]["address"] = ["10.0.0.1/32", "fd00::1/128"]
        for platform in CATALOG["platforms"]:
            routes = networks(route_exclusions(profile, platform))
            with self.subTest(platform=platform):
                for value in ("10.0.0.1", "10.0.0.2", "fd00::1", "fd00::2"):
                    self.assertFalse(includes(routes, value))
                self.assertTrue(includes(routes, "10.0.0.3"))
                if platform != "android":
                    self.assertTrue(includes(routes, "fd00::3"))

    def test_invalid_mode_or_platform_rejected(self):
        profile = read_profile("linux", "1.14", "mixed")
        for platform in CATALOG["platforms"]:
            with self.assertRaisesRegex(ValueError, "auto-routed TUN"):
                route_exclusions(profile, platform)
        with self.assertRaisesRegex(ValueError, "Unsupported"):
            route_exclusions(read_profile("ios", "1.14", "realip"), "unknown")


if __name__ == "__main__":
    unittest.main()
