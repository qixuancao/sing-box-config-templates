"""Tests for versioned TUN base and constrained platform overlays."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from lib.tun_profiles import apply_tun_overlays
from lib.configs import compose


def source(path):
    return json.loads((ROOT / path).read_text())


class TunProfilesTest(unittest.TestCase):
    def test_generated_tun_is_versioned_base_plus_only_expected_fields(self):
        catalog = source("modules/catalog.json")
        for version in catalog["versions"]:
            base = source(f"modules/inbounds/{version}/tun.json")["inbounds"][0]
            for platform in catalog["platforms"]:
                scenario = ("tun" if platform in ("linux", "windows") else "realip")
                with self.subTest(version=version, platform=platform):
                    expected = copy.deepcopy(base)
                    if platform in ("linux", "windows"):
                        expected["strict_route"] = True
                    if platform == "linux":
                        expected["auto_redirect"] = True
                    if platform in ("linux", "windows") and version != "1.13":
                        expected["dns_mode"] = "hijack"
                    actual = source(f"platforms/{platform}/{version}/{scenario}.json")["inbounds"][0]
                    for key in ("route_exclude_address",):
                        actual.pop(key, None)
                    self.assertEqual(actual, expected)

    def test_scenarios_do_not_change_the_source_base(self):
        catalog = source("modules/catalog.json")
        for version in catalog["versions"]:
            path = f"modules/inbounds/{version}/tun.json"
            before = source(path)
            for platform in catalog["platforms"]:
                for scenario in catalog["platforms"][platform]["scenarios"]:
                    result = compose(ROOT, catalog, version, scenario, platform)
                    self.assertEqual(result["inbounds"][0]["type"], "mixed" if scenario=="mixed" else "tun")
            self.assertEqual(source(path), before)

    def test_unexpected_and_conflicting_overrides_fail(self):
        profile = {"inbounds":[{"type":"tun","tag":"tun-in"}]}
        with self.assertRaisesRegex(ValueError, "Unsupported android"):
            apply_tun_overlays(copy.deepcopy(profile),"1.14","android",{"tun_options":{"auto_redirect":True}})
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            apply_tun_overlays(copy.deepcopy(profile),"1.14","linux",
                               {"tun_options":{"strict_route":True},
                                "tun_options_by_core":{"1.14":{"strict_route":False}}})
        with self.assertRaisesRegex(ValueError, "not supported"):
            apply_tun_overlays(copy.deepcopy(profile),"1.13","linux",
                               {"tun_options_by_core":{"1.13":{"dns_mode":"hijack"}}})
        with self.assertRaisesRegex(ValueError, "removed"):
            apply_tun_overlays({"inbounds":[{"type":"tun","stack":"system"}]},
                               "1.15","windows",{"tun_options":{"strict_route":True}})
        with self.assertRaisesRegex(ValueError, "exactly one TUN"):
            apply_tun_overlays({"inbounds":[{"type":"tun"}, {"type":"tun"}]},"1.14","windows",{"tun_options":{"strict_route":True}})

    def test_mixed_mode_ignores_tun_only_platform_options(self):
        profile={"inbounds":[{"type":"mixed","listen":"127.0.0.1","listen_port":2080}]}
        old=copy.deepcopy(profile)
        apply_tun_overlays(profile,"1.14","windows",
                           {"tun_options":{"strict_route":True},
                            "tun_options_by_core":{"1.14":{"dns_mode":"hijack"}}})
        self.assertEqual(profile,old)


if __name__ == "__main__":
    unittest.main()
