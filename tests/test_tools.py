"""Regression coverage for unified commands and migrated Shell checks."""
from contextlib import redirect_stdout, redirect_stderr
import io
import ipaddress
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import DEFAULT, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build import build
import check as command
from lib.common import CheckError, read_json
from lib.configs import outputs
from lib.core import checker, check_rule_sets, validate_profile
from lib.pages import check as check_pages
from lib.static import PUBLIC_DIRECTORIES, audit, check_links, public_files


class TemporaryRepoTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="sing-box-tools-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name) / "work space-配置"
        self.root.mkdir()
        self.quiet = io.StringIO()

    def build_sources(self):
        for name in ("modules", "web"):
            shutil.copytree(ROOT / name, self.root / name)


class BuildTest(TemporaryRepoTest):
    def test_build_and_read_only_check_cover_every_generated_artifact(self):
        self.build_sources()
        with redirect_stdout(self.quiet):
            build(self.root)
        files = {path: (path.read_bytes(), path.stat().st_mtime_ns) for path in self.root.rglob("*") if path.is_file()}
        self.assertEqual(len(list((self.root / "platforms").rglob("*.json"))), 51)
        for name in ("docs/index.html", "docs/en/index.html", "docs/assets/profiles.mjs", "docs/assets/presets.mjs"):
            self.assertTrue((self.root / name).is_file())
        with redirect_stdout(self.quiet):
            build(self.root, check=True)
        self.assertEqual(files, {path: (path.read_bytes(), path.stat().st_mtime_ns) for path in files})
        target = self.root / "docs/assets/profiles.mjs"
        target.write_text("stale", encoding="utf-8")
        with self.assertRaisesRegex(CheckError, "stale"):
            build(self.root, check=True)
        self.assertEqual(target.read_text(), "stale")
        with redirect_stdout(self.quiet):
            build(self.root)
            build(self.root, check=True)
        extra = self.root / "platforms/android/1.14/unlisted.json"
        extra.write_text("{}", encoding="utf-8")
        with self.assertRaisesRegex(CheckError, "Unexpected generated"):
            build(self.root)
        self.assertTrue(extra.exists())

    def test_cli_works_without_shell_tools_from_another_working_directory(self):
        self.build_sources()
        shutil.copytree(ROOT / "scripts", self.root / "scripts")
        for arguments in ([], ["--check"]):
            result = subprocess.run([sys.executable, str(self.root / "scripts/build.py"), *arguments],
                                    cwd=self.root.parent, env={**os.environ, "PATH": ""}, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(list(self.root.rglob("__pycache__")), [])
        (self.root / "docs/index.html").write_text("stale", encoding="utf-8")
        result = subprocess.run([sys.executable, str(self.root / "scripts/build.py"), "--check"], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("stale", result.stderr)


class PublicAuditTest(TemporaryRepoTest):
    def setUp(self):
        super().setUp()
        for name in PUBLIC_DIRECTORIES:
            (self.root / name).mkdir()
        self.fixture = self.root / "tests/fixtures/nodes.example.json"
        self.fixture.parent.mkdir()
        self.fixture.write_text("{}", encoding="utf-8")

    def test_only_the_exact_cgnat_network_is_allowed(self):
        network = ipaddress.ip_network("100.64.0.0/10")
        for value, allowed in ((str(network), True), (str(network.network_address + 1), False),
                               (str(network.network_address), False), (str(network) + "0", False), (str(network) + "invalid", False)):
            with self.subTest(value=value), redirect_stdout(self.quiet):
                self.fixture.write_text(json.dumps({"route_exclude_address": [value]}), encoding="utf-8")
                if allowed:
                    audit(self.root)
                else:
                    with self.assertRaises(CheckError):
                        audit(self.root)

    def test_audit_has_no_shell_dependencies_and_does_not_read_private_inputs(self):
        marker = str(ipaddress.ip_network("100.64.0.0/10").network_address + 1)
        private = self.root / "proxy-config-backup"
        private.mkdir()
        (private / "private.json").write_text(marker, encoding="utf-8")
        (self.root / "nodes.json").write_text(marker, encoding="utf-8")
        (self.root / "docs/private.local.json").write_text(marker, encoding="utf-8")
        with patch.dict(os.environ, {"PATH": ""}), redirect_stdout(self.quiet):
            audit(self.root)
        self.assertIn("Public audit passed", self.quiet.getvalue())

    def test_invalid_json_credentials_and_broken_scans_fail_closed(self):
        for text in ('{"invalid":NaN}', '{"password":"NOT-A-REAL-SECRET"}', '{"uuid":"placeholder"}', '{"broken":}'):
            self.fixture.write_text(text, encoding="utf-8")
            with self.subTest(text=text), self.assertRaises(CheckError):
                audit(self.root)
        self.fixture.write_text("{}", encoding="utf-8")
        (self.root / "docs/broken.md").write_bytes(b"\xff")
        with redirect_stdout(self.quiet), self.assertRaises(UnicodeError):
            audit(self.root)
        self.assertNotIn("audit passed", self.quiet.getvalue())
        (self.root / "docs/broken.md").unlink()
        (self.root / "platforms").rmdir()
        with self.assertRaisesRegex(CheckError, "Missing"):
            audit(self.root)


class LinksAndPagesTest(TemporaryRepoTest):
    def setUp(self):
        super().setUp()
        self.build_sources()
        with redirect_stdout(self.quiet):
            build(self.root)
        shutil.copyfile(ROOT / "SUBSCRIPTIONS.md", self.root / "SUBSCRIPTIONS.md")
        shutil.copytree(ROOT / "docs/assets", self.root / "docs/assets", dirs_exist_ok=True)
        for name in ("sitemap.xml", ".nojekyll"):
            shutil.copyfile(ROOT / "docs" / name, self.root / "docs" / name)
        shutil.copytree(ROOT / "scripts", self.root / "scripts")
        shutil.copyfile(ROOT / "LICENSE", self.root / "LICENSE")
        for name in PUBLIC_DIRECTORIES:
            (self.root / name).mkdir(exist_ok=True)
        for source in public_files(ROOT):
            if source.suffix == ".md":
                target = self.root / source.relative_to(ROOT)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)

    def test_links_match_the_catalog_and_reject_missing_or_duplicate_targets(self):
        with redirect_stdout(self.quiet):
            check_links(self.root)
        path = self.root / "SUBSCRIPTIONS.md"
        original = path.read_text(encoding="utf-8")
        for replacement in (original.replace("/android/1.14/fakeip.json", "/android/1.14/missing.json"),
                            original + "\n" + next(line for line in original.splitlines() if "sing-box://" in line)):
            path.write_text(replacement, encoding="utf-8")
            with self.assertRaises(CheckError):
                check_links(self.root)

    def test_pages_retain_security_metadata_versions_and_local_only_contracts(self):
        with redirect_stdout(self.quiet):
            check_pages(self.root)
        page = self.root / "docs/index.html"
        original = page.read_text(encoding="utf-8")
        for invalid in (original.replace("connect-src 'none'", "connect-src *"),
                        original.replace('value="1.15"', 'value="1.99"'),
                        original.replace("./assets/app.mjs", "https://example.com/app.mjs"),
                        original.replace('id="download-json"', 'id="missing"')):
            page.write_text(invalid, encoding="utf-8")
            with self.assertRaises(CheckError):
                check_pages(self.root)
        page.write_text(original, encoding="utf-8")
        app = self.root / "docs/assets/app.mjs"
        with app.open("a", encoding="utf-8") as output:
            output.write("\nfetch('https://example.com');\n")
        with self.assertRaises(CheckError):
            check_pages(self.root)

    def test_documentation_links_cover_local_targets_and_ignore_external_links_and_code(self):
        target = self.root / "docs/file with spaces.md"
        target.write_text("# Example\n", encoding="utf-8")
        document = self.root / "docs/link-check.md"
        document.write_text('[local](file%20with%20spaces.md#example)\n[external](https://example.com/missing)\n'
                            '[anchor](#example)\n```markdown\n[snippet](missing.md)\n```\n', encoding="utf-8")
        with redirect_stdout(self.quiet):
            check_links(self.root)
        for invalid in ('[broken](missing.md)', '[outside](../../outside.md)',
                        '[private](../proxy-config-backup/config.json)'):
            document.write_text(invalid, encoding="utf-8")
            with self.subTest(link=invalid), self.assertRaises(CheckError):
                check_links(self.root)


class CoreContractsTest(unittest.TestCase):
    def test_all_profiles_retain_the_old_platform_and_scenario_contracts(self):
        for name, content in outputs().items():
            if name.endswith(".json"):
                _, platform, line, scenario = name.removesuffix(".json").split("/")
                validate_profile(json.loads(content), platform, line, scenario)

    def test_contracts_reject_mutated_platform_version_and_scenario_fields(self):
        cases = [
            ("android/1.14/fakeip", lambda c: c["outbounds"].pop()),
            ("android/1.14/fakeip", lambda c: c["inbounds"][0].update(strict_route=False)),
            ("linux/1.14/tun", lambda c: c["inbounds"][0].update(auto_redirect=False)),
            ("windows/1.14/tun", lambda c: c["inbounds"][0].update(auto_redirect=True)),
            ("macos/1.14/fakeip", lambda c: c["route"].update(auto_detect_interface=False)),
            ("linux/1.14/mixed", lambda c: c["inbounds"][0].update(listen="0.0.0.0")),
            ("android/1.13/fakeip", lambda c: c.update({"$schema": "invalid"})),
            ("android/1.14/fakeip", lambda c: c.pop("http_clients")),
            ("android/1.15/fakeip", lambda c: c["inbounds"][0].update(stack="mixed")),
            ("android/1.14/dual-stack", lambda c: c["dns"].update(strategy="ipv4_only")),
            ("android/1.14/no-adblock", lambda c: c["route"]["rule_set"].append({"tag": "category-ads-all", "type": "local"})),
            ("android/1.14/battery-saver", lambda c: c["log"].update(level="debug")),
            ("android/1.14/udp-first", lambda c: next(o for o in c["outbounds"] if o["tag"] == "select").update(default="auto")),
            ("android/1.14/privacy-strict", lambda c: c["dns"].update(client_subnet="example")),
        ]
        for name, mutate in cases:
            with self.subTest(name=name):
                platform, line, scenario = name.split("/")
                config = read_json(ROOT / f"platforms/{name}.json")
                mutate(config)
                with self.assertRaises(CheckError):
                    validate_profile(config, platform, line, scenario)

    def test_checker_rejects_wrong_lines_and_unpinned_alphas(self):
        with patch("lib.core.executable", return_value="checker"), patch("lib.core.run") as run:
            run.return_value = SimpleNamespace(stdout="sing-box version 1.14.0\n")
            self.assertEqual(checker("checker")[1], "1.14")
            with self.assertRaises(CheckError):
                checker("checker", "1.13")
            run.return_value = SimpleNamespace(stdout="sing-box version 1.15.0-alpha.99\n")
            with self.assertRaises(CheckError):
                checker("checker")

    def test_rule_downloads_are_localized_checked_and_do_not_change_public_sources(self):
        original = (ROOT / "platforms/android/1.14/realip.json").read_bytes()
        downloads = []
        def download(url, destination):
            downloads.append(url)
            destination.write_bytes(b"synthetic-rule-set")
        def check_local(arguments, **kwargs):
            config = read_json(Path(arguments[-1]))
            for rule in config["route"]["rule_set"]:
                self.assertEqual(rule["type"], "local")
                self.assertEqual(Path(rule["path"]).read_bytes(), b"synthetic-rule-set")
                self.assertFalse({"url", "http_client", "download_detour"} & rule.keys())
        with patch("lib.core.run", side_effect=check_local), redirect_stdout(io.StringIO()):
            check_rule_sets("checker", "1.14", "test checker", downloader=download)
        self.assertEqual(len(downloads), 17)
        self.assertEqual((ROOT / "platforms/android/1.14/realip.json").read_bytes(), original)
        with self.assertRaises(CheckError):
            check_rule_sets("checker", "1.14", "test checker", downloader=lambda url, target: target.touch())


class CommandTest(unittest.TestCase):
    def test_static_has_no_implicit_core_browser_or_network_checks(self):
        with patch.object(sys, "argv", ["check.py", "static"]), redirect_stdout(io.StringIO()):
            with patch.multiple(command, build=DEFAULT, audit=DEFAULT, check_links=DEFAULT, check_pages=DEFAULT,
                                run=DEFAULT, executable=DEFAULT, checker=DEFAULT, check_rule_sets=DEFAULT) as mocks:
                self.assertEqual(command.main(), 0)
                mocks["checker"].assert_not_called()
                mocks["check_rule_sets"].assert_not_called()
                self.assertEqual(mocks["run"].call_count, 2)

    def test_default_command_runs_static_core_and_browser_but_not_network_downloads(self):
        with patch.object(sys, "argv", ["check.py"]), redirect_stdout(io.StringIO()):
            with patch.multiple(command, build=DEFAULT, audit=DEFAULT, check_links=DEFAULT, check_pages=DEFAULT,
                                run=DEFAULT, executable=DEFAULT, checker=DEFAULT, check_profiles=DEFAULT,
                                check_rule_sets=DEFAULT) as mocks:
                mocks["checker"].return_value = ("checker", "1.14", "test checker")
                self.assertEqual(command.main(), 0)
                mocks["check_profiles"].assert_called_once()
                mocks["check_rule_sets"].assert_not_called()
                calls = mocks["run"].call_args_list
                self.assertTrue(any("tests/core_render.py" in call.args[0] for call in calls))
                self.assertEqual(calls[-1].args[0][-1], "tests/browser.mjs")

    def test_missing_checker_and_invalid_tasks_fail_without_success(self):
        for arguments in (["core", "--sing-box", "sing-box-does-not-exist-fixture"], ["unknown"]):
            result = subprocess.run([sys.executable, "-B", str(ROOT / "scripts/check.py"), *arguments],
                                    cwd=tempfile.gettempdir(), capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn("Checks passed", result.stdout)

    def test_audit_read_errors_do_not_report_success(self):
        output = io.StringIO()
        with patch.object(sys, "argv", ["check.py", "static"]), patch.object(command, "build"), \
             patch.object(command, "audit", side_effect=OSError("synthetic read failure")), \
             redirect_stdout(output), redirect_stderr(io.StringIO()):
            self.assertEqual(command.main(), 1)
        self.assertNotIn("Checks passed", output.getvalue())


if __name__ == "__main__":
    unittest.main()
