"""Public-data audits and subscription-link checks using only the standard library."""
import fnmatch
import re
from urllib.parse import parse_qs, urlsplit

from .common import ROOT, read_json, require

PUBLIC_DIRECTORIES = ("platforms", "modules", "presets", "examples", "docs", "scripts", "tests", "web", ".github")
PUBLIC_FILES = ("README.md", "README.en.md", "CHANGELOG.md", "CONTRIBUTING.md", "PRIVACY.md",
                "SECURITY.md", "SUBSCRIPTIONS.md", "THIRD_PARTY.md", "LICENSE", ".gitignore")
PRIVATE_MARKER = re.compile(
    r"100\.(?!64\.0\.0/10(?![0-9A-Za-z_./]))(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.\d{1,3}\.\d{1,3}"
    r"|[a-z0-9-]+\.ts\.net|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|eyJ[a-zA-Z0-9_-]{20,}\."
)
RAW_PREFIX = "https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/"


def public_files(root):
    # Explicit public roots: never traverse the independent private backup repo or
    # local node inputs. Do not rely on Git or an external scanner's ignore rules.
    for name in PUBLIC_FILES:
        path = root / name
        if path.is_file():
            require(not path.is_symlink(), f"Symlink in public sources: {name}")
            yield path
    for name in PUBLIC_DIRECTORIES:
        directory = root / name
        require(directory.is_dir() and not directory.is_symlink(), f"Missing or symlinked public directory: {name}")
        for path in sorted(directory.rglob("*")):
            relative = path.relative_to(directory)
            if any(part in ("__pycache__", ".git", "generated", "cache", "node_modules") for part in relative.parts):
                continue
            if any(fnmatch.fnmatch(path.name, pattern) for pattern in ("AGENTS.md", "nodes.json", "nodes.txt", "*.local.json", ".env*", ".render.*", "*.pem", "*.key")):
                continue
            require(not path.is_symlink(), f"Symlink in public sources: {path.relative_to(root)}")
            if path.is_file() and path.suffix in (".json", ".md", ".mjs", ".py", ".html", ".css", ".yml", ".yaml", ".xml", ".txt"):
                yield path


def objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from objects(child)


def audit(root=ROOT):
    count = 0
    for path in public_files(root):
        name = path.relative_to(root).as_posix()
        text = path.read_text(encoding="utf-8")
        require(not PRIVATE_MARKER.search(text), f"Forbidden private marker in {name}")
        if path.suffix != ".json" or path.relative_to(root).parts[0] not in ("platforms", "modules", "presets", "examples"):
            continue
        document = read_json(path)
        for value in objects(document):
            require("password" not in value or value["password"] == "CHANGE_ME", f"Non-placeholder password in {name}")
            require(not {"uuid", "private_key", "public_key", "short_id"} & value.keys(), f"Forbidden credential field in {name}")
        if isinstance(document, dict):
            for outbound in document.get("outbounds", []):
                if outbound.get("type") == "hysteria2":
                    require(outbound.get("server") == "example.com" and outbound.get("password") == "CHANGE_ME", f"Non-placeholder Hysteria2 node in {name}")
        count += 1
    require(count > 0, "No public JSON files found for audit")
    print(f"Public audit passed: {count} JSON files and public source markers.", flush=True)


def check_links(root=ROOT):
    catalog = read_json(root / "presets/catalog.json")
    expected = set()
    expected_imports = set()
    for version, metadata in catalog["versions"].items():
        if metadata["channel"] != "stable":
            continue
        for platform, settings in catalog["platforms"].items():
            for scenario in settings["scenarios"]:
                path = f"platforms/{platform}/{version}/{scenario}.json"
                require((root / path).is_file(), f"Missing subscription profile: {path}")
                expected.add(RAW_PREFIX + path)
                if platform in ("android", "ios", "macos") and scenario != "mixed":
                    expected_imports.add(RAW_PREFIX + path)
    text = (root / "SUBSCRIPTIONS.md").read_text(encoding="utf-8")
    raw_urls = set(re.findall(re.escape(RAW_PREFIX) + r"[A-Za-z0-9._!/-]+\.json", text))
    require(raw_urls == expected and expected, "Stable Raw URLs must exactly match presets/catalog.json")
    uris = re.findall(r"sing-box://import-remote-profile\?url=[^># ]+#[^> ]+", text)
    imported = []
    for uri in uris:
        parsed = urlsplit(uri)
        query = parse_qs(parsed.query, strict_parsing=True)
        require(set(query) == {"url"} and len(query["url"]) == 1 and parsed.fragment, "Malformed import URI")
        imported.append(query["url"][0])
    require(len(imported) == len(expected_imports) and set(imported) == expected_imports, "Import URIs must exactly match mobile stable profiles")
    print(f"Subscription links passed: {len(raw_urls)} Raw URLs, {len(uris)} import URIs.", flush=True)
