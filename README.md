# IHRM Air — Integrated Study Hub

IHRM Air is a multi-page study platform for International Human Resource Management.

## Current software foundation
- Course units, practice and timed mock exams.
- Browser-local progress, mistake notebook, study planner and session tracking.
- Import/export tools for personal study data.
- Responsive UI, keyboard accessibility and light/dark themes.
- Installable Progressive Web App (PWA) shell with offline caching for core pages.

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

## Development roadmap
1. Separate course and question content into versioned data files.
2. Add automated question validation and workflow tests.
3. Add robust progress and assessment reporting.
4. Add account-backed sync only after selecting a secure backend and hosting environment.

No AI features are included in this build.
