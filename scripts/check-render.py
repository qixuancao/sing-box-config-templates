#!/usr/bin/env python3
"""Check node rendering and TCP-only routing with the selected sing-box core."""

import copy
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
SING_BOX = os.environ.get("SING_BOX", "sing-box")


class RenderTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        version = subprocess.run(
            [SING_BOX, "version"], check=True, capture_output=True, text=True
        ).stdout
        match = re.search(r"sing-box version (1\.(?:12|13|14))\.", version)
        if match is None:
            raise ValueError("Use a sing-box 1.12, 1.13, or 1.14 checker")
        cls.line = match[1]
        cls.example = json.loads((ROOT / "examples/nodes.example.json").read_text())
        cls.tcp_node = {
            "type": "http", "tag": "tcp-node", "server": "example.com", "server_port": 443,
        }

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.work = Path(self.directory.name)
        self.profile = ROOT / f"platforms/android/{self.line}/realip.json"

    def render(self, nodes, profile=None):
        source = self.work / "nodes.json"
        source.write_text(json.dumps(nodes))
        output = self.work / "rendered.json"
        result = subprocess.run(
            [str(ROOT / "scripts/render.sh"), str(profile or self.profile), str(source), str(output)],
            cwd=self.work, capture_output=True, text=True,
        )
        return result, output

    def assert_valid(self, output):
        self.assertEqual(output.stat().st_mode & 0o777, 0o600)
        result = subprocess.run(
            [SING_BOX, "check", "-c", str(output)],
            cwd=self.work, capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_tcp_only_profiles_keep_direct_routes_and_reject_proxy_udp(self):
        profiles = sorted((ROOT / f"platforms/android/{self.line}").glob("*.json"))
        if self.line == "1.14":
            profiles += sorted((ROOT / "templates").glob("*.json"))
            profiles += sorted((ROOT / "platforms").glob("*/*.json"))
        for profile in profiles:
            with self.subTest(profile=str(profile.relative_to(ROOT))):
                result, output = self.render(
                    {"outbounds": [self.tcp_node], "udp_outbounds": []}, profile
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                rendered = json.loads(output.read_text())
                self.assertNotIn("udp-auto", json.dumps(rendered))
                original = json.loads(profile.read_text())
                self.assertEqual(
                    [r for r in rendered["route"]["rules"] if r.get("outbound") == "direct"],
                    [r for r in original["route"]["rules"] if r.get("outbound") == "direct"],
                )
                rules = rendered["route"]["rules"]
                blocked = [r for r in rules if r.get("network") == "udp"
                           and r.get("action") == "reject" and "clash_mode" not in r]
                self.assertEqual(len(blocked), 1)
                self.assertTrue(blocked[0]["no_drop"])
                self.assertLess(
                    next(i for i, r in enumerate(rules) if r.get("rule_set") == "geosite-cn"),
                    rules.index(blocked[0]),
                )
                global_rules = [r for r in rules if r.get("clash_mode") == "Global"]
                self.assertEqual(global_rules[0], {
                    "clash_mode": "Global", "network": "udp", "action": "reject", "no_drop": True,
                })
                self.assertEqual(global_rules[1]["outbound"], "GLOBAL")
                self.assert_valid(output)

    def test_omitted_udp_list_keeps_existing_default(self):
        nodes = copy.deepcopy(self.example)
        del nodes["udp_outbounds"]
        result, output = self.render(nodes)
        self.assertEqual(result.returncode, 0, result.stderr)
        rendered = json.loads(output.read_text())
        udp = next(o for o in rendered["outbounds"] if o["tag"] == "udp-auto")
        self.assertEqual(udp["outbounds"], [o["tag"] for o in nodes["outbounds"]])
        self.assert_valid(output)

    def test_mixed_nodes_use_only_the_designated_udp_node(self):
        nodes = copy.deepcopy(self.example)
        nodes["outbounds"].append(self.tcp_node)
        result, output = self.render(nodes)
        self.assertEqual(result.returncode, 0, result.stderr)
        rendered = json.loads(output.read_text())
        udp = next(o for o in rendered["outbounds"] if o["tag"] == "udp-auto")
        self.assertEqual(udp["outbounds"], nodes["udp_outbounds"])
        auto = next(o for o in rendered["outbounds"] if o["tag"] == "auto")
        self.assertIn("tcp-node", auto["outbounds"])
        self.assert_valid(output)

    def test_invalid_nodes_preserve_the_existing_output(self):
        invalid = [
            {"outbounds": [], "udp_outbounds": []},
            {"outbounds": [self.tcp_node, self.tcp_node]},
            {"outbounds": [{**self.tcp_node, "tag": "select"}]},
            {"outbounds": [self.tcp_node], "udp_outbounds": ["missing-node"]},
            {"outbounds": [self.tcp_node], "udp_outbounds": "tcp-node"},
        ]
        for nodes in invalid:
            with self.subTest(nodes=nodes):
                output = self.work / "rendered.json"
                output.write_text("existing configuration")
                result, output = self.render(nodes)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(output.read_text(), "existing configuration")
                self.assertEqual(list(self.work.glob(".render.*")), [])

    def test_output_aliases_cannot_overwrite_either_input(self):
        template = self.work / "template.json"
        template.write_text(self.profile.read_text())
        nodes = self.work / "nodes.json"
        nodes.write_text(json.dumps(self.example))
        for source in (template, nodes):
            original = source.read_bytes()
            symlink = self.work / f"{source.stem}-symlink.json"
            symlink.symlink_to(source)
            hardlink = self.work / f"{source.stem}-hardlink.json"
            os.link(source, hardlink)
            for output in (f"./{source.name}", str(symlink), str(hardlink)):
                with self.subTest(source=source.name, output=output):
                    result = subprocess.run(
                        [str(ROOT / "scripts/render.sh"), "template.json", "nodes.json", output],
                        cwd=self.work, capture_output=True, text=True,
                    )
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("must not overwrite an input file", result.stderr)
                    self.assertEqual(source.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
