"""Static profile contracts and real sing-box checks; never starts a proxy."""
import json
import os
from pathlib import Path
import re
import stat
import tempfile
import time
from urllib.error import URLError
from urllib.request import urlopen

from .common import ROOT, CheckError, executable, read_json, require, run

GROUPS = {"select", "auto", "udp-auto", "streaming", "ai", "telegram", "microsoft", "apple", "google", "github", "direct", "GLOBAL"}


def checker(command, line=None, root=ROOT):
    binary = executable(command)
    lines = run([binary, "version"], capture=True).stdout.splitlines()
    require(lines, "Checker returned no version information")
    version = lines[0]
    match = re.search(r"sing-box version (1\.\d+)\.([^\s]+)", version)
    catalog = read_json(root / "presets/catalog.json")
    require(match and match[1] in catalog["versions"], "Checker must use a maintained sing-box core")
    actual = match[1]
    require(line is None or line == actual, f"Checker does not match requested core {line}")
    metadata = catalog["versions"][actual]
    if metadata["channel"] == "experimental":
        require(match[0] == "sing-box version " + metadata["checker"], f"Experimental checker must be {metadata['checker']}")
    return binary, actual, version


def validate_profile(config, platform, line, scenario):
    tags = {outbound["tag"] for outbound in config["outbounds"]}
    require(GROUPS <= tags, "Missing policy groups")
    inbound = config["inbounds"][0]
    route = config["route"]
    if platform in ("android", "ios"):
        require(inbound["type"] == "tun" and "strict_route" not in inbound and "auto_redirect" not in inbound
                and "auto_detect_interface" not in route, "Incorrect mobile TUN fields")
    elif platform == "linux" and scenario == "tun":
        require(inbound["type"] == "tun" and inbound.get("strict_route") is True and inbound.get("auto_redirect") is True
                and route.get("auto_detect_interface") is True, "Incorrect Linux TUN fields")
    elif platform == "windows" and scenario == "tun":
        require(inbound["type"] == "tun" and inbound.get("strict_route") is True and "auto_redirect" not in inbound
                and route.get("auto_detect_interface") is True, "Incorrect Windows TUN fields")
    elif platform == "macos":
        require("strict_route" not in inbound and "auto_redirect" not in inbound and route.get("auto_detect_interface") is True,
                "Incorrect macOS fields")
    if scenario == "mixed":
        require(inbound["type"] == "mixed" and inbound.get("listen") == "127.0.0.1"
                and all(rule.get("action") != "hijack-dns" for rule in route["rules"]), "Incorrect mixed proxy fields")
    if line == "1.13":
        require("$schema" not in config and "http_clients" not in config and "default_http_client" not in route, "New HTTP fields in 1.13")
        require(all(rule.get("download_detour") == "direct" and "http_client" not in rule
                    for rule in route["rule_set"] if rule["type"] == "remote"), "Incorrect 1.13 rule-set download fields")
        require(all("dns_mode" not in item and "dns_address" not in item for item in config["inbounds"]), "New DNS inbound fields in 1.13")
        require(all(rule.get("action") != "evaluate" and "match_response" not in rule for rule in config["dns"]["rules"]), "New DNS actions in 1.13")
    else:
        require(config.get("$schema") == "https://sing-box.sagernet.org/schema.json" and isinstance(config.get("http_clients"), list)
                and config["http_clients"] and route.get("default_http_client") == "rule-set-direct", "Missing shared HTTP client")
        require(all(rule.get("http_client") == "rule-set-direct" and "download_detour" not in rule
                    for rule in route["rule_set"] if rule["type"] == "remote"), "Incorrect rule-set HTTP client")
    if line == "1.15":
        require(all("stack" not in item for item in config["inbounds"]), "Removed TUN stack field in 1.15")
    if platform != "android":
        return
    dns_rules = config["dns"]["rules"]
    if scenario == "dual-stack":
        require(any(":" in address for address in inbound["address"]) and config["dns"].get("strategy") == "prefer_ipv4", "Dual-stack addressing missing")
        require(not any(rule.get("ip_version") == 6 and rule.get("action") == "reject" for rule in route["rules"]), "Dual-stack IPv6 rejected")
        require(not any(rule.get("action") == "predefined" and "AAAA" in rule.get("query_type", []) for rule in dns_rules), "Dual-stack AAAA blocked")
    elif scenario == "no-adblock":
        require(not any("category-ads-all" in rule.get("rule_set", []) for rule in route["rules"])
                and all(rule["tag"] != "category-ads-all" for rule in route["rule_set"]), "Ad blocking still enabled")
    elif scenario == "battery-saver":
        require(config["log"].get("level") == "error" and all(outbound.get("interval") == "15m" and outbound.get("tolerance") == 300
                for outbound in config["outbounds"] if outbound["type"] == "urltest"), "Incorrect battery-saver settings")
    elif scenario == "udp-first":
        require(next(outbound for outbound in config["outbounds"] if outbound["tag"] == "select").get("default") == "udp-auto", "UDP-first default missing")
    elif scenario == "privacy-strict":
        from .static import objects
        require(all("client_subnet" not in item for item in objects(config)), "Privacy profile includes ECS")


def check_profiles(binary, line, version, root=ROOT):
    catalog = read_json(root / "presets/catalog.json")
    profiles = [(platform, scenario, root / f"platforms/{platform}/{line}/{scenario}.json")
                for platform, settings in catalog["platforms"].items() for scenario in settings["scenarios"]]
    actual = set((root / "platforms").glob(f"*/{line}/*.json"))
    require(actual == {path for _, _, path in profiles}, f"Platform files do not match the catalog for {line}")
    node = executable("node")
    with tempfile.TemporaryDirectory(prefix="sing-box-profiles-") as directory:
        work = Path(directory)
        for platform, scenario, path in profiles:
            try:
                validate_profile(read_json(path), platform, line, scenario)
            except CheckError as error:
                raise CheckError(f"{path.relative_to(root)}: {error}") from error
            run([binary, "check", "-c", str(path)], cwd=work)
            rendered = work / "rendered.json"
            run([node, str(root / "scripts/generate.mjs"), "--template", str(path), "--input",
                 str(root / "examples/nodes.example.json"), "--output", str(rendered)], cwd=work, capture=True)
            if os.name != "nt":
                require(stat.S_IMODE(rendered.stat().st_mode) == 0o600, "Rendered profile is not mode 600")
            run([binary, "check", "-c", str(rendered)], cwd=work)
    print(f"Core {line}: {len(profiles)} public and rendered profiles passed {version}.", flush=True)


def download(url, destination):
    require(url.startswith("https://"), "Rule-set download must use HTTPS")
    for attempt in range(4):
        try:
            with urlopen(url, timeout=30) as response, destination.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    output.write(chunk)
            require(destination.stat().st_size > 0, "Downloaded rule set is empty")
            return
        except (URLError, TimeoutError, OSError):
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def check_rule_sets(binary, line, version, root=ROOT, *, downloader=download):
    config = read_json(root / f"platforms/android/{line}/realip.json")
    rules = config["route"]["rule_set"]
    require(len(rules) == 17 and len({rule["tag"] for rule in rules}) == 17, "Expected 17 unique rule sets")
    with tempfile.TemporaryDirectory(prefix="sing-box-rules-") as directory:
        work = Path(directory)
        for rule in rules:
            require(re.fullmatch(r"[a-z0-9!_-]+", rule["tag"]), "Unsafe rule-set tag")
            destination = work / (rule["tag"] + ".srs")
            downloader(rule["url"], destination)
            require(destination.is_file() and destination.stat().st_size > 0, "Downloaded rule set is empty")
            rule.update(type="local", path=str(destination))
            for field in ("url", "http_client", "download_detour"):
                rule.pop(field, None)
        profile = work / "local-rule-sets.json"
        profile.write_text(json.dumps(config), encoding="utf-8")
        run([binary, "check", "-c", str(profile)], cwd=work)
    print(f"Rule sets passed: {len(rules)} downloads parsed by {version}.", flush=True)
