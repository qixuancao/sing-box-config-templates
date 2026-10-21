#!/usr/bin/env python3
"""Regression checks for iOS LAN bypass; never starts a TUN or changes routes."""

import ipaddress
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from ios_route_excludes import route_exclusions


ROOT = Path(__file__).resolve().parent.parent
CGNAT = ipaddress.ip_network("100.64.0.0/10")


def read_profile(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def networks(values):
    return [ipaddress.ip_network(value) for value in values]


class IOSRoutesTest(unittest.TestCase):
    def ios_profiles(self):
        for line in ("1.14", "1.13"):
            for variant in ("fakeip", "realip"):
                profile = read_profile(f"platforms/ios/{line}/{variant}.json")
                yield f"{line}/{variant}", profile, networks(profile["inbounds"][0].get("route_exclude_address", []))

    def assert_kept(self, exclusions, reserved):
        for route in exclusions:
            for prefix in networks(reserved):
                self.assertFalse(route.version == prefix.version and route.overlaps(prefix),
                                 f"{route} excludes reserved {prefix}")

    def assert_bypassed(self, exclusions, addresses):
        for value in addresses:
            address = ipaddress.ip_address(value)
            self.assertTrue(any(address in route for route in exclusions),
                            f"{address} is not bypassed")

    def test_local_destinations_bypass_both_ios_profiles(self):
        for variant, _, exclusions in self.ios_profiles():
            with self.subTest(variant=variant):
                self.assert_bypassed(exclusions, [
                    "10.1.2.3", str(CGNAT.network_address + 1), "127.0.0.1",
                    "169.254.1.1", "172.16.0.1", "172.18.255.255", "172.19.0.4",
                    "172.19.255.255", "172.31.255.255", "192.168.1.1",
                    "224.0.0.251", "239.255.255.250", "255.255.255.255",
                    "::1", "fc00::1", "fdff::1", "fe80::1", "ff02::fb",
                ])

    def test_tun_dns_fakeip_and_public_traffic_stay_captured(self):
        for variant, profile, exclusions in self.ios_profiles():
            with self.subTest(variant=variant):
                self.assertTrue(exclusions)
                self.assert_kept(exclusions, [
                    "172.19.0.0/30", "198.18.0.0/15", "8.8.8.8/32", "2000::/3",
                ])
                # LAN IPv6 bypass does not enable public IPv6 or change DNS strategy.
                self.assertEqual(profile["dns"]["strategy"], "ipv4_only")
                self.assertIn({"ip_version": 6, "action": "reject"}, profile["route"]["rules"])
                self.assertTrue(any(rule.get("action") == "hijack-dns"
                                    for rule in profile["route"]["rules"]))

    def test_exact_coverage_with_only_the_tun_subnet_reserved(self):
        expected = networks([
            "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
            "172.16.0.0/12", "192.168.0.0/16", "224.0.0.0/4", "255.255.255.255/32",
            "::1/128", "fc00::/7", "fe80::/10", "ff00::/8",
        ])
        for variant, _, exclusions in self.ios_profiles():
            with self.subTest(variant=variant):
                actual = exclusions + networks(["172.19.0.0/30"])
                for version in (4, 6):
                    self.assertEqual(
                        list(ipaddress.collapse_addresses(n for n in actual if n.version == version)),
                        list(ipaddress.collapse_addresses(n for n in expected if n.version == version)),
                    )

    def test_generator_protects_changed_tun_explicit_dns_and_ipv6_fakeip(self):
        profile = read_profile("templates/fakeip.json")
        profile["inbounds"][0]["address"] = ["10.12.0.1/30", "fdfe:dcba:9876::1/126"]
        profile["inbounds"][0]["dns_address"] = ["192.168.3.53", "fd00::53"]
        fakeip = next(server for server in profile["dns"]["servers"] if server["type"] == "fakeip")
        fakeip.update(inet4_range="10.64.0.0/10", inet6_range="fc00::/18")
        exclusions = networks(route_exclusions(profile))
        self.assert_kept(exclusions, [
            "10.12.0.0/30", "fdfe:dcba:9876::/126", "192.168.3.53/32",
            "fd00::53/128", "10.64.0.0/10", "fc00::/18",
        ])
        self.assert_bypassed(exclusions, [
            "10.12.0.4", "10.200.0.1", "192.168.3.52", "192.168.3.54",
            "fd00::52", "fd00::54", "fc80::1", "fdfe:dcba:9876::4",
        ])

    def test_default_dns_is_protected_even_outside_a_host_prefix(self):
        profile = read_profile("templates/realip.json")
        profile["inbounds"][0]["address"] = ["10.0.0.1/32", "fd00::1/128"]
        exclusions = networks(route_exclusions(profile))
        self.assert_kept(exclusions, ["10.0.0.1/32", "10.0.0.2/32", "fd00::1/128", "fd00::2/128"])
        self.assert_bypassed(exclusions, ["10.0.0.3", "fd00::3"])

    def test_other_platforms_and_privacy_profiles_do_not_gain_bypass(self):
        for directory in ("templates", "platforms/android", "platforms/macos",
                          "platforms/linux", "platforms/windows"):
            for path in (ROOT / directory).rglob("*.json"):
                with self.subTest(path=path.relative_to(ROOT)):
                    for inbound in json.loads(path.read_text(encoding="utf-8"))["inbounds"]:
                        self.assertNotIn("route_exclude_address", inbound)

    def test_public_audit_allows_only_the_exact_cgnat_network(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ("scripts", "templates", "platforms", "examples"):
                (root / name).mkdir()
            audit = root / "scripts/audit-public.sh"
            shutil.copyfile(ROOT / "scripts/audit-public.sh", audit)
            fixture = root / "templates/example.json"
            # Build synthetic device addresses without storing private host literals.
            for value, allowed in [
                (str(CGNAT), True),
                (str(CGNAT.network_address + 1), False),
                (str(CGNAT.network_address), False),
                (str(CGNAT) + "0", False),
                (str(CGNAT) + "invalid", False),
            ]:
                with self.subTest(value=value):
                    fixture.write_text(json.dumps({"route_exclude_address": [value]}), encoding="utf-8")
                    result = subprocess.run(["bash", str(audit)], capture_output=True, text=True)
                    self.assertEqual(result.returncode, 0 if allowed else 1,
                                     result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
