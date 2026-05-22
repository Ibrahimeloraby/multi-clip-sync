# LoyaltyOne — Pricing & Monetisation Roadmap

---

## Overview

LoyaltyOne uses a freemium model targeting UAE consumers with a premium subscription tier, supplemented by affiliate commissions and a future B2B white-label offering.

**Target**: Reach AED 1M ARR within 18 months of launch.

---

## Free Tier

Available to all users with no credit card required.

| Feature | Free |
|---|---|
| Loyalty programs tracked | Up to 3 |
| AI recommendations | 5 per month |
| Merchant rule contributions | 5 per month |
| Expiry alerts | 30-day alerts only |
| Screenshot balance scanning | 2 per month |
| Email forwarding | 1 email address |
| Monthly spend optimiser | Not included |
| Redemption advisor | Not included |
| Priority community badge | Not included |
| CSV export | Not included |

**Rationale**: Free tier is generous enough to demonstrate clear value (wallet consolidation + one recommendation use case) but leaves premium users wanting more AI, more programs, and earlier expiry warnings.

---

## Premium Tier

### AED 49 / month  |  AED 449 / year (save 23%)

| Feature | Premium |
|---|---|
| Loyalty programs tracked | Unlimited |
| AI recommendations | Unlimited |
| Merchant rule contributions | Unlimited |
| Expiry alerts | 1d / 7d / 14d / 30d alerts |
| Screenshot balance scanning | Unlimited |
| Email forwarding | 3 email addresses |
| Monthly spend optimiser | Monthly report (AI-generated) |
| Redemption advisor | On-demand |
| Community badge + reputation boost | +10 reputation points/month |
| Priority rule verification | Rules reviewed within 24h |
| CSV/PDF export of wallet + history | Included |
| Early access to new features | Included |
| Ad-free experience | Included |

### Pricing Psychology Notes

- **AED 49/month** anchors at "about the cost of one coffee a week" — easy UAE mental model
- **AED 449/year** creates urgency (save AED 139 vs. monthly) and improves LTV
- Annual subscribers should receive a "Golden Member" badge (status signalling)
- Show value ROI on upgrade screen: "Users who upgrade save an average of AED 380/month in loyalty value"
- Free trial: 14-day full-premium trial on signup (no credit card), then prompt to convert

---

## Affiliate & Commission Revenue

Affiliate commissions from partner programs supplement subscription revenue.

| Partner Type | Commission Model | Estimated CPA |
|---|---|---|
| Bank credit cards (ADCB, FAB, ENBD) | CPA per approved card application | AED 800–1,500 |
| The Entertainer subscription | Revenue share | 25–30% (~AED 100–240) |
| Privilee membership | CPA per subscription | AED 150–200 |
| Accor Plus (dining subscription) | Revenue share | 20% (~AED 80) |
| Hotel bookings (Marriott, Hilton) | Booking.com / Booking.com for Business affiliate | 3–5% of booking |

**Year 1 affiliate target**: AED 200K (conservative, before bank partnerships close)
**Year 2 affiliate target**: AED 600K (with 2–3 bank card referral deals active)

### Affiliate Attribution

- Deep-link tracking using UTM parameters + Supabase `referral_events` table
- 30-day attribution window
- Disclosed clearly to users ("We may earn a commission if you apply")

---

## B2B White-Label Opportunity

**Target customers**: UAE fintech apps, neobanks, super-apps (e.g., Careem Pay, YAP, Wio, Zand)

**Offering**: LoyaltyOne SDK / API that powers:
- Loyalty wallet consolidation within partner's existing app
- AI recommendation engine branded to partner
- Community rule database (white-labelled, curated subset)

**Pricing**:
- Setup fee: AED 50,000–150,000 (one-time)
- Monthly licence: AED 10,000–40,000/month depending on MAU
- Per-API-call pricing for AI recommendations: AED 0.50–2.00 per recommendation

**Target launch**: Month 18 (once product is stable and data quality is high)
**First target customer**: A UAE neobank with 100K+ users and no existing loyalty aggregation feature

---

## Monetisation Timeline

### Months 1–3: Acquire Users
- Free tier only
- Focus: 10,000 registered users, 2,000 MAU
- Revenue: AED 0 (intentional — build trust, data quality)

### Months 4–6: Launch Premium
- Introduce AED 49/month subscription
- Conversion target: 5% of MAU = ~100 subscribers
- Monthly revenue: AED 4,900
- Activate first affiliate deal (The Entertainer)

### Months 7–12: Scale
- Grow to 10,000 MAU, 500 premium subscribers
- Close 2 bank card referral deals
- Monthly subscription revenue: AED 24,500
- Monthly affiliate revenue: AED 15,000+
- **Monthly total**: ~AED 40,000 (~AED 480K ARR run rate)

### Months 13–18: B2B + Partnerships
- Close first white-label deal: +AED 15,000/month
- 1,500 premium subscribers: AED 73,500/month subscriptions
- Affiliate: AED 50,000/month
- **Monthly total**: ~AED 140,000 (~AED 1.7M ARR)

---

## Free Tier Enforcement Notes

### Implementation

Premium gates are enforced server-side via Supabase:
1. `profiles.subscription_status` column: `'free' | 'premium' | 'premium_annual'`
2. RLS policy blocks creating >3 `user_programs` rows if `subscription_status = 'free'`
3. Edge function `get-recommendation` checks monthly usage count via `recommendation_usage` table
4. Screenshot scan limit: checked in `parse-screenshot` edge function

### Graceful Degradation

When a free user hits a limit:
- Show upgrade modal with value proposition
- Do NOT block navigation — show inline "Premium required" with upgrade CTA
- Track upgrade modal impressions in PostHog to optimise conversion

---

## Competitive Positioning

| Product | Price | Coverage |
|---|---|---|
| LoyaltyOne | AED 49/month | 18 UAE programs, AI recs, community rules |
| RewardPay (UK) | £9.99/month | UK programs only; no community data |
| AwardWallet | $30/year | 500+ global programs; no AI; no UAE focus |
| Manual tracking (spreadsheet) | Free | No AI, no alerts, no recommendations |

**Differentiators**:
1. UAE-first (Arabic RTL support, AED currency, UAE merchant data)
2. Community-contributed rules = better coverage than any official API
3. AI-powered recommendations (not just balance display)
4. Email forwarding auto-sync (unique in the region)
