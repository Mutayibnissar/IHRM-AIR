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
    "manifest.webmanifest", "offline.html", "assets/icon.svg", "data/question.schema.json", "data/question-bank.json", "data/README.md",
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

try:
    bank = json.loads((ROOT / "data/question-bank.json").read_text(encoding="utf-8"))
except (ValueError, OSError) as exc:
    fail(f"question bank is not valid JSON: {exc}")
questions = bank.get("questions")
if bank.get("schemaVersion") != 1 or not isinstance(questions, list) or not questions:
    fail("question bank must have schemaVersion 1 and a non-empty questions array")
question_ids = set()
unit_counts = {unit: 0 for unit in range(1, 5)}
for index, question in enumerate(questions, 1):
    label = f"question #{index}"
    required = ("id", "unitId", "type", "prompt", "options", "correctOptionId", "explanation", "difficulty", "tags", "source")
    missing = [field for field in required if field not in question]
    if missing:
        fail(f"{label} missing fields: {', '.join(missing)}")
    if not isinstance(question["id"], str) or question["id"] in question_ids:
        fail(f"{label} has a missing or duplicate stable ID")
    question_ids.add(question["id"])
    unit = question["unitId"]
    if unit not in unit_counts:
        fail(f"{label} has invalid unitId: {unit}")
    unit_counts[unit] += 1
    if question["type"] != "single-choice" or question["difficulty"] not in ("foundation", "intermediate", "advanced"):
        fail(f"{label} has unsupported type or difficulty")
    if not isinstance(question["prompt"], str) or len(question["prompt"].strip()) < 12:
        fail(f"{label} has an empty or too-short prompt")
    options = question["options"]
    if not isinstance(options, list) or not 2 <= len(options) <= 6:
        fail(f"{label} must have between 2 and 6 options")
    option_ids = [option.get("id") for option in options if isinstance(option, dict)]
    if len(option_ids) != len(options) or len(set(option_ids)) != len(option_ids):
        fail(f"{label} has malformed or duplicate option IDs")
    if question["correctOptionId"] not in option_ids:
        fail(f"{label} correctOptionId does not match any option")
    if not isinstance(question["explanation"], str) or len(question["explanation"].strip()) < 12:
        fail(f"{label} needs a meaningful explanation")
    if not isinstance(question["tags"], list) or not question["tags"]:
        fail(f"{label} needs at least one topic tag")
    source = question["source"]
    if not isinstance(source, dict) or source.get("kind") not in ("textbook", "academic-paper", "official-guidance", "course-material", "original") or not source.get("title"):
        fail(f"{label} has incomplete source metadata")
    review = question.get("review", {})
    if review and review.get("status") not in ("draft", "reviewed", "approved"):
        fail(f"{label} has an invalid review status")
if len(questions) != 32 or any(count != 8 for count in unit_counts.values()):
    fail(f"unexpected migrated bank distribution: {len(questions)} total, per unit {unit_counts}")
if any(question.get("review", {}).get("status") != "draft" for question in questions):
    fail("migrated questions must remain draft until subject-matter review")
worker = (ROOT / "service-worker.js").read_text(encoding="utf-8")
for page in ("index.html", "units.html", "practice.html", "tools.html", "planner.html", "tracker.html", "backup.html", "offline.html"):
    if page not in worker:
        fail(f"service-worker.js app shell does not mention {page}")

print(f"PASS: {len(REQUIRED)} pages, {len(CORE_FILES)} core assets, navigation/ID integrity, PWA manifest, question schema and {len(questions)} question records across four units.")
