# CLAUDE.md

Guidance for AI assistants (Claude Code, etc.) working in this repository.

## Project overview

**TimeCode** (package name `vite_react_shadcn_ts`, app id `multi-clip-sync`) is a
mobile-first PWA for **collaborative multi-angle video recording**. Multiple people
join a shared "session" (identified by a short time code), record clips from their
own cameras, and the clips are collected together so they can be played back,
sequenced, and exported as a multi-angle timeline. It also has a social feed
(likes/comments), proximity-based session discovery via GPS, and live peer-to-peer
monitoring over WebRTC.

The project was scaffolded with **Lovable** and stays connected to it: pushes to
GitHub sync back into Lovable, and Lovable edits commit to this repo. Some
generated files reflect that origin (see "Lovable conventions" below).

## Tech stack

- **Build/dev**: Vite 5 + `@vitejs/plugin-react-swc`, TypeScript 5
- **UI**: React 18, React Router 6, Tailwind CSS 3, shadcn/ui (Radix primitives)
- **State/data**: TanStack Query, Supabase JS client
- **Backend**: Supabase (Postgres + RLS, Auth, Storage, Realtime, Edge Functions)
- **PWA**: `vite-plugin-pwa` (auto-update service worker, offline caching)
- **Mobile shell**: Capacitor (iOS) — `capacitor.config.ts` points the native shell at the Lovable preview URL
- **Lint**: ESLint 9 (flat config) + typescript-eslint
- **Automation/scripts**: Playwright (browser automation), `tsx`, `pg`

## Commands

Use **npm** as the canonical package manager (CI runs `npm ci`; a `bun.lockb` also
exists but `package-lock.json` is authoritative).

```sh
npm i              # install dependencies
npm run dev        # Vite dev server on http://localhost:8080 (host "::")
npm run build      # production build to dist/
npm run build:dev  # development-mode build
npm run lint       # eslint over the repo
npm run preview    # preview the production build
```

There is **no test suite** and no configured type-check script. To type-check, run
`npx tsc --noEmit`. Always run `npm run lint` after code changes.

### Database / automation scripts

```sh
npm run db:migrate        # node scripts/run-migrations.js (needs DB connection env)
npm run db:migrate:sql    # print the combined migration SQL to stdout
npm run db:migrate:psql   # apply COMBINED_MIGRATIONS.sql via psql ($DATABASE_URL)
npm run supabase:push     # npx supabase db push (Supabase CLI)
npm run automate          # Playwright-driven automation runner (see automation/)
```

`scripts/run-migrations.ts` connects directly to Postgres using
`SUPABASE_DB_PASSWORD` (via the `pg` library) and applies an inline SQL blob.
`scripts/run-migrations.js` is the older variant. The `automation/` directory
(`supabase-automation.ts`, `lovable-automation.ts`) drives the Supabase and Lovable
dashboards headlessly with Playwright — used for CI migrations and deploy, not for
day-to-day app work.

## Architecture

### Routing — this is a 2-screen app

Routes are defined in `src/App.tsx`. Despite many files in `src/pages/`, only these
are actually routed:

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `CameraScreen` | Camera capture, session create/join, recording, share, live monitor |
| `/videos` | `LibraryScreen` | "My Videos" (sessions → clips) + social "Feed" tabs |
| `/session/:id` | `SessionView` | View a specific session |
| `/q/:code` | `QuickJoin` | Join via short code, redirects to `/?join=...` |
| `/install` | `Install` | PWA install instructions |
| `/setup` | `SetupPage` | Setup/diagnostics |
| `/feed` | → redirects to `/videos?tab=feed` | |
| `*` | `NotFound` | |

> **Legacy/unused pages**: `Index.tsx`, `FeedScreen.tsx`, `VideosScreen.tsx`,
> `CreateSession.tsx`, `JoinSession.tsx`, and `Pricing.tsx` exist in `src/pages/`
> but are **not** wired into the router. Treat them as dead code unless you are
> explicitly asked to re-introduce them; prefer editing the routed screens above.

### Directory layout

```
src/
  App.tsx                  # router + providers (QueryClient, Tooltip, Toasters, ErrorBoundary)
  main.tsx                 # entry; runs initializeDatabase() (non-blocking) then mounts <App>
  pages/                   # route screens (see routing table; some are legacy)
  components/              # feature components (PascalCase.tsx)
    ui/                    # shadcn/ui primitives — generated, avoid hand-editing
    video-editor/          # in-app video editor (trim/speed/rotate/filter/volume/angle)
  hooks/                   # useAuth, useWebRTC, useGeolocation, useDebounce, use-mobile, ...
  integrations/supabase/   # client.ts (Supabase client) + types.ts (generated DB types)
  lib/                     # constants.ts, utils.ts (cn), videoCache.ts, db-init.ts
  assets/                  # bundled images
supabase/
  config.toml              # project_id only
  migrations/              # timestamped SQL migrations + COMBINED_MIGRATIONS.sql
  functions/               # Deno edge functions (export-timeline, run-migrations)
scripts/                   # migration runners + setup-github-secrets.sh
automation/                # Playwright automation (Supabase/Lovable dashboards)
.github/workflows/         # build+migrate, browser-automation
```

### Path aliases & UI conventions

- Import via the `@` alias → `src` (configured in `vite.config.ts` and `tsconfig`).
  e.g. `import { supabase } from "@/integrations/supabase/client"`.
- UI is **shadcn/ui** (config in `components.json`, base color slate, CSS variables).
  Primitives live in `src/components/ui/` and are generated — add new ones via the
  shadcn CLI rather than authoring by hand, and avoid editing existing ones.
- Compose class names with `cn()` from `@/lib/utils` (clsx + tailwind-merge).
- **Toasts**: use `sonner` — `import { toast } from "sonner"`. (`@/hooks/use-toast`
  also exists for the Radix toast, but new code uses sonner.)
- Tailwind theme uses HSL CSS variables (`src/index.css`). Note the custom
  `library-*` color tokens (`bg-library`, `text-library-accent`, etc.) used by the
  Library screen — prefer these tokens over hard-coded colors there.
- App-wide tunables (limits, zoom/quality presets, WebRTC ICE servers, storage keys,
  error messages) live in `src/lib/constants.ts`. Reuse these instead of magic numbers.

## Backend (Supabase)

Single Supabase project, ref **`dtkfcnlxkshrflujtsaj`**.

### Auth model — anonymous-first

`CameraScreen` calls `supabase.auth.signInAnonymously()` on mount and upserts a
`profiles` row (random username + generated `device_id`). Most of the app runs as an
anonymous user; `src/hooks/useAuth.tsx` additionally supports email/password
sign-up/in. RLS policies key off `auth.uid()`, so an authenticated (even anonymous)
session is required for nearly every query.

### Data model (`public` schema)

Generated TypeScript types are in `src/integrations/supabase/types.ts` — **keep these
in sync with migrations** (regenerate from Supabase rather than editing by hand).

- **profiles** — one per user; `username` (unique), `device_id` (unique). FK to `auth.users`.
- **sessions** — `owner_id`, unique `time_code`, `mode` (`'global' | 'proximity'`),
  optional `latitude`/`longitude`, `tier` (`'free' | 'pro' | 'enterprise'`),
  `is_active`, `is_live`, `max_video_length`.
- **session_participants** — join table (`session_id`, `user_id`, `device_id`), unique per (session, user).
- **videos** — `session_id`, `user_id`, `device_id`, `storage_path`, `duration`,
  `thumbnail_url`, optional GPS, `published_to_feed`/`published_at`, `sequence_order`.
- **video_likes / video_comments** — social features (added in `20260203000001_social_features.sql`).
- **synced_sessions** — exported/stitched session records (format, watermark, duration).
- **session_limits** — per-session contributor/duration caps.
- **webrtc_signals** — signaling rows (offer/answer/ice-candidate) for live monitoring.

RLS is enabled on all tables. Typical pattern: anyone authenticated can read active
sessions; owners manage their own sessions; users insert rows where
`auth.uid() = user_id`; session owners can see all clips in their session while
participants see only their own.

### Storage

Videos are uploaded to the `videos` storage bucket at
`${userId}/${sessionId}/${timestamp}-recording.webm`. Recording uses `MediaRecorder`
preferring `video/webm;codecs=vp8,opus`. `src/lib/videoCache.ts` provides an
in-memory LRU blob cache (object URLs, 100MB / 30min) for playback.

### Edge functions (Deno)

- `supabase/functions/export-timeline` — builds an export manifest (video URLs +
  durations) for a session and records a `synced_sessions` row. Stitching is
  client-side / left to an external service; free tier forces a watermark.
- `supabase/functions/run-migrations` — runs migrations server-side.

### Live monitoring (WebRTC)

`src/hooks/useWebRTC.ts` implements mesh peer connections. Signaling goes through the
`webrtc_signals` table + Supabase Realtime (`postgres_changes`), and peer discovery
uses a Realtime **presence** channel (`live-<sessionId>`). ICE servers are public
Google STUN servers (no TURN) — connections may fail across strict NATs.

## Database migrations

Migrations live in `supabase/migrations/` as timestamped `.sql` files.
`supabase/migrations/COMBINED_MIGRATIONS.sql` is an aggregated copy used by the
`db:migrate:*` scripts and dashboard SQL editor.

On startup, `src/lib/db-init.ts` (`initializeDatabase()`, called from `main.tsx`)
probes for required tables/columns (`video_likes`, `video_comments`,
`videos.sequence_order`) and logs guidance if they're missing — it does **not** apply
migrations itself.

When adding a schema change:
1. Add a new timestamped migration in `supabase/migrations/`.
2. Mirror it into `COMBINED_MIGRATIONS.sql` (and `scripts/run-migrations.ts` if that
   inline blob needs it) so the various apply paths stay consistent.
3. Update `src/integrations/supabase/types.ts` to match.
4. Use `IF NOT EXISTS` / idempotent guards — these SQL blobs are re-run.

## Environment variables

Frontend (Vite, must be prefixed `VITE_`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (the anon/publishable key)
- `VITE_SUPABASE_PROJECT_ID`

These are committed in `.env` for this public-demo project. Tooling/CI also uses
`SUPABASE_DB_PASSWORD` (direct migrations) and `SUPABASE_EMAIL`/`SUPABASE_PASSWORD`,
`LOVABLE_EMAIL`/`LOVABLE_PASSWORD` (Playwright automation, stored as GitHub secrets;
see `.env.local.example`). `.env.local` is git-ignored.

> The Supabase URL/anon key are public-by-design (anon key + RLS). Never commit a
> service role key, `SUPABASE_DB_PASSWORD`, or any dashboard credentials.

## CI / deployment

- `.github/workflows/deploy-and-migrate.yml` — on push to `main`/`master` (and the
  setup branch): `npm ci` → `npm run build` → upload `dist/` artifact → run
  `scripts/run-migrations.ts` (best-effort, `continue-on-error`). Deployment itself
  happens via Lovable syncing from GitHub.
- `.github/workflows/browser-automation.yml` — manual (`workflow_dispatch`) Playwright
  automation for Supabase migrations / Lovable deploy.

## Lovable conventions

- `src/integrations/supabase/client.ts` and `types.ts` are marked auto-generated —
  edit `client.ts` only when changing client options; regenerate `types.ts`.
- `lovable-tagger` runs as a Vite plugin in development mode only.
- Avoid reformatting generated files (`src/components/ui/*`, Supabase types) — keep
  diffs minimal so Lovable round-trips cleanly.

## Conventions for AI assistants

- Match existing style: functional components, hooks, TypeScript, named feature
  components in `src/components/*.tsx`. Default to **no comments** unless a non-obvious
  invariant needs one.
- Reuse `src/lib/constants.ts`, the `@` alias, `cn()`, and `sonner` toasts rather than
  re-implementing.
- Don't add features/abstractions beyond the task; prefer editing routed screens over
  the legacy unused pages.
- After changes, run `npm run lint` (and `npx tsc --noEmit` for type safety). There is
  no automated UI test harness, so manually reason through (or run `npm run dev` to
  verify) camera/recording/feed flows when touching them.
- Be careful with RLS: a query that "works" for an owner may be blocked for a
  participant. Check policies in `supabase/migrations/` when debugging empty results.

## Git workflow

- Development for current tasks happens on the assigned feature branch; create it
  locally if missing and push with `git push -u origin <branch>`.
- **Never** push to `main`/`master` without explicit permission, and do not open pull
  requests unless explicitly asked.
- Use clear, descriptive commit messages (history follows
  `feat:` / `fix:` / `chore:` / `style:` conventional prefixes).
