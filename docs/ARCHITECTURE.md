# LoyaltyOne — System Architecture

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LoyaltyOne Architecture                               │
│                                                                               │
│  ┌──────────────────┐   HTTPS/WS   ┌──────────────────────────────────────┐ │
│  │   React 18 PWA   │◀────────────▶│           Supabase Cloud             │ │
│  │   (Vercel CDN)   │              │                                      │ │
│  │                  │              │  ┌────────────┐  ┌────────────────┐  │ │
│  │  Tailwind CSS    │              │  │ PostgREST  │  │  Auth (GoTrue) │  │ │
│  │  shadcn/ui       │              │  │  REST API  │  │  Email/OTP/    │  │ │
│  │  RTL support     │              │  │  + RLS     │  │  Google/Apple  │  │ │
│  │                  │              │  └────────────┘  └────────────────┘  │ │
│  │  Mapbox GL       │              │                                      │ │
│  │  Firebase FCM    │              │  ┌────────────┐  ┌────────────────┐  │ │
│  │  PostHog         │              │  │  Storage   │  │  Edge Fns (V8) │  │ │
│  └─────────┬────────┘              │  │  (avatars, │  │  Deno runtime  │  │ │
│            │                       │  │   evidence)│  │                │  │ │
│            │ supabase.functions    │  └────────────┘  └───────┬────────┘  │ │
│            └──────────────────────▶│                          │            │ │
│                                    └──────────────────────────┼────────────┘ │
│                                                               │               │
│  ┌─────────────────────────────────┐              ┌──────────▼────────────┐  │
│  │      Railway Workers            │              │   Anthropic Claude    │  │
│  │                                 │              │   API                 │  │
│  │  ┌─────────────────────────┐    │              │                       │  │
│  │  │ email-inbound (HTTP)    │    │              │  claude-sonnet-4-7    │  │
│  │  │ Port 3001               │    │              │  (recommendations,    │  │
│  │  └─────────────────────────┘    │              │   screenshot parse)   │  │
│  │  ┌─────────────────────────┐    │              │                       │  │
│  │  │ geofence-prompts (HTTP) │    │              │  claude-haiku-4-5-    │  │
│  │  │ Port 3002               │    │              │  20251001             │  │
│  │  └─────────────────────────┘    │              │  (email parse,        │  │
│  │  ┌─────────────────────────┐    │              │   rule validation)    │  │
│  │  │ expiry-check (cron)     │    │              └───────────────────────┘  │
│  │  │ 06:00 UTC daily         │    │                                         │
│  │  └─────────────────────────┘    │  ┌───────────────────────────────────┐  │
│  │  ┌─────────────────────────┐    │  │   External Services               │  │
│  │  │ confidence-recompute    │    │  │                                   │  │
│  │  │ (cron) 03:00 UTC daily  │    │  │  Postmark (inbound email)         │  │
│  │  └─────────────────────────┘    │  │  Resend/SMTP (outbound email)     │  │
│  │  ┌─────────────────────────┐    │  │  Firebase FCM (push)              │  │
│  │  │ monthly-rewards (cron)  │    │  │  Mapbox (maps + geocoding)        │  │
│  │  │ 02:00 UTC 1st of month  │    │  │  PostHog (analytics)              │  │
│  │  └─────────────────────────┘    │  └───────────────────────────────────┘  │
│  │  ┌─────────────────────────┐    │                                         │
│  │  │ admin-digest (cron)     │    │                                         │
│  │  │ 07:00 UTC daily         │    │                                         │
│  │  └─────────────────────────┘    │                                         │
│  └─────────────────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Key Tables)

```
programs          merchants         merchant_rules
────────────      ─────────────     ──────────────────
id (uuid PK)      id (uuid PK)      id (uuid PK)
slug (unique)     slug (unique)     merchant_id → merchants
display_name_en   display_name_en   program_id  → programs
display_name_ar   display_name_ar   rule_type
category          category[]        earn_rate / multiplier
default_earn_rate is_verified       discount_pct / cashback_pct
expiry_rule       location_data     confidence_score (0-100)
transfer_partners                   status (pending/provisional/
                                           verified/trusted/
user_programs     rule_confirmations       disputed/expired)
─────────────     ─────────────────  source (official/community)
id (uuid PK)      id (uuid PK)      upvotes / confirmations / disputes
user_id → auth    rule_id →         verified_by_user_id
program_id →       merchant_rules   evidence_attachments[]
current_balance   user_id → auth    admin_notes
tier_name         confirmation_type
expiry_dates[]    evidence_url
tracking_method
                  reputation_events  expiring_alerts
users (profile)   ─────────────────  ──────────────
────────────      id (uuid PK)       id (uuid PK)
id → auth.users   user_id → auth     user_id → auth
display_name      event_type         user_program_id →
preferred_lang    points_delta         user_programs
reputation_score  reference_id       alert_level (1d/7d/14d/30d)
reputation_tier   notes              amount / expires_at
                                     estimated_value_aed
prompt_templates  admin_review_queue
─────────────     ──────────────────
template_key      rule_id →
system_prompt      merchant_rules
user_prompt_tmpl  queued_at
version           priority / status
is_active         reviewer_id
                  resolution_notes
```

---

## Data Flow: Recommendation Request

```
User taps "Recommend" at merchant
          │
          ▼
Frontend: useRecommendation() hook
  ├─ Reads user wallet from user_programs (local cache via React Query)
  ├─ Fetches merchant rules from merchant_rules where status IN ('verified','trusted')
  └─ POSTs to supabase.functions.invoke('get-recommendation')
          │
          ▼
Edge Function: get-recommendation/index.ts
  ├─ Validates JWT (Supabase auto-injects)
  ├─ Enriches payload: fetches program details + user goals
  ├─ Renders TEMPLATE_RECOMMENDATION prompt with Handlebars-style substitution
  ├─ Calls anthropic.messages.create({
  │     model: "claude-sonnet-4-7",
  │     system: [system prompt],
  │     user: [rendered prompt with merchant/wallet/rules data]
  │   })
  ├─ Parses JSON response
  └─ Returns { primary, alternatives, expiry_warning, tip }
          │
          ▼
Frontend displays recommendation card with:
  - Primary card/program to use
  - Estimated AED value earned
  - Points breakdown
  - Alternative options
  - Expiry warning if any
```

---

## Data Flow: Email Parsing Pipeline

```
User sets up email forwarding to u-{shortId}@inbox.loyaltyone.ae
          │
Loyalty program sends statement/transaction email
          │
          ▼
Postmark receives inbound email
  └─ Calls webhook: POST https://email-inbound.railway.app/webhook
          │
          ▼
email-inbound worker:
  ├─ Validates x-postmark-token header
  ├─ Returns HTTP 200 immediately (avoid Postmark retries)
  ├─ Extracts shortId from TO address
  ├─ resolveUserFromShortId(shortId) → queries users table
  ├─ parseEmailWithClaude(subject, text, html, from)
  │     └─ claude-haiku: extracts program_slug, points_amount,
  │                      balance_after, expiry_date, merchant
  ├─ Stores in inbound_emails (parsing_status: success/failed/unknown_program)
  └─ If success + balance_after: updateUserProgramBalance()
          │
          ▼
user_programs.current_balance updated
user_programs.expiry_dates[] merged with new tranche
user_programs.tracking_method = 'email_forward'
          │
          ▼
Next time user opens app: balance shown is up-to-date
```

---

## Data Flow: Confidence Score Update

```
New rule confirmation submitted by user
          │
          ▼
Frontend: POST to merchant_rules (insert rule_confirmations row via RLS)
          │
          ▼
Edge Function: compute-confidence/index.ts
  ├─ Receives rule_id
  ├─ Fetches rule from merchant_rules
  ├─ Fetches all rule_confirmations for this rule
  ├─ Computes score:
  │     base = 0
  │     +min(confirmations × 8, 40)
  │     +20 if any evidence has "receipt"
  │     +10 if any evidence has "screenshot"
  │     +tierBonus[submitterTier]
  │     +30 if adminVerified
  │     -disputes × 12
  │     -daysSinceLastConfirmation × 0.15
  │     -25 if conflictsWithHigherConfidence
  │     = max(0, round(score))
  ├─ Determines new status from score + dispute state
  └─ Updates merchant_rules.confidence_score + status
          │
          ▼
Rule appears with updated badge in UI:
  pending (grey) → provisional (yellow) → verified (blue) → trusted (green)
```

---

## Confidence-Recompute Worker (Nightly)

```
confidence-recompute worker runs at 03:00 UTC
          │
          ▼
Fetches all active merchant_rules (status != 'expired')
  For each rule:
  ├─ Fetches confirmations count + disputes count
  ├─ Computes new score using shared formula
  ├─ Updates confidence_score + status
  ├─ If score < 30 AND rule is 30+ days old → status = 'expired'
  └─ If score >= 60 AND no confirmation in 180 days → status = 'provisional'
          │
          ▼
Logs summary: {total, updated, expired, downgraded}
```

---

## Geofencing Flow

```
User opens app with location permission granted
          │
Frontend: useGeolocation() hook gets {lat, lng}
          │
          ▼
POST https://geofence-prompts.railway.app/location
  { user_id, lat, lng }
          │
          ▼
geofence-prompts worker:
  ├─ Fetches merchants with location_data.branches[]
  ├─ For each branch: haversineDistance(userLat, userLng, branchLat, branchLng)
  ├─ Filters to branches within 200m
  ├─ Finds rules needing verification at those merchants
  │     (status='provisional', low confirmations)
  ├─ Checks rate limit: max 2 prompts/day/user (Redis or DB counter)
  └─ Sends FCM push notification:
       "You're near [Merchant]. Confirm their loyalty rule →"
          │
          ▼
User taps notification → deep-link to rule confirmation screen
```

---

## Security Model

### Row Level Security (RLS)
All Supabase tables have RLS enabled. Key policies:

- `programs`, `merchants`, `merchant_rules` (trusted/verified): **public read**
- `merchant_rules` (pending/provisional): **read by all, write by auth users only**
- `user_programs`, `expiring_alerts`: **owner only** (user_id = auth.uid())
- `rule_confirmations`: **auth users can insert; read own + see counts**
- `admin_review_queue`: **service_role only** (workers and edge functions)
- `inbound_emails`: **owner only**

### API Keys
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key): safe to expose in frontend bundle — RLS enforces access
- `SUPABASE_SERVICE_ROLE_KEY`: bypasses RLS — used only in Railway workers and edge functions (server-side)
- `ANTHROPIC_API_KEY`: server-side only (edge functions + workers)

### Webhook Authentication
- Postmark: `x-postmark-token` header compared with `POSTMARK_WEBHOOK_TOKEN` using constant-time comparison
- FCM: server key used only in geofence worker (never in frontend)

---

## Performance Characteristics

| Operation | Typical Latency | Notes |
|---|---|---|
| Load wallet (cached) | <50ms | React Query cache, Supabase RLS query |
| Get recommendation | 1.5–3s | Claude Sonnet API call |
| Parse email (Haiku) | 0.5–1s | Claude Haiku is fast + cheap |
| Parse screenshot (Sonnet) | 2–4s | Vision model, larger payload |
| Confidence recompute (all rules) | 30–60s | Batch, runs nightly |
| Expiry check (all users) | 10–30s | Batch, runs daily |

---

## Scaling Notes

- **Supabase**: free tier supports ~500 concurrent connections; upgrade to Pro for production (50k MAU, 8GB DB)
- **Edge Functions**: auto-scale; each invocation is stateless
- **Railway workers**: single-instance per service; cron jobs are idempotent (use `ON CONFLICT DO NOTHING`)
- **Claude API**: rate limits — Haiku is 5x cheaper and 3x faster than Sonnet; use Haiku for high-volume parsing
- **Mapbox**: geocoding API has a free tier of 100k requests/month; cache merchant coordinates in DB (already done)
