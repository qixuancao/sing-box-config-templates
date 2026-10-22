#!/usr/bin/env python3
"""Compose public JSON from versioned modules and explicit scenario recipes."""
import argparse
import copy
import json
import re
from pathlib import Path

from ios_route_excludes import route_exclusions


ROOT = Path(__file__).resolve().parent.parent
KINDS = {
    "base": {"$schema", "log", "http_clients"},
    "dns": {"dns"}, "inbounds": {"inbounds"}, "outbounds": {"outbounds"},
    "rules": {"route"}, "rule-sets": {"route"}, "experimental": {"experimental"},
}
SHARED = {"outbounds", "experimental"}
ORDER = ("$schema", "log", "dns", "inbounds", "outbounds", "route", "experimental", "http_clients")


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def encode(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def merge(target, fragment, path=""):
    """Merge disjoint objects; array order is explicit, never concatenated."""
    for key, value in fragment.items():
        location = f"{path}.{key}" if path else key
        if key not in target:
            target[key] = copy.deepcopy(value)
        elif isinstance(target[key], dict) and isinstance(value, dict):
            merge(target[key], value, location)
        else:
            raise ValueError(f"Conflicting module ownership: {location}")


def load_module(root, kind, version, name):
    if kind not in KINDS or not re.fullmatch(r"[a-z][a-z0-9-]*", name):
        raise ValueError("Invalid module selection")
    if not re.fullmatch(r"1\.\d+", version):
        raise ValueError("Invalid module version")
    directory = "common" if kind in SHARED else version
    fragment = read(root / "modules" / kind / directory / f"{name}.json")
    if not isinstance(fragment, dict) or not fragment or set(fragment) - KINDS[kind]:
        raise ValueError(f"Unexpected fields in {kind}/{directory}/{name}")
    if kind == "rules" and "rule_set" in fragment["route"]:
        raise ValueError("Rule-set downloads belong in the rule-sets module")
    if kind == "rule-sets" and set(fragment["route"]) != {"rule_set"}:
        raise ValueError("The rule-sets module must only define route.rule_set")
    return fragment


def compose(root, catalog, version, scenario, platform):
    if version not in catalog["versions"]:
        raise ValueError("Unknown version")
    if not re.fullmatch(r"[a-z][a-z0-9-]*", scenario):
        raise ValueError("Invalid scenario")
    recipe = read(root / "presets/scenarios" / f"{scenario}.json")
    selections = dict(recipe["modules"])
    if set(selections) != set(KINDS) - {"base"}:
        raise ValueError(f"Incomplete recipe: {scenario}")
    settings = catalog["platforms"][platform]
    if scenario not in settings["scenarios"]:
        raise ValueError("Scenario unavailable on this platform")
    selections["inbounds"] = settings.get("inbound_overrides", {}).get(scenario, selections["inbounds"])
    config = {}
    merge(config, load_module(root, "base", version, "default"))
    for kind, name in selections.items():
        merge(config, load_module(root, kind, version, name))
    if settings.get("auto_detect_interface"):
        config["route"]["auto_detect_interface"] = True
    if settings.get("ios_lan_bypass"):
        config["inbounds"][0]["route_exclude_address"] = route_exclusions(config)
    if "log_level" in recipe:
        config["log"]["level"] = recipe["log_level"]
    config["experimental"]["cache_file"]["cache_id"] = f"{platform}-{version}-{scenario}"
    cache = config["experimental"]["cache_file"]
    cache_order = dict.fromkeys(("enabled", "cache_id", *cache))
    config["experimental"]["cache_file"] = {key: cache[key] for key in cache_order if key in cache}
    route_order = ("rules", "rule_set", "final", "default_domain_resolver", "default_http_client", "auto_detect_interface")
    config["route"] = {key: config["route"][key] for key in dict.fromkeys((*route_order, *config["route"])) if key in config["route"]}
    return {key: config[key] for key in ORDER if key in config}


def profile_path(catalog, platform, version, scenario):
    if catalog["versions"][version]["channel"] == "experimental":
        return f"experimental/{version}/platforms/{platform}/{scenario}.json"
    return f"platforms/{platform}/{version}/{scenario}.json"


def outputs(root=ROOT):
    catalog = read(root / "presets/catalog.json")
    result = {}
    for version in catalog["versions"]:
        for platform, settings in catalog["platforms"].items():
            for scenario in settings["scenarios"]:
                result[profile_path(catalog, platform, version, scenario)] = encode(compose(root, catalog, version, scenario, platform))
    client_catalog = {
        "default_core": catalog["default_core"], "versions": catalog["versions"],
        "platforms": {name: settings["scenarios"] for name, settings in catalog["platforms"].items()},
    }
    result["docs/assets/presets.mjs"] = "// Generated from presets/catalog.json by scripts/build-configs.py.\nexport const PRESETS = " + json.dumps(client_catalog, separators=(",", ":")) + ";\n"
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    generated = outputs()
    expected = {name for name in generated if name.endswith(".json")}
    actual = {str(path.relative_to(ROOT)) for directory in ("platforms", "experimental") for path in (ROOT / directory).rglob("*.json")}
    unexpected = actual - expected
    if unexpected:
        raise SystemExit("Unexpected generated profiles: " + ", ".join(sorted(unexpected)))
    stale = []
    for name, content in generated.items():
        path = ROOT / name
        if args.check:
            if not path.is_file() or path.read_text(encoding="utf-8") != content:
                stale.append(name)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
    if stale:
        raise SystemExit("Generated configurations are stale; run ./scripts/sync-platforms.sh:\n" + "\n".join(stale))
    print(f"{'Checked' if args.check else 'Composed'} {len(expected)} public configurations from versioned modules (1.13 / 1.14 stable, 1.15 experimental).")


if __name__ == "__main__":
    main()
