# The Draft League

A private 18-manager fantasy Premier League draft game. The frontend is designed for Vercel and uses Supabase for authentication and data storage.

## Run locally

1. Copy `.env.example` to `.env.local` and add your Supabase project values.
2. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.
3. Install dependencies with `pnpm install`, then run `pnpm dev`.

## Deploy

Push this repository to GitHub, import it in Vercel, and add the same environment variables. The `/api/fpl/bootstrap` endpoint proxies official FPL data server-side; browser CORS is never involved. Configure a Vercel Cron or an external scheduler to call `/api/admin/sync` after each gameweek (with a protected secret added before production).

## Scoring

Scoring is deliberately stored in the `scoring_rules` table rather than copied from FPL. Update the active rules in Supabase to change calculations; `POST /api/admin/score-gameweek` snapshots the FPL live-event statistics into weekly team scores. Weekly snapshots preserve historical results.
