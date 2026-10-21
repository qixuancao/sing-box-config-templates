#!/usr/bin/env python3
"""Verify module substitution, isolation, merge ownership and version boundaries."""
import json
import runpy
import shutil
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
builder = runpy.run_path(str(ROOT / "scripts/build-configs.py"))
compose, merge, outputs = (builder[name] for name in ("compose", "merge", "outputs"))
catalog = json.loads((ROOT / "presets/catalog.json").read_text())


class ModuleTests(unittest.TestCase):
    def test_dns_edit_updates_matching_profiles_and_keeps_versions_isolated(self):
        baseline = outputs()
        with tempfile.TemporaryDirectory(prefix="sing-box-module-") as temporary:
            root = Path(temporary)
            for directory in ("modules", "presets"):
                shutil.copytree(ROOT / directory, root / directory)
            path = root / "modules/dns/1.14/fakeip.json"
            fragment = json.loads(path.read_text())
            fragment["dns"]["cache_capacity"] = 7331
            path.write_text(json.dumps(fragment))
            changed = outputs(root)
            affected = {path for path in baseline if baseline[path] != changed[path]}
            self.assertEqual(affected, {
                "templates/fakeip.json", "platforms/android/1.14/fakeip.json",
                "platforms/ios/1.14/fakeip.json", "platforms/macos/1.14/fakeip.json",
            })
            for name in affected:
                self.assertEqual(json.loads(changed[name])["dns"]["cache_capacity"], 7331)

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
            for directory in ("modules", "presets"):
                shutil.copytree(ROOT / directory, root / directory)
            path = root / "modules/dns/1.14/realip.json"
            value = json.loads(path.read_text())
            value["outbounds"] = []
            path.write_text(json.dumps(value))
            with self.assertRaisesRegex(ValueError, "Unexpected fields"):
                compose(root, catalog, "1.14", "realip", "android")

    def test_experimental_profiles_are_separate_and_use_new_tun_stack(self):
        generated = outputs()
        for version, metadata in catalog["versions"].items():
            prefix = f"experimental/{version}/platforms/" if metadata["channel"] == "experimental" else "platforms/"
            paths = [name for name in generated if name.startswith(prefix) and (prefix != "platforms/" or f"/{version}/" in name)]
            self.assertEqual(len(paths), 17)
            for name in paths:
                config = json.loads(generated[name])
                for inbound in config["inbounds"]:
                    if inbound["type"] == "tun":
                        self.assertEqual("stack" in inbound, version != "1.15")
        self.assertEqual(catalog["default_core"], "1.14")
        self.assertEqual(catalog["versions"]["1.15"]["channel"], "experimental")


if __name__ == "__main__":
    unittest.main()
