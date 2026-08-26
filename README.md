# Community Care Quiz — Render + Supabase

## 1. Create the Supabase table
Open **Supabase → SQL Editor → New query**, copy all code from `schema.sql`, then click **Run**.

## 2. Add environment variables in Render
In your Render Web Service → **Environment**, add:

- `SUPABASE_URL` = your Supabase Project URL
- `SUPABASE_SECRET_KEY` = your Supabase server secret key
- `ADMIN_PASSWORD` = your chosen admin password

Do not put the secret key in any file inside `public/`.

## 3. Deploy on Render
- Build Command: `npm install`
- Start Command: `npm start`

## Pages
- `/` Quiz
- `/scores` Public Scores
- `/admin` Admin Scores
- `/api/health` API health check

No Render persistent disk or `DATA_DIR` is required. Scores are stored in Supabase.
