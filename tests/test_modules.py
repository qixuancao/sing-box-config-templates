#!/usr/bin/env python3
"""Verify module substitution, isolation, merge ownership and version boundaries."""
import copy
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from lib.configs import KINDS, compose, merge, outputs
catalog = json.loads((ROOT / "modules/catalog.json").read_text())


class ModuleTests(unittest.TestCase):
    def test_outputs_contain_only_declared_platform_profiles_and_browser_catalog(self):
        expected = {"docs/assets/presets.mjs", "docs/assets/profiles.mjs"}
        for version in catalog["versions"]:
            for platform, settings in catalog["platforms"].items():
                for scenario in settings["scenarios"]:
                    path = f"platforms/{platform}/{version}/{scenario}.json"
                    expected.add(path)
        self.assertEqual(set(outputs()), expected)

    def test_dns_edit_updates_matching_profiles_and_keeps_versions_isolated(self):
        baseline = outputs()
        with tempfile.TemporaryDirectory(prefix="sing-box-module-") as temporary:
            root = Path(temporary)
            shutil.copytree(ROOT / "modules", root / "modules")
            path = root / "modules/dns/1.14/fakeip.json"
            fragment = json.loads(path.read_text())
            fragment["dns"]["cache_capacity"] = 7331
            path.write_text(json.dumps(fragment))
            changed = outputs(root)
            affected = {path for path in baseline if baseline[path] != changed[path]}
            self.assertEqual(affected, {
                "platforms/android/1.14/fakeip.json",
                "platforms/ios/1.14/fakeip.json", "platforms/macos/1.14/fakeip.json",
                "docs/assets/profiles.mjs",
            })
            for name in affected:
                if name.endswith(".json"):
                    self.assertEqual(json.loads(changed[name])["dns"]["cache_capacity"], 7331)
            self.assertIn('"cache_capacity":7331', changed["docs/assets/profiles.mjs"])

    def test_merge_preserves_rule_order_and_refuses_implicit_overrides(self):
        rules = [{"ip_is_private": True, "outbound": "direct"}, {"network": "udp", "action": "reject"}]
        fragment = {"route": {"rules": rules}}
        target = {"route": {"rule_set": []}}
        merge(target, fragment)
        self.assertEqual(target["route"]["rules"], rules)
        target["route"]["rules"].append({"action": "reject"})
        self.assertEqual(fragment["route"]["rules"], rules)
        with self.assertRaisesRegex(ValueError, "Conflicting module ownership"):
            merge(target, fragment)

    def test_dns_module_cannot_replace_outbounds(self):
        with tempfile.TemporaryDirectory(prefix="sing-box-module-") as temporary:
            root = Path(temporary)
            shutil.copytree(ROOT / "modules", root / "modules")
            path = root / "modules/dns/1.14/realip.json"
            value = json.loads(path.read_text())
            value["outbounds"] = []
            path.write_text(json.dumps(value))
            with self.assertRaisesRegex(ValueError, "Unexpected fields"):
                compose(root, catalog, "1.14", "realip", "android")

    def test_catalog_owns_all_declared_scenario_recipes_without_a_presets_directory(self):
        declared = {scenario for settings in catalog["platforms"].values() for scenario in settings["scenarios"]}
        self.assertEqual(set(catalog["scenarios"]), declared)
        for recipe in catalog["scenarios"].values():
            self.assertEqual(set(recipe["modules"]), set(KINDS) - {"base"})
        self.assertFalse((ROOT / "presets").exists())

    def test_catalog_recipe_changes_update_only_the_selected_scenario(self):
        baseline = outputs()
        with tempfile.TemporaryDirectory(prefix="sing-box-catalog-") as temporary:
            root = Path(temporary)
            shutil.copytree(ROOT / "modules", root / "modules")
            path = root / "modules/catalog.json"
            changed_catalog = json.loads(path.read_text())
            changed_catalog["scenarios"]["tcp-stable"]["modules"]["rules"] = "standard"
            path.write_text(json.dumps(changed_catalog))
            changed = outputs(root)
            self.assertEqual({name for name in baseline if baseline[name] != changed[name]}, {
                "platforms/android/1.13/tcp-stable.json", "platforms/android/1.14/tcp-stable.json",
                "platforms/android/1.15/tcp-stable.json", "docs/assets/profiles.mjs",
            })

    def test_composition_does_not_mutate_shared_catalog_recipes(self):
        before = copy.deepcopy(catalog)
        for platform, scenario in (("linux", "tun"), ("windows", "tun"), ("android", "fakeip")):
            compose(ROOT, catalog, "1.14", scenario, platform)
        self.assertEqual(catalog, before)
        for scenario in ("../fakeip", "unknown"):
            with self.assertRaisesRegex(ValueError, "Invalid scenario"):
                compose(ROOT, catalog, "1.14", scenario, "android")
        invalid = copy.deepcopy(catalog)
        invalid["scenarios"]["fakeip"]["modules"].pop("dns")
        with self.assertRaisesRegex(ValueError, "Incomplete recipe"):
            compose(ROOT, invalid, "1.14", "fakeip", "android")

    def test_versions_share_platform_layout_and_keep_experimental_boundaries(self):
        generated = outputs()
        for version in catalog["versions"]:
            paths = [name for name in generated if name.startswith("platforms/") and f"/{version}/" in name]
            self.assertEqual(len(paths), 17)
            for name in paths:
                config = json.loads(generated[name])
                for inbound in config["inbounds"]:
                    if inbound["type"] == "tun":
                        self.assertEqual("stack" in inbound, version != "1.15")
        self.assertEqual(catalog["default_core"], "1.14")
        self.assertEqual(catalog["versions"]["1.15"]["channel"], "experimental")
        self.assertFalse((ROOT / "experimental").exists())
        for platform in catalog["platforms"]:
            readme = (ROOT / f"platforms/{platform}/1.15/README.md").read_text()
            self.assertIn("实验版", readme)
            self.assertIn(catalog["versions"]["1.15"]["checker"], readme)


if __name__ == "__main__":
    unittest.main()
