# Production readiness

AI Stack Engine is a content-operations dashboard. GitHub is the source of truth for application code. The existing external Supabase project is the source of truth for data.

Do not provision a Lovable Cloud database. Do not replace the production Supabase project.

## Required frontend environment variables

Set these in the deployment environment, then rebuild. Vite inlines `VITE_*` at build time.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server fallbacks used by SSR if Vite values are absent:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Use the existing production project URL and its **publishable/anon** key only.

Never set a service-role key, `sb_secret_` key, or OAuth secret as a `VITE_*` variable.

## Architecture

- React + TanStack Start + Vite
- Browser talks to the existing Supabase project with the publishable key
- Row-level security and RPCs remain the backend enforcement
- Private media uses the `media` bucket and signed URLs

## Current supported workflow

draft → processing → ready_for_review → approved → scheduled → published

Rejection and failure are terminal until an operator retries or edits.

Frontend rules that complement RPCs:

- operators cannot manually set `published`
- `not_allowed` sources cannot be saved onto content or scheduled
- at least one platform must be selected before save
- only selected platforms can be scheduled
- cancel applies to `scheduled` and `waiting` jobs
- retry applies to `failed` jobs
- cancelled jobs have no actions

## Currently disconnected platforms

YouTube Shorts and TikTok are **not connected**. Scheduling creates a local publishing job only. Do not present OAuth, official APIs, OpusClip, or paid AI as live.

## Deployment requirements

1. Point the four variables above at the existing Supabase project.
2. Rebuild and republish so `VITE_*` values are inlined.
3. Add the published origin to the existing project's Auth redirect/allow list.
4. Confirm storage bucket `media` and existing RPCs remain unchanged.

If configuration is missing, `/auth` shows a configuration screen instead of crashing.

## Known limitations

- No official YouTube or TikTok publishing
- No AI clip generation
- Analytics only shows records already stored in Supabase
- Media delete can fail independently of content-row delete; the UI reports that without blocking the row delete
