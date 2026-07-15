# Ellipsis Loyalty Engine — Master Spec (Cafe One vertical)

> **STATUS: DRAFT SCAFFOLD.** Generated from the repo's `CLAUDE.md`. This is a
> placeholder skeleton, **not** the authoritative master spec. Replace / expand
> each part with the real content. Section numbers (Part 4.3, Part 8.1, Part 8.2)
> mirror the references in `CLAUDE.md` so that once the real spec lands, existing
> pointers still resolve. Anything marked `TODO` is not yet decided in `CLAUDE.md`
> and must not be invented.

---

## Part 1 — Overview

Cafe One is the first vertical built on the **Ellipsis Loyalty Engine**, itself a fork
of the **Orenda platform template**. The engine is multi-tenant, rules-based in v0, and
upgradeable to agentic per-tenant in v1 without a rewrite.

TODO: engine positioning, relationship between Ellipsis / Orenda / Cafe One.

## Part 2 — v0 vs v1 capabilities

### v0 (ship first — non-agentic)
- Rules-based loyalty. **Zero LLM calls in the customer-facing path.**
- Two-QR earning (join once / earn every visit).
- Points, tiers, rewards, comms — all tenant-scoped, all RLS.

### v1 (later — agentic)
- Per-tenant `intelligence_level` config flip: `rules → assisted → agentic`.
- **Same codebase**, never a rewrite.
- Gated: only after **3+ paying cafes and 90+ days of data** (see Part 8.2).

TODO: capability matrix per level.

## Part 3 — Architecture conventions (identical across all Orenda forks)

Violating any of these is a bug:

- Every DB write goes through `audit_log` (backend-only inserts).
- Policies & criteria are **DATA** in tables, never code branches.
- Multi-tenant with RLS via `auth_tenant_id()` on **every** table.
- External services live behind adapter Protocol interfaces in `/integrations/` —
  no vendor logic in core.
- No vertical-specific logic in the core agent loop.

### Stack (inherited from template at fork time)
- Supabase (Postgres + RLS + Auth)
- Next.js 15 / TS / Tailwind / shadcn (web)
- FastAPI / Python 3.11 (api)
- **Own** Supabase project (do NOT reuse the Orenda template project).

## Part 4 — Data model

### Part 4.3 — v0 core tables (all tenant-scoped, all RLS)

- `customers`
- `loyalty_accounts`
- `points_ledger`
- `transactions`
- `tiers` — points-based: **Bronze 0+ / Silver 250+ / Gold 600+**
- `rewards_catalog`
- `comms_log`

TODO: full column definitions, FKs, RLS policy text, indexes, audit_log schema.

## Part 5 — Integrations / adapters

Phase 4 adapters needed for Cafe One (behind `/integrations/` Protocol interfaces):

1. Twilio (WhatsApp / SMS)
2. Postmark (email)
3. **Foodics (POS) — MVP-critical**
4. Wallet pass generation (Apple `.pkpass` / Google JWT)

TODO: adapter interface signatures, credentials/config, sandbox vs prod.

## Part 6 — Build sequence (this repo)

1. Fork the Orenda scaffold once template Phases 1–3 are verified (see Orenda repo).
2. Phase 4 adapters (see Part 5).
3. **Phase 6a:** Loyalty v0 rules-based — build prompt in Part 8.1.
4. **Phase 6b** (only after 3+ paying cafes, 90+ days data): agentic layer — Part 8.2.

## Part 7 — Go-to-market

- Network-first, honest **"founding cafes"** framing.
- Free 1-month pilot → AED 2,000/month per cafe (founding price locked).
- Never emit fictional network stats (demo data ≠ real).

TODO: target cafe list, outreach motion, pilot → paid conversion plan.

## Part 8 — Build prompts

### Part 8.1 — Phase 6a: Loyalty v0 (rules-based)

> TODO: paste the authoritative Phase 6a build prompt here.
>
> Constraints already locked (from `CLAUDE.md`):
> - Non-agentic; zero LLM calls in the customer-facing path.
> - Two-QR earning mechanic.
> - Points-based tiers (Bronze 0+ / Silver 250+ / Gold 600+).
> - Policies/criteria as data, not code branches.
> - Every write through `audit_log`; RLS via `auth_tenant_id()` everywhere.
> - No customer/cafe-facing "AI / agentic / LLM / ML" language — use "smart automation."

### Part 8.2 — Phase 6b: agentic layer

> TODO: paste the authoritative Phase 6b build prompt here.
>
> Gate: only start after **3+ paying cafes** and **90+ days of data**.
> Implemented as the `intelligence_level` flip on the same codebase — never a rewrite.

## References

- `docs/Cafe_One_Context_Brief.md` — decisions to date (authoritative once filled).
- `CLAUDE.md` — repo conventions and locked decisions (source for this scaffold).
