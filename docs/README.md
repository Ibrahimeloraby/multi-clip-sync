# LoyaltyOne — UAE Loyalty Rewards Aggregator

LoyaltyOne lets UAE consumers unify all their loyalty programs into one dashboard,
get AI-powered recommendations on the best rewards+payment combination at any merchant,
and contribute/verify merchant earn rules as a community.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite PWA |
| **Styling** | Tailwind CSS + shadcn/ui, full RTL (Arabic) support |
| **Backend** | Supabase (Postgres + Auth + Storage + Edge Functions + RLS) |
| **Workers** | Railway-deployed Node.js 20 services (6 services) |
| **AI** | Anthropic Claude API (`claude-sonnet-4-7`, `claude-haiku-4-5-20251001`) |
| **Auth** | Supabase email + Google OAuth + Apple Sign-in + phone OTP |
| **Push** | Firebase Cloud Messaging (FCM) |
| **Maps** | Mapbox GL JS (geofencing, nearby merchants) |
| **Email** | Postmark inbound + Resend/SMTP outbound |
| **Analytics** | PostHog (optional) |

---

## Prerequisites

- **Node.js 20+** (use `nvm` or `fnm` to manage versions)
- **npm 10+**
- **Supabase CLI** — `npm install -g supabase`
- A **Supabase project** (free tier is fine for development)
- An **Anthropic API key** — https://console.anthropic.com
- Optional: Mapbox account, Firebase project, PostHog account

---

## Quick Start

### 1. Clone and install

```bash
git clone [repo] && cd multi-clip-sync
npm install
```

### 2. Copy environment

```bash
cp .env.example .env.local
# Edit .env.local and fill in all required values
```

At minimum, you need:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (from Supabase dashboard → Settings → API)
- `ANTHROPIC_API_KEY` (from console.anthropic.com)

### 3. Run migrations

For a remote Supabase project:
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

For local development:
```bash
npx supabase start
# Use the printed local URL and anon key in .env.local
npx supabase db reset  # applies all migrations + seed
```

### 4. Start the dev server

```bash
npm run dev
```

### 5. Access the app

Open http://localhost:8080

---

## Project Structure

```
multi-clip-sync/
├── src/
│   ├── components/
│   │   ├── common/          # Shared UI components (BalanceCard, ConfidenceBadge, etc.)
│   │   ├── layout/          # App shells (AppLayout, AdminLayout, OnboardingLayout)
│   │   └── ui/              # shadcn/ui primitives
│   ├── hooks/               # Custom React hooks (useAuth, usePrograms, useRules, etc.)
│   ├── i18n/                # Arabic/English translation strings
│   ├── integrations/
│   │   └── supabase/        # Generated Supabase types + client singleton
│   ├── lib/
│   │   ├── confidence.ts    # Confidence score formula (shared with workers)
│   │   ├── anthropic.ts     # Claude API client + prompt helpers
│   │   ├── constants.ts     # Program slugs, category lists, UAE constants
│   │   └── supabase.ts      # Supabase client (re-exported)
│   ├── pages/
│   │   ├── onboarding/      # Multi-step onboarding flow
│   │   ├── dashboard/       # Main app tabs (wallet, merchants, feed)
│   │   └── recommend/       # AI recommendation flow
│   ├── test/                # Vitest unit tests
│   └── types/               # Shared TypeScript types
├── supabase/
│   ├── functions/           # Deno edge functions
│   │   ├── get-recommendation/   # Claude-powered recommendation
│   │   ├── parse-screenshot/     # Vision-based balance extraction
│   │   ├── validate-rule/        # Rule sanity checker
│   │   └── compute-confidence/   # Confidence score updater
│   └── migrations/          # Ordered SQL migration files
├── workers/                 # Railway Node.js background workers
│   ├── email-inbound/       # Postmark webhook → Claude → balance update
│   ├── expiry-check/        # Daily: create expiring_alerts
│   ├── confidence-recompute/# Daily: recompute all rule confidence scores
│   ├── monthly-rewards/     # Monthly: top contributors get rewards
│   ├── admin-digest/        # Daily: email digest to admin
│   └── geofence-prompts/    # HTTP server: location-aware push prompts
├── docs/                    # Developer documentation
├── .github/workflows/       # CI/CD (GitHub Actions)
└── packages/shared/         # Shared types (future monorepo expansion)
```

---

## Development Workflow

### Running the frontend

```bash
npm run dev          # Start Vite dev server on :8080
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
```

### Type checking and linting

```bash
npx tsc --noEmit     # TypeScript type check
npm run lint         # ESLint
```

### Running tests

```bash
npm test             # Vitest (unit tests in src/test/)
```

### Working with Supabase Edge Functions

```bash
# Run a function locally (requires supabase start)
npx supabase functions serve parse-screenshot --env-file .env.local

# Deploy a single function
npx supabase functions deploy parse-screenshot

# Deploy all functions
npx supabase functions deploy
```

### Working with workers

Each worker is an independent Node.js process in `workers/<name>/`.

```bash
cd workers/expiry-check
npm install
npm run dev          # tsx watch mode

# Or from the repo root, run a specific worker:
npx tsx workers/expiry-check/src/index.ts
```

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Used By | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Supabase anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Workers only | Full DB access — NEVER expose to frontend |
| `ANTHROPIC_API_KEY` | Edge functions, workers | Claude API key |
| `VITE_MAPBOX_TOKEN` | Frontend | Mapbox public token |
| `FCM_SERVER_KEY` | Geofence worker | Firebase Cloud Messaging server key |
| `POSTMARK_WEBHOOK_TOKEN` | Email-inbound worker | Webhook authentication token |

---

## Key Concepts

### Loyalty Programs
18 UAE programs are seeded: airlines (Skywards, Etihad Guest), banks (ADCB, ENBD, FAB, HSBC, Mashreq), retail (Share MAF, U Emaar), telco (Smiles), entertainment (Entertainer), government (Fazaa, Esaad), fitness (Privilee), and hotels (Marriott, Hilton, Accor, IHG).

### Merchant Rules
Community-contributed earn/cashback/discount/multiplier/BOGO rules for each merchant×program pair. Rules carry a confidence score (0–100) computed from confirmations, evidence quality, submitter reputation, disputes, and time decay.

### Reputation System
Users earn reputation points by submitting rules, confirming/disputing rules, and uploading evidence. Tiers: `newcomer → contributor → trusted → expert → maven`. Higher tiers get a confidence bonus applied to their rule submissions.

### AI Recommendation Engine
The `get-recommendation` Edge Function calls Claude Sonnet with the user's wallet, goals, and merchant rules to produce a ranked recommendation with estimated AED value and reasoning.

### Confidence Score Formula
```
score = min(confirmations × 8, 40)
      + (hasReceipt ? 20 : 0)
      + (hasScreenshot ? 10 : 0)
      + tierBonus[submitterTier]   // 0/5/10/15/20
      + (adminVerified ? 30 : 0)
      - disputes × 12
      - daysSinceLastConfirmation × 0.15
      - (conflictsWithHigherConfidence ? 25 : 0)
score = max(0, round(score))
```

Status thresholds: `pending (<30)`, `provisional (30–59)`, `verified (60–84)`, `trusted (≥85)`.

---

## Adding a New Program

1. Add a row to `supabase/migrations/20260519000003_seed_programs.sql` (or write a new migration)
2. Add the slug to `src/lib/constants.ts` in `PROGRAM_SLUGS`
3. Add logo assets in `public/logos/`
4. Add translations in `src/i18n/index.ts`
5. Run `npx supabase db push` (or reset)

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feature/your-feature`
2. Make changes, add tests in `src/test/`
3. Run `npx tsc --noEmit && npm run lint && npm test`
4. Open a PR to `develop`

CI will run typecheck, lint, and build checks on every PR.
