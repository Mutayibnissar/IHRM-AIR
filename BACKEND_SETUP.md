# IHRM Air secure Gemini backend

The GitHub Pages site stays at https://mutayibnissar.github.io/IHRM-AIR/. This Cloudflare Worker keeps the Gemini API key on the server side instead of exposing it in the page.

## One-time setup

1. Open the Cloudflare dashboard and go to **Workers & Pages**.
2. Create a Worker named **ihrm-air-api**.
3. Replace its starter code with the full contents of `backend/worker.js`, then deploy.
4. In the Worker, open **Settings → Variables and Secrets** (the wording may vary), add a secret named `GEMINI_API_KEY`, paste your existing Gemini key into the secret value, and save. Do not put the key in this repository or send it in chat.
5. Copy the deployed Worker URL. It should look like `https://ihrm-air-api.<your-cloudflare-subdomain>.workers.dev`.
6. In `index.html`, replace `https://ihrm-air-api.REPLACE-WITH-YOUR-CLOUDFLARE-SUBDOMAIN.workers.dev` with your actual Worker URL and commit the change.
7. Open the live site, run **Run Gemini Agent**, then **Run AI Agent Team**.

## Security notes

- The Worker only accepts browser requests whose Origin is `https://mutayibnissar.github.io`.
- The Gemini key is read from the Cloudflare secret binding `env.GEMINI_API_KEY`; it is never sent to the browser.
- Requests are size-limited and agent IDs are allow-listed.
- Keep the key secret. If it was ever committed to a public repository or shared, rotate it in Google AI Studio.
- The frontend endpoint placeholder intentionally fails until you set the actual Worker URL.
- For broader public use, add Cloudflare rate limiting/WAF rules and usage limits. Origin checks alone are not authentication against non-browser clients.
