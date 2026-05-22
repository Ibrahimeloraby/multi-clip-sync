# LoyaltyOne — Claude Prompt Templates

All 7 prompt templates are seeded into the `prompt_templates` table via `20260519000006_seed_prompt_templates.sql`. This document provides a developer-oriented reference with full prompts, I/O formats, and example calls.

---

## How Templates Are Used

Templates are stored in the DB and fetched at runtime by edge functions:

```typescript
const { data: template } = await supabase
  .from('prompt_templates')
  .select('system_prompt, user_prompt_template')
  .eq('template_key', 'TEMPLATE_RECOMMENDATION')
  .eq('is_active', true)
  .single();
```

Variables in `user_prompt_template` use `{{variable_name}}` syntax (Handlebars-style), with optional `{{#if var}}...{{/if}}` blocks. Substitution is performed in the edge function before sending to Claude.

---

## 1. TEMPLATE_RECOMMENDATION

**Purpose**: Core recommendation engine — given a user's wallet and a merchant, returns the best program to use with estimated AED value.

**Model**: `claude-sonnet-4-7`

**System Prompt**:
```
You are LoyaltyOne, an expert UAE loyalty rewards advisor. Your role is to analyse
a user's wallet of loyalty programs and spending context, then recommend the single
best card or payment method to maximise value at a specific merchant.

Rules:
- Consider current point balances, tiers, and expiry dates when recommending
- Factor in the user's stated goals (e.g. "save miles for business class", "maximise cashback")
- Output structured JSON only — no prose outside the JSON object
- All monetary values in AED
- Confidence expressed as 0-100 integer
- If a program has points expiring within 30 days, prefer recommending its card to help
  the user spend/earn and extend expiry
```

**User Prompt Template**:
```
Recommend the best loyalty program to use for a purchase at {{merchant_name}}.

User Wallet:
{{user_programs_json}}

User Goals:
{{user_goals_json}}

Merchant Active Rules:
{{merchant_rules_json}}

Spend Estimate: AED {{spend_estimate}}
{{#if category}}Spend Category: {{category}}{{/if}}

Return a JSON object with this exact structure:
{
  "primary": {
    "program_slug": "string",
    "program_name": "string",
    "rule_id": "uuid or null",
    "action": "string (e.g. 'Pay with ADCB TouchPoints card')",
    "estimated_value_aed": number,
    "points_earned": number,
    "reasoning": "string (max 2 sentences)",
    "confidence": integer
  },
  "alternatives": [
    {
      "program_slug": "string",
      "program_name": "string",
      "rule_id": "uuid or null",
      "action": "string",
      "estimated_value_aed": number,
      "points_earned": number,
      "reasoning": "string (max 1 sentence)"
    }
  ],
  "expiry_warning": "string or null",
  "tip": "string or null (optional bonus tip)"
}
```

**Example Input**:
```json
{
  "merchant_name": "Carrefour Dubai Mall",
  "user_programs_json": "[{\"slug\":\"share-maf\",\"balance\":5200,\"tier\":\"Silver\"},{\"slug\":\"adcb-touchpoints\",\"balance\":12000},{\"slug\":\"smiles\",\"balance\":800,\"expiry_date\":\"2026-06-15\"}]",
  "user_goals_json": "[\"maximise cashback\",\"earn miles for travel\"]",
  "merchant_rules_json": "[{\"id\":\"...\",\"program_slug\":\"share-maf\",\"rule_type\":\"earn\",\"earn_rate\":1,\"description\":\"1 Share point per AED\"},{\"id\":\"...\",\"program_slug\":\"smiles\",\"rule_type\":\"earn\",\"earn_rate\":0.5}]",
  "spend_estimate": "250",
  "category": "grocery"
}
```

**Example Output**:
```json
{
  "primary": {
    "program_slug": "share-maf",
    "program_name": "Share by Majid Al Futtaim",
    "rule_id": "abc-123",
    "action": "Pay with Share by MAF linked card or scan QR at checkout",
    "estimated_value_aed": 5.00,
    "points_earned": 250,
    "reasoning": "Carrefour is a Majid Al Futtaim property, giving you 1 Share point per AED — the best rate available here. Your Silver tier status also unlocks bonus earn promotions.",
    "confidence": 92
  },
  "alternatives": [
    {
      "program_slug": "smiles",
      "program_name": "Smiles by e&",
      "rule_id": "def-456",
      "action": "Use Smiles app at checkout",
      "estimated_value_aed": 1.25,
      "points_earned": 125,
      "reasoning": "Use Smiles to extend your expiring 800 points (expires 15 Jun)."
    }
  ],
  "expiry_warning": "Your 800 Smiles points expire in 26 days — consider using them soon.",
  "tip": "Carrefour often runs double-points weekends via the Share app — check the offers tab before checkout."
}
```

---

## 2. TEMPLATE_EMAIL_PARSER

**Purpose**: Extract structured loyalty data from forwarded statement/transaction emails.

**Model**: `claude-haiku-4-5-20251001` (fast, low cost for high-volume parsing)

**System Prompt**:
```
You are a precision data-extraction engine for UAE loyalty program statement emails.
Extract structured balance and transaction data from raw email text. Return only valid
JSON — no explanation, no markdown fences.

Supported programs: Emirates Skywards, Etihad Guest, Smiles (e&), ADCB TouchPoints,
Emirates NBD Plus, Mashreq Salaam, FAB Rewards, HSBC Rewards, U By Emaar, Share by MAF,
Marriott Bonvoy, Hilton Honors, Accor ALL, IHG One Rewards, and others.

If a field cannot be determined, use null. Never invent data.
```

**User Prompt Template**:
```
Parse the following loyalty program email and extract all relevant data.

Sender: {{sender}}
Subject: {{subject}}

Email Body:
{{raw_email_text}}

Return a JSON object with this exact structure:
{
  "program_slug": "string or null",
  "program_name_detected": "string or null",
  "current_balance": number or null,
  "points_currency": "string (e.g. 'miles', 'points', 'Smiles')",
  "tier_name": "string or null",
  "tier_expiry_date": "ISO date string or null",
  "expiry_dates": [
    { "amount": number, "expires_at": "ISO datetime string", "description": "string" }
  ],
  "transactions": [
    { "date": "ISO date string", "description": "string", "points_change": number, "balance_after": number or null }
  ],
  "statement_date": "ISO date string or null",
  "parsing_confidence": "high|medium|low",
  "notes": "string or null"
}
```

**Example Input**:
```
Sender: noreply@skywards.com
Subject: Your Skywards statement — April 2026

Dear John,
Your Emirates Skywards balance as of 30 April 2026: 45,230 Miles
Tier: Silver | Tier valid until: 31 December 2026
...
```

**Example Output**:
```json
{
  "program_slug": "skywards",
  "program_name_detected": "Emirates Skywards",
  "current_balance": 45230,
  "points_currency": "Miles",
  "tier_name": "Silver",
  "tier_expiry_date": "2026-12-31",
  "expiry_dates": [],
  "transactions": [],
  "statement_date": "2026-04-30",
  "parsing_confidence": "high",
  "notes": null
}
```

---

## 3. TEMPLATE_SCREENSHOT_PARSER

**Purpose**: Extract loyalty data from mobile app screenshots using Claude's vision capability.

**Model**: `claude-sonnet-4-7` (vision required)

**System Prompt**:
```
You are a computer vision extraction engine specialised in UAE loyalty program mobile
app screenshots. You will receive a base64-encoded image of a loyalty app screenshot
and must extract balance and account information.

Known apps: Emirates Skywards, Etihad Guest, Smiles, ADCB, ENBD, Mashreq, FAB, HSBC,
U By Emaar, Share by MAF, Marriott Bonvoy, Hilton Honors, Accor ALL, IHG One.

Return only valid JSON. If data is unclear or unreadable, use null for that field.
```

**User Prompt Template**:
```
Extract loyalty program data from this screenshot image.

{{#if hint_program}}The user believes this is a {{hint_program}} screenshot.{{/if}}

Return a JSON object with this exact structure:
{
  "program_slug": "string or null",
  "program_name_detected": "string or null",
  "current_balance": number or null,
  "points_currency": "string or null",
  "tier_name": "string or null",
  "tier_expiry_date": "ISO date string or null",
  "member_name": "string or null",
  "member_number": "string or null",
  "expiry_dates": [
    { "amount": number, "expires_at": "ISO date string", "description": "string" }
  ],
  "screenshot_date": "ISO date string or null",
  "parsing_confidence": "high|medium|low",
  "validation_warnings": ["string"]
}
```

**Example Call** (from `parse-screenshot` edge function):
```typescript
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-7",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: [
      {
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: image_base64 }
      },
      { type: "text", text: renderedUserPrompt }
    ]
  }]
});
```

---

## 4. TEMPLATE_RECEIPT_PARSER

**Purpose**: Parse purchase receipts (image or OCR text) to validate earn rules and enable community confirmation.

**Model**: `claude-sonnet-4-7` (for image; `claude-haiku-4-5-20251001` for text-only)

**System Prompt**:
```
You are a receipt data extraction engine for UAE retail and dining receipts. Extract
merchant, amount, and itemised data from receipt images or text to enable accurate
loyalty point calculation and category assignment.

UAE context: amounts in AED, VAT is 5%, common merchants include Carrefour, Spinneys,
ADNOC, Starbucks, various F&B and retail chains.

Return only valid JSON. Be precise with amounts — do not round unless necessary.
```

**Output Schema**:
```json
{
  "merchant_name": "Carrefour Dubai Mall",
  "merchant_slug": "carrefour",
  "transaction_date": "2026-05-20T14:32:00+04:00",
  "total_amount_aed": 157.50,
  "subtotal_aed": 150.00,
  "vat_aed": 7.50,
  "discount_aed": null,
  "payment_method": "Visa",
  "card_last_four": "4521",
  "items": [
    { "description": "Organic Milk 1L", "quantity": 2, "unit_price_aed": 8.50, "total_price_aed": 17.00, "category": "grocery" }
  ],
  "receipt_number": "TXN-20240520-00123",
  "branch_name": "Carrefour Dubai Mall",
  "parsing_confidence": "high"
}
```

---

## 5. TEMPLATE_RULE_SANITY_CHECK

**Purpose**: Validate community-submitted merchant rules for plausibility and fraud signals before acceptance.

**Model**: `claude-haiku-4-5-20251001`

**System Prompt**:
```
You are a data quality validator for UAE loyalty program merchant rules. Your job is
to assess whether a newly submitted earn/cashback/discount rule is plausible, consistent
with known program structures, and free from obvious errors or fraud signals.

UAE context: most bank cards earn 1 pt/AED as baseline; 3x-5x is exceptional; >10x is
suspicious unless official. Cashback rates above 10% are extremely rare for general
spend. BOGOs are typically Entertainer-style.

Return only valid JSON.
```

**Output Schema**:
```json
{
  "is_plausible": true,
  "plausibility_score": 78,
  "flags": [
    { "type": "warning", "message": "Earn rate of 5x is higher than typical; recommend admin review" }
  ],
  "conflicts_with_existing": false,
  "conflict_details": null,
  "suggested_status": "provisional",
  "should_admin_review": true,
  "admin_review_reason": "Unusually high earn rate for this program",
  "auto_approve": false,
  "notes": "Submitter has trusted tier reputation; give benefit of doubt but flag for review"
}
```

**Auto-approve threshold**: `plausibility_score >= 80 AND !should_admin_review AND submitterTier IN ('trusted','expert','maven')`

---

## 6. TEMPLATE_MONTHLY_OPTIMIZER

**Purpose**: Generate a personalised monthly spend-optimisation plan for a user.

**Model**: `claude-sonnet-4-7`

**System Prompt**:
```
You are LoyaltyOne's monthly rewards optimisation advisor. Given a user's spending
history and program portfolio, generate a personalised optimisation plan for the
upcoming month.

Focus areas:
1. Which card to use for each spend category to maximise value
2. Points/miles approaching expiry that need attention
3. Tier qualification thresholds the user is close to achieving
4. Specific merchant+card combinations that offer exceptional value this month

Output structured JSON with actionable, specific recommendations. All values in AED.
```

**Example Output** (abbreviated):
```json
{
  "month": "2026-06",
  "summary": "Your Share MAF points are set to expire in July — prioritise Carrefour and VOX Cinemas this month. Switch your fuel spend to FAB Rewards card for 3x at ADNOC.",
  "category_recommendations": [
    {
      "category": "grocery",
      "recommended_program_slug": "share-maf",
      "recommended_program_name": "Share by Majid Al Futtaim",
      "reason": "1 pt/AED at Carrefour; helps burn expiring balance",
      "estimated_monthly_value_aed": 45.00
    }
  ],
  "expiry_actions": [
    {
      "program_slug": "share-maf",
      "points_expiring": 3200,
      "expires_at": "2026-07-15",
      "recommended_action": "Redeem at Carrefour before expiry",
      "estimated_value_saved_aed": 64.00
    }
  ],
  "total_estimated_monthly_value_aed": 312.50
}
```

---

## 7. TEMPLATE_REDEMPTION_ADVISOR

**Purpose**: Advise on best redemption strategy given a user's balances and a redemption goal.

**Model**: `claude-sonnet-4-7`

**System Prompt**:
```
You are LoyaltyOne's points redemption expert for UAE loyalty programs. Given a user's
current balances and a redemption goal or context, advise on the best redemption strategy
to maximise value.

Key UAE redemption knowledge:
- Skywards: business class redemptions yield best cpp; avoid merchandise
- Marriott Bonvoy: 5th night free on award stays; point transfers to airlines
- Bank points: usually better redeemed for travel than cashback
- Share MAF: strong value at 0.02 AED/pt for Carrefour, cinemas, entertainment
- Etihad Guest: good value for business class to Europe/US; avoid low-value partners

Always compare redemption options and recommend highest value use. Output structured JSON.
```

**Example Output** (abbreviated):
```json
{
  "primary_recommendation": {
    "program_slug": "skywards",
    "program_name": "Emirates Skywards",
    "redemption_type": "Business Class Flight DXB-LHR",
    "points_to_use": 90000,
    "estimated_value_aed": 6500.00,
    "cpp_aed": 0.072,
    "steps": [
      "Log in to skywards.com",
      "Search award availability for DXB-LHR Business",
      "Book at 90,000 miles + AED 450 taxes"
    ],
    "reasoning": "At 7.2 fils per mile this is nearly 3x the value of cashback redemptions"
  },
  "avoid": [
    {
      "program_slug": "skywards",
      "redemption_type": "Shopping voucher",
      "reason": "Value drops to ~1.5 fils/mile — less than 25% of flight value"
    }
  ],
  "total_portfolio_value_aed": 8420.00,
  "advice_summary": "Your Skywards balance is best used for a business class flight. Avoid merchandise or shopping redemptions which destroy value."
}
```

---

## Adding a New Template

1. Write a new migration file with the INSERT:
```sql
INSERT INTO prompt_templates (template_key, name, system_prompt, user_prompt_template, version, is_active)
VALUES ('TEMPLATE_NEW_FEATURE', 'Feature Name', $SYSTEM$...$SYSTEM$, $USER$...$USER$, 1, true)
ON CONFLICT (template_key) DO NOTHING;
```

2. Add the template key constant to `src/lib/constants.ts`
3. Create (or extend) the edge function that uses it
4. Document here with full I/O spec

## Template Versioning

Templates use a `version` integer. To update a template:
- Bump `version` (do not modify old rows — create a new migration)
- Old version remains in DB for audit; only `is_active = true` rows are used
- A future `version` column on `prompt_templates` allows A/B testing
