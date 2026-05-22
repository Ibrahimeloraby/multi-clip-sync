# LoyaltyOne — Admin Moderation Playbook

---

## Overview

LoyaltyOne's merchant rule database is community-contributed. This playbook guides admins through the daily review process, acceptance criteria, detecting bad actors, and escalation procedures.

The moderation queue is at: `https://loyaltyone.ae/admin/review-queue` (requires admin role in Supabase).

---

## 1. Daily Review Checklist

Complete these steps each morning (suggested: 09:00 GST):

### 1.1 Check the Admin Digest Email
- Receive at `admin@loyaltyone.ae` from `notifications@loyaltyone.ae`
- Review: pending queue count, rules by status, new users (7-day), disputed rules
- If `pending_count > 50`: prioritise high-confidence-score items first

### 1.2 Process the Admin Review Queue

In the Supabase dashboard or admin panel, query:
```sql
SELECT r.id, r.rule_type, r.earn_rate, r.multiplier, r.discount_pct,
       r.confidence_score, r.source,
       m.display_name_en AS merchant,
       p.display_name_en AS program,
       q.admin_review_reason,
       q.queued_at
FROM admin_review_queue q
JOIN merchant_rules r ON r.id = q.rule_id
JOIN merchants m ON m.id = r.merchant_id
JOIN programs p ON p.id = r.program_id
WHERE q.status = 'pending'
ORDER BY q.queued_at ASC;
```

For each item: Apply the **Rule Acceptance Criteria** below, then mark as:
- `approved`: update rule status to `verified` or `trusted`
- `rejected`: update rule status to `disputed` and add `admin_notes`
- `needs_info`: add admin_notes requesting evidence; leave pending 7 days

### 1.3 Review Disputed Rules
Rules that users have flagged as incorrect:
```sql
SELECT r.id, r.description_text, r.confidence_score,
       COUNT(c.id) FILTER (WHERE c.confirmation_type = 'dispute') AS disputes,
       COUNT(c.id) FILTER (WHERE c.confirmation_type = 'confirm') AS confirms
FROM merchant_rules r
JOIN rule_confirmations c ON c.rule_id = r.id
WHERE r.status = 'disputed'
GROUP BY r.id
HAVING COUNT(c.id) FILTER (WHERE c.confirmation_type = 'dispute') >= 2;
```

If `disputes >= 3 AND disputes > confirms`: mark rule `expired` and notify original submitter.

### 1.4 Spot-Check High-Confidence Rules
Weekly (pick a random sample of 10 `trusted` status rules):
- Verify against official program website or app
- If incorrect: reduce confidence score, add admin note, consider downgrading to `provisional`

---

## 2. Rule Acceptance Criteria

### Auto-Approve (no manual review needed)
A rule submitted by Claude's `validate-rule` function with `auto_approve: true`:
- `plausibility_score >= 80`
- No conflict with existing higher-confidence rules
- Submitter tier: `trusted`, `expert`, or `maven`
- Rule type is standard (earn/multiplier, not bogo/discount on premium goods)

### Manual Review Required — Accept If:
- `plausibility_score 60–79` AND submitter has at least `contributor` tier
- Earn rate is 2x–5x (elevated but plausible) AND evidence attachment provided
- New program×merchant combination with no existing rules (first submitter gets extra scrutiny)
- Discount rule (check for: is this a card-holder discount, a promotional offer, or a permanent benefit?)

### Manual Review Required — Reject If:
- `plausibility_score < 40`
- Earn rate is >10x for a non-official source
- Cashback rate is >15% (virtually impossible for general spend)
- Rule conflicts directly with a `trusted` or `official` source rule AND no supporting evidence
- Submitter has previous rejected submissions AND low reputation score
- Same submitter submitting many rules in one session (possible gaming — see Section 4)

### Evidence Quality Guide
| Evidence Type | Weight | Notes |
|---|---|---|
| Receipt photo | High (+20 confidence) | Must show merchant name, date, amount, and program earn |
| App screenshot | Medium (+10 confidence) | Must show program name, points earned, merchant |
| Bank statement | High (+15 confidence) | Redacted statement showing earn event |
| News/blog link | Low (+5 confidence) | Official blog only; not user forums |
| No evidence | Zero | Counts only on submitter reputation |

---

## 3. Anti-Gaming Patterns

### Pattern 1: Fake Confirmations (Sybil Attack)
**Signals**:
- Multiple accounts confirming the same rule within a short time window
- New accounts (created within 7 days) confirming obscure rules
- IP clustering (if IP logging is available)

**Response**:
- Do not award reputation points if confirmation comes from account <7 days old on disputed rules
- Flag for manual review if 5+ confirmations on a rule submitted <24h ago by newcomer
- Run query: `SELECT user_id, COUNT(*) FROM rule_confirmations WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY user_id HAVING COUNT(*) > 10`

### Pattern 2: Competitor Rule Suppression
**Signals**:
- Batch of disputes targeting one program's rules (e.g., all ADCB rules disputed by same user)
- Disputes filed with no evidence and boilerplate reason text
- Disputer has history of disputing only one program

**Response**:
- Require evidence for disputes on rules with `confidence_score > 70`
- Deduct reputation for frivolous disputes (disputes that get overturned)
- Block users who file >10 unsubstantiated disputes in 30 days

### Pattern 3: Reputation Farming
**Signals**:
- User submitting very old or already-known rules to gain reputation points
- Submitting rules for obscure merchants/programs that cannot be verified
- Submitting rules with inflated earn rates then quickly "correcting" them to earn both submission + confirmation points

**Response**:
- Reputation events for submissions are only awarded after rule reaches `provisional` status (24h+ old)
- Implement a cooldown: max 10 reputation-earning actions per day per user
- Review reputation_events if a user jumps more than 200 points in a week

### Pattern 4: Merchant Competitor Gaming
**Signals**:
- Rules submitted for a competitor's merchant with 0% earn rate or misleading BOGO terms
- Rules that would steer users away from a merchant with no supporting evidence

**Response**:
- Rules with `earn_rate: 0` and `rule_type: 'earn'` should always go to manual review
- Treat any negative/misleading rule with extra scrutiny regardless of submitter tier

---

## 4. Escalation Process

### Level 1: Routine (Admin handles daily)
- Single disputed rule
- Single account flagged for gaming
- Rule with missing evidence

### Level 2: Elevated (Escalate to founder/CTO)
- Coordinated attack: 5+ accounts targeting same merchant/program
- A data breach or unauthorized access to the admin review queue
- A request from a loyalty program to remove or modify data (contact legal@loyaltyone.ae)
- A media inquiry about data accuracy

### Level 3: Legal/Critical (Engage legal counsel same day)
- Legal threat or cease-and-desist from a loyalty program or merchant
- Law enforcement request for user data
- A security incident involving user PII
- Any request relating to the PDPL from the UAE TDRA

---

## 5. Communication Templates

### Accepting a Rule (in-app notification)
> "Your rule for [Program] at [Merchant] has been verified by the LoyaltyOne team. You've earned +15 reputation points. Thank you for contributing!"

### Rejecting a Rule
> "Your submitted rule for [Program] at [Merchant] was not accepted. Reason: [admin_notes]. Your reputation score has not been affected for this submission. You're welcome to resubmit with supporting evidence."

### Requesting Evidence
> "Your rule for [Program] at [Merchant] is under review. To help us verify it, please attach a receipt, screenshot, or statement showing this earn rate. You have 7 days to provide evidence, after which the rule will be declined."

### Warning for Frivolous Disputes
> "Your dispute of [Rule] was reviewed and found to be unsubstantiated. Repeated unfounded disputes may affect your community standing."

---

## 6. Admin SQL Quick Reference

```sql
-- Daily queue count
SELECT COUNT(*) FROM admin_review_queue WHERE status = 'pending';

-- Rules by status
SELECT status, COUNT(*) FROM merchant_rules GROUP BY status ORDER BY 2 DESC;

-- Most-disputed rules this week
SELECT r.id, m.display_name_en, p.display_name_en, r.confidence_score,
       COUNT(c.id) AS disputes
FROM merchant_rules r
JOIN rule_confirmations c ON c.rule_id = r.id AND c.confirmation_type = 'dispute'
JOIN merchants m ON m.id = r.merchant_id
JOIN programs p ON p.id = r.program_id
WHERE c.created_at > NOW() - INTERVAL '7 days'
GROUP BY r.id, m.display_name_en, p.display_name_en, r.confidence_score
ORDER BY disputes DESC LIMIT 20;

-- Users with highest reputation changes this week
SELECT user_id, SUM(points_delta) AS weekly_gain
FROM reputation_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY weekly_gain DESC LIMIT 20;

-- Approve a rule
UPDATE merchant_rules SET status = 'verified', confidence_score = 70
WHERE id = '[RULE_UUID]';
UPDATE admin_review_queue SET status = 'approved', resolved_at = NOW()
WHERE rule_id = '[RULE_UUID]';

-- Reject a rule
UPDATE merchant_rules SET status = 'disputed',
  admin_notes = 'Rejected: earn rate implausible; no evidence provided'
WHERE id = '[RULE_UUID]';
UPDATE admin_review_queue SET status = 'rejected', resolved_at = NOW(),
  resolution_notes = 'Implausible earn rate'
WHERE rule_id = '[RULE_UUID]';
```
