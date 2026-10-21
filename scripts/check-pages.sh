#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

command -v python3 >/dev/null 2>&1 || {
  printf '%s\n' 'error: python3 is required' >&2
  exit 1
}

python3 -B "$repo_dir/scripts/build-pages.py" --check
python3 -B "$repo_dir/scripts/sync-web-profiles.py" --check

python3 - "$repo_dir" <<'PY'
import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

repo = Path(sys.argv[1])
docs = repo / "docs"
zh = docs / "index.html"
en = docs / "en" / "index.html"
sitemap = docs / "sitemap.xml"
nojekyll = docs / ".nojekyll"

for p in (zh, en, sitemap, nojekyll):
    if not p.is_file():
        print(f"error: missing Pages file: {p.relative_to(repo)}", file=sys.stderr)
        sys.exit(1)

class PageInfo(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.in_title = False
        self.metas = []
        self.links = []
        self.scripts = []
        self.inline_scripts = []
        self._cur_script = None
        self.lang = ""
        self.anchors = []
        self.select_ids = set()
        self.current_select = None
        self.core_versions = []
        self.has_viewport = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang", "")
        elif tag == "title":
            self.in_title = True
        elif tag == "meta":
            self.metas.append(a)
            if a.get("name") == "viewport":
                self.has_viewport = True
        elif tag == "link":
            self.links.append(a)
        elif tag == "script":
            self.scripts.append(a)
            if "src" not in a:
                self._cur_script = []
        elif tag == "a":
            if "href" in a:
                self.anchors.append(a["href"])
        elif tag in ("select", "input", "textarea", "button"):
            if "id" in a:
                self.select_ids.add(a["id"])
            if tag == "select":
                self.current_select = a.get("id")
        elif tag == "option" and self.current_select == "core":
            self.core_versions.append(a.get("value"))

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        elif tag == "select":
            self.current_select = None
        elif tag == "script" and self._cur_script is not None:
            self.inline_scripts.append("".join(self._cur_script))
            self._cur_script = None

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self._cur_script is not None:
            self._cur_script.append(data)

def check_page(path, *, lang, canonical, other_hreflang):
    text = path.read_text(encoding="utf-8")
    info = PageInfo()
    info.feed(text)

    if info.lang != lang:
        print(f"error: {path.name} lang expected {lang}, got {info.lang}", file=sys.stderr)
        sys.exit(1)
    if not info.title.strip():
        print(f"error: {path} missing title", file=sys.stderr)
        sys.exit(1)
    if not info.has_viewport:
        print(f"error: {path} missing viewport", file=sys.stderr)
        sys.exit(1)

    def meta_ok(**kw):
        return any(all(m.get(k) == v for k, v in kw.items()) for m in info.metas)

    if not meta_ok(name="description"):
        print(f"error: {path} missing meta description", file=sys.stderr)
        sys.exit(1)
    desc = next(m.get("content", "") for m in info.metas if m.get("name") == "description")
    if len(desc.strip()) < 20:
        print(f"error: {path} meta description too short", file=sys.stderr)
        sys.exit(1)

    # canonical
    canon = [l.get("href") for l in info.links if l.get("rel") == "canonical"]
    if canon != [canonical]:
        print(f"error: {path} canonical expected {canonical}, got {canon}", file=sys.stderr)
        sys.exit(1)

    # hreflang zh + en (real translation, no fake hreflang)
    hreflangs = {l.get("hreflang"): l.get("href") for l in info.links if "hreflang" in l}
    if set(hreflangs) < {"zh-CN", "en"}:
        print(f"error: {path} missing zh-CN/en hreflang: {hreflangs}", file=sys.stderr)
        sys.exit(1)
    if hreflangs.get(other_hreflang[0]) != other_hreflang[1]:
        print(f"error: {path} hreflang {other_hreflang} mismatch: {hreflangs}", file=sys.stderr)
        sys.exit(1)

    # sitemap exposed via link
    if not any(l.get("rel") == "sitemap" and "sitemap.xml" in l.get("href", "") for l in info.links):
        print(f"error: {path} missing sitemap link", file=sys.stderr)
        sys.exit(1)

    # Open Graph + Twitter
    for prop in ("og:title", "og:description", "og:url", "og:type", "og:locale"):
        if not meta_ok(property=prop):
            print(f"error: {path} missing {prop}", file=sys.stderr)
            sys.exit(1)
    for name in ("twitter:card", "twitter:title", "twitter:description"):
        if not meta_ok(name=name):
            print(f"error: {path} missing {name}", file=sys.stderr)
            sys.exit(1)

    # no external analytics / scripts
    for s in info.scripts:
        src = s.get("src", "")
        if src.startswith("http://") or src.startswith("https://") or src.startswith("//"):
            print(f"error: {path} has external script: {src}", file=sys.stderr)
            sys.exit(1)
    lowered = text.lower()
    for bad in ("google-analytics", "googletagmanager", "matomo", "umami", "plausible", "hotjar"):
        if bad in lowered:
            print(f"error: {path} mentions analytics: {bad}", file=sys.stderr)
            sys.exit(1)

    # JSON-LD: SoftwareSourceCode + FAQ
    ld_blocks = [s for s in info.scripts if s.get("type") == "application/ld+json"]
    if not ld_blocks:
        print(f"error: {path} missing JSON-LD", file=sys.stderr)
        sys.exit(1)
    found_software = found_faq = False
    for raw in info.inline_scripts:
        t = raw.strip()
        if not t.startswith("{"):
            continue
        try:
            data = json.loads(t)
        except json.JSONDecodeError as e:
            print(f"error: {path} invalid JSON-LD: {e}", file=sys.stderr)
            sys.exit(1)
        nodes = data.get("@graph", [data]) if isinstance(data, dict) else data
        for n in nodes:
            if n.get("@type") == "SoftwareSourceCode":
                found_software = True
            if n.get("@type") == "FAQPage":
                found_faq = True
                if not n.get("mainEntity"):
                    print(f"error: {path} FAQ has no questions", file=sys.stderr)
                    sys.exit(1)
    if not (found_software and found_faq):
        print(f"error: {path} JSON-LD must include SoftwareSourceCode and FAQ", file=sys.stderr)
        sys.exit(1)

    # Browser generator: local input -> maintained preset -> downloadable JSON.
    if info.core_versions != ["1.14", "1.13"]:
        print(f"error: {path} must offer only core versions 1.14 and 1.13", file=sys.stderr)
        sys.exit(1)
    for need in ("platform", "core", "scenario", "nodes-input", "nodes-file", "generate",
                 "download-json", "download-nodes", "copy-json", "clear", "json-preview",
                 "out-path", "out-raw", "out-cmd"):
        if need not in info.select_ids and need not in text:
            print(f"error: {path} generator missing element: {need}", file=sys.stderr)
            sys.exit(1)
    module = next((s.get("src") for s in info.scripts if s.get("type") == "module"), None)
    if not module or (path.parent / module).resolve() != (docs / "assets/app.mjs").resolve():
        print(f"error: {path} must use the shared generator module", file=sys.stderr)
        sys.exit(1)
    joined_js = "\n".join(p.read_text() for p in sorted((docs / "assets").rglob("*.mjs")))
    for token in ("raw.githubusercontent.com", "generate.mjs", "URL.createObjectURL", "anchor.download", "sing-box.json"):
        if token not in joined_js and token not in text:
            print(f"error: {path} generator output missing: {token}", file=sys.stderr)
            sys.exit(1)
    for bad in (r"\bfetch\s*\(", r"XMLHttpRequest", r"navigator\.sendBeacon",
                r"\bWebSocket\s*\(", r"\blocalStorage\b", r"\bsessionStorage\b", r"\bindexedDB\b"):
        if re.search(bad, joined_js):
            print(f"error: {path} generator must not send or store node input: {bad}", file=sys.stderr)
            sys.exit(1)
    if not meta_ok(**{"http-equiv": "Content-Security-Policy"}) or "connect-src 'none'" not in text:
        print(f"error: {path} must block runtime network requests with CSP", file=sys.stderr)
        sys.exit(1)
    if "占位" not in text and "placeholder" not in text.lower():
        print(f"error: {path} must clarify Raw JSON is a placeholder", file=sys.stderr)
        sys.exit(1)

    # keyboard / responsive basics
    if "skip" not in text.lower() and "skip to" not in text.lower() and "跳到" not in text:
        print(f"error: {path} missing skip link for keyboard users", file=sys.stderr)
        sys.exit(1)
    styles = "\n".join((path.parent / link["href"]).read_text() for link in info.links if link.get("rel") == "stylesheet")
    if ":focus-visible" not in styles:
        print(f"error: {path} missing focus style", file=sys.stderr)
        sys.exit(1)
    if "@media" not in styles:
        print(f"error: {path} missing responsive CSS", file=sys.stderr)
        sys.exit(1)

    return info

zh_info = check_page(
    zh,
    lang="zh-CN",
    canonical="https://qixuancao.github.io/sing-box-config-templates/",
    other_hreflang=("en", "https://qixuancao.github.io/sing-box-config-templates/en/"),
)
en_info = check_page(
    en,
    lang="en",
    canonical="https://qixuancao.github.io/sing-box-config-templates/en/",
    other_hreflang=("zh-CN", "https://qixuancao.github.io/sing-box-config-templates/"),
)

# titles and descriptions must be independent (not identical)
if zh_info.title.strip() == en_info.title.strip():
    print("error: zh/en titles must be independent", file=sys.stderr)
    sys.exit(1)

# sitemap
tree = ET.parse(str(sitemap))
ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
locs = [e.text.strip() for e in tree.getroot().findall("s:url/s:loc", ns)]
expected = [
    "https://qixuancao.github.io/sing-box-config-templates/",
    "https://qixuancao.github.io/sing-box-config-templates/en/",
]
if locs != expected:
    print(f"error: sitemap locs expected {expected}, got {locs}", file=sys.stderr)
    sys.exit(1)

# site-internal links: zh ./en/ and en ../ must resolve; no fake root robots claim
for info, name in ((zh_info, "zh"), (en_info, "en")):
    for href in info.anchors:
        if href.startswith("http"):
            continue
        if href in ("./", "./en/", "../", "./sitemap.xml", "../sitemap.xml", "#selector"):
            continue
        if href.startswith("#") or href.startswith("mailto:"):
            continue
        print(f"error: {name} page has unexpected site-internal link: {href}", file=sys.stderr)
        sys.exit(1)

print("Pages passed: zh + en, SEO, local JSON generator, CSP, no node network/storage APIs.")
PY
