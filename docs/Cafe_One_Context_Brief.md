# Cafe One — Context Brief

> **STATUS: DRAFT SCAFFOLD.** This file was generated from the decisions captured
> in the repo's `CLAUDE.md`. It is a placeholder skeleton, **not** the authoritative
> brief yet. Replace / expand each section with the real source-of-truth content.
> Anything marked `TODO` is not yet decided in `CLAUDE.md` and must not be invented.
>
> Once this file carries the real decisions, delete this banner — `CLAUDE.md`
> points to this document as authoritative.

---

## 1. What Cafe One is

A **network loyalty card for Dubai's independent cafes** — *"One card. Every cafe."*

- Customers join once (QR + phone + OTP), get a digital card in Apple/Google Wallet,
  and earn at every member cafe by showing their personal QR at checkout.
- Each cafe keeps its **own** points, tiers, rewards, and customer data.
- The network shares the **card**, not the business.

## 2. Repo posture (until fork)

This repo will become a **fork of the Orenda platform template** (a separate repo).
Until that fork happens, this repo holds **docs + planning only**. Do not scaffold an
independent architecture here — the fork brings it.

## 3. Locked decisions (do not reopen unless Ibrahim explicitly says so)

1. **v0 is non-agentic.** Rules-based, zero LLM calls in the customer-facing path.
   Agentic v1 is a later per-tenant `intelligence_level` config flip
   (rules → assisted → agentic) on the **same** codebase — never a rewrite.
2. **QR is the earning mechanic.** Two-QR model: cafe QR = join once; customer QR =
   earn every visit. Card-linked payments are "coming soon" (6–12 months of
   payment-network partnership) — never implement or describe as live.
3. **Pricing:** free 1-month pilot → **AED 2,000/month per cafe**, founding price locked.
4. **Network-first**, honest "founding cafes" framing. Never emit fictional network
   stats (47 cafes / 12,400 members = demo data only).
5. **Language rules (hard):** customer- and cafe-facing strings NEVER contain:
   *AI, agentic, LLM, machine learning*. Use **"smart automation."**

## 4. Two-QR earning model

| QR | Purpose | Frequency |
|----|---------|-----------|
| Cafe QR | Join the network | Once per customer |
| Customer QR | Earn points at checkout | Every visit |

- Onboarding: QR → phone → OTP → wallet card issued.
- Card-linked payments are **"coming soon"** only. Never live in v0.

TODO: full join flow states, wallet pass fields, edge cases.

## 5. Pricing & commercial framing

- Free **1-month** pilot per cafe.
- Then **AED 2,000/month** per cafe. Founding price is **locked**.
- Framing: honest **"founding cafes"** — no fabricated network scale.

TODO: contract terms, billing cadence, churn/renewal handling.

## 6. Language & trust rules

- No customer/cafe-facing use of *AI / agentic / LLM / machine learning*.
  Approved substitute: **"smart automation."**
- Never surface demo/fictional network stats as real
  (e.g. "47 cafes / 12,400 members" are demo data only).

## 7. Open items / TODO

- [ ] Confirm authoritative content replaces this scaffold.
- [ ] Link to the Orenda template repo (fork source).
- [ ] Onboarding flow spec (QR → phone → OTP → wallet).
- [ ] Wallet pass design (Apple `.pkpass` / Google JWT).
- [ ] Anything else Ibrahim has decided that is not yet reflected here.

## References

- `docs/Ellipsis_Loyalty_Engine_Master.md` — full vertical spec (v0/v1, data model,
  GTM, Phase 6a/6b build prompts).
- `CLAUDE.md` — repo conventions and locked decisions (source for this scaffold).
