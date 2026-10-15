# Supabase setup for IHRM AIR

This replaces the unfinished Cloudflare Worker path. GitHub Pages remains the frontend host. Supabase provides:
- Postgres REST storage for a signed-in user's study snapshot, protected by Row Level Security (RLS).
- Supabase Auth email magic-link sign-in.
- An Edge Function that calls Gemini server-side. The Gemini key is stored only as a Supabase Function secret.

## 1. Create a Supabase project
Create a project in Supabase. In Project Settings → API, copy the Project URL and the **publishable/anon** key. These are browser configuration values; never use the service-role key in the website.

## 2. Create the study storage table
Open SQL Editor and run the migration in `supabase/migrations/202610150001_study_snapshots.sql`.

The table is private per user. RLS policies restrict read/write to `auth.uid()`.

## 3. Deploy the Gemini Edge Function
Install the Supabase CLI, log in, link this repository's project, then:
```sh
supabase secrets set GEMINI_API_KEY=YOUR_ROTATED_GEMINI_KEY
supabase functions deploy agent
```
Keep JWT verification enabled. The website's signed-in session will send the bearer token. Do not commit the Gemini key or paste it into chat/GitHub.

## 4. Configure the static website
In `index.html`, set:
- `SUPABASE_URL` to your project URL
- `SUPABASE_ANON_KEY` to your publishable/anon key
- `API_BASE_URL` to `https://YOUR-PROJECT-REF.supabase.co/functions/v1/agent`

Then commit and wait for GitHub Pages to deploy.

## Notes
- Supabase is not Cloudflare; this project uses Supabase for both database storage and the server-side Gemini proxy.
- The anon key is intended for browser use only when RLS is correctly enabled. Never expose the service-role key.
- Supabase email auth must be enabled and the GitHub Pages URL allowed in Auth → URL Configuration.
- Rotate the Gemini key that was previously pasted into chat before configuring the function secret.
