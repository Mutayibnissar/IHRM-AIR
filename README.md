# IHRM Air — Integrated Study Hub

IHRM Air is a multi-page study platform for International Human Resource Management.

## Current software foundation
- Course units, practice and timed mock exams.
- Dedicated Agent Crew workspace with six browser-local specialist workflows: Study Coach, Concept Explainer, Exam Setter, Flashcard Maker, Revision Planner, and Notes Navigator.
- Agent Crew searches local course pages and the structured question bank; it makes no hosted AI calls and requires no API key.
- Dedicated Evidence & Sources page with a recognised IHRM textbook, official ILO/OECD references, and Google Scholar topic discovery.
- Browser-local progress, mistake notebook, study planner and session tracking.
- Import/export tools for personal study data.
- Responsive UI, keyboard accessibility and light/dark themes.
- Installable Progressive Web App (PWA) shell with offline caching for core pages and the structured question bank.
- Automated deployment checks for required pages, local links, navigation, duplicate IDs, PWA metadata, and JavaScript syntax.
- Headless Chromium regression checks cover course-unit navigation, structured question loading, answer/next flow, timed mock history, planner schedule generation, tracker logging, backup export, PWA offline navigation, mobile navigation, all dedicated workspaces, and uncaught browser errors.
- A versioned question-record schema and editorial guidance for source tracking and review.
- A single structured 32-question bank (8 per unit) is now the live source for practice and mock exams; the duplicated embedded bank was removed. Automated checks validate question IDs, unit coverage, answer mapping, and the live loader. Questions remain marked draft pending subject-matter verification.
- The Tools Hub, Study Planner, Session Tracker, Backup & Restore, and Agent Crew are dedicated pages. Agent Crew is a transparent, rule-based local workflow—not a hosted LLM or an expert-verified answer engine.

## Run locally
This is a static web app. Serve the repository directory with any static HTTP server; opening files directly with `file://` will not enable service-worker features. For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deployment
GitHub Actions deploys the static site to GitHub Pages when changes reach `main`. The PWA uses relative paths so it works under the repository subpath `/IHRM-AIR/`.

## Data and privacy
Personal study data is stored in the browser on the device being used. It is not synced between devices or accounts. Export a backup before clearing browser storage.

## Development status and next steps
The live exam controller now reads data/question-bank.json and converts records into the existing practice/mock-exam format. This avoids maintaining two independent copies of question content. Browser-local study data remains local to each device; there is no account sync or server-side data store.

The automated browser suite now also verifies mistake capture/retry, backup export/restore, timed mock history, PWA offline navigation, and the main study workspaces. Remaining quality work: verify academic question content against authoritative sources before changing draft review status, and perform real-device accessibility and offline smoke tests.

Agent Crew is not connected to a hosted AI model. Do not put API keys in this static repository. A future model-backed implementation would require a secure server-side route, source-grounding, rate limits, and clear AI disclosure.
