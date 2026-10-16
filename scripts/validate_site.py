#!/usr/bin/env python3
"""Fast, dependency-free integrity checks for the IHRM Air static app."""
from html.parser import HTMLParser
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {
    "index.html": ["units.html", "practice.html", "tools.html", 'id="homeAttempts"', 'id="homeAccuracy"', 'site-nav-toggle'],
    "units.html": ['id="u1"', 'id="u2"', 'id="u3"', 'id="u4"'],
    "practice.html": ['id="exam-centre"', 'id="quiz"', 'id="integrated-cards"'],
    "tools.html": ["Study Tools Hub", 'href="planner.html"', 'href="tracker.html"', 'href="backup.html"'],
    "planner.html": ["Study Planner", "planner"],
    "tracker.html": ["Session Tracker", "tracker"],
    "backup.html": ["Backup", "backup"],
}
CORE_FILES = [
    "assets/ihrm-refresh.js", "assets/ihrm-refresh.css", "service-worker.js",
    "manifest.webmanifest", "offline.html", "assets/icon.svg", "data/question.schema.json", "data/README.md",
]

class DocumentCheck(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.nav_count = 0
        self.footer_count = 0
        self.ids = set()
        self.duplicates = set()
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "nav" and attrs.get("id") == "sitePageNav":
            self.nav_count += 1
        if tag == "footer":
            self.footer_count += 1
        ident = attrs.get("id")
        if ident:
            if ident in self.ids:
                self.duplicates.add(ident)
            self.ids.add(ident)

def fail(message):
    print("FAIL:", message)
    sys.exit(1)

for filename in [*REQUIRED, *CORE_FILES]:
    path = ROOT / filename
    if not path.is_file() or path.stat().st_size == 0:
        fail(f"missing or empty required file: {filename}")

for filename, markers in REQUIRED.items():
    source = (ROOT / filename).read_text(encoding="utf-8")
    for marker in markers:
        if marker not in source:
            fail(f"{filename} missing required marker: {marker}")
    parser = DocumentCheck()
    try:
        parser.feed(source)
        parser.close()
    except Exception as exc:
        fail(f"{filename} HTML parsing failed: {exc}")
    if parser.nav_count != 1:
        fail(f"{filename} must contain exactly one #sitePageNav navigation (found {parser.nav_count})")
    if parser.footer_count > 1:
        fail(f"{filename} contains duplicate footer elements")
    if parser.duplicates:
        fail(f"{filename} has duplicate HTML IDs: {', '.join(sorted(parser.duplicates)[:12])}")

try:
    manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
except (ValueError, OSError) as exc:
    fail(f"manifest.webmanifest is not valid JSON: {exc}")
for key in ("name", "short_name", "start_url", "scope", "display", "icons"):
    if key not in manifest:
        fail(f"manifest missing required field: {key}")
if not isinstance(manifest["icons"], list) or not manifest["icons"]:
    fail("manifest must define at least one icon")
for icon in manifest["icons"]:
    icon_path = (ROOT / icon.get("src", "")).resolve()
    if ROOT.resolve() not in icon_path.parents or not icon_path.is_file():
        fail(f"manifest icon is missing or escapes repository: {icon.get('src')}")

try:
    schema = json.loads((ROOT / "data/question.schema.json").read_text(encoding="utf-8"))
except (ValueError, OSError) as exc:
    fail(f"question schema is not valid JSON: {exc}")
if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
    fail("question schema must declare JSON Schema 2020-12")
question_fields = schema.get("properties", {})
for field in ("id", "unitId", "type", "prompt", "options", "correctOptionId", "explanation", "difficulty", "tags", "source"):
    if field not in question_fields:
        fail(f"question schema missing field: {field}")

worker = (ROOT / "service-worker.js").read_text(encoding="utf-8")
for page in ("index.html", "units.html", "practice.html", "tools.html", "planner.html", "tracker.html", "backup.html", "offline.html"):
    if page not in worker:
        fail(f"service-worker.js app shell does not mention {page}")

print(f"PASS: {len(REQUIRED)} pages, {len(CORE_FILES)} core assets, navigation/ID integrity, PWA manifest, question schema and offline shell.")
