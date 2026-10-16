#!/usr/bin/env python3
"""Extract and syntax-check inline JavaScript in app HTML using Node.js."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import tempfile
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = ["index.html", "units.html", "practice.html", "tools.html", "planner.html", "tracker.html", "backup.html"]

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
        self.current = None
        self.attrs = {}
    def handle_starttag(self, tag, attrs):
        if tag.lower() == "script":
            self.attrs = dict(attrs)
            self.current = [] if "src" not in self.attrs and self.attrs.get("type", "").lower() not in ("application/json", "application/ld+json", "importmap") else None
    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == "script":
            if self.current is not None:
                code = "".join(self.current).strip()
                if code:
                    self.items.append(code)
            self.current = None
            self.attrs = {}

checked = 0
errors = []
for page in PAGES:
    parser = Scripts()
    try:
        parser.feed((ROOT / page).read_text(encoding="utf-8"))
        parser.close()
    except Exception as exc:
        errors.append(f"{page}: HTML parser error: {exc}")
        continue
    for number, code in enumerate(parser.items, 1):
        checked += 1
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as temp:
            temp.write(code)
            temp.flush()
            result = subprocess.run(["node", "--check", temp.name], text=True, capture_output=True)
        if result.returncode:
            message = (result.stderr or result.stdout).strip().splitlines()
            errors.append(f"{page} inline script #{number}: {message[0] if message else 'syntax error'}")

if errors:
    print("\n".join("FAIL: " + error for error in errors))
    sys.exit(1)
print(f"PASS: syntax checked {checked} inline JavaScript blocks across {len(PAGES)} pages.")
