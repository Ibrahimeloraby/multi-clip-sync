# LoyaltyOne — Legal & Compliance

> **DISCLAIMER**: This document contains draft legal language prepared for review by qualified UAE legal counsel. It is not legal advice and should not be relied upon without review by a licensed attorney familiar with UAE law.

---

## 1. UAE Personal Data Protection Law (PDPL) Compliance Checklist

The UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (PDPL) took effect on 2 January 2022. Key obligations for LoyaltyOne:

### Data Controller Obligations

- [ ] **Lawful basis documented**: Identify and document the lawful basis for each data processing activity:
  - Loyalty balance tracking: **Consent** (collected during onboarding)
  - Email parsing: **Consent** (explicit opt-in to email forwarding)
  - Location-based prompts: **Consent** (device permission + in-app consent)
  - Analytics (PostHog): **Legitimate interest** or **Consent** (cookie banner)
  
- [ ] **Data Protection Officer (DPO)**: Not required for companies of LoyaltyOne's scale under current PDPL thresholds, but appoint a data contact: `privacy@loyaltyone.ae`

- [ ] **Privacy Notice**: Displayed at registration and accessible from app settings at all times

- [ ] **Data minimisation**: Confirm only necessary data is collected:
  - Phone number: required for OTP auth only
  - Precise location: only when user explicitly triggers recommendation at a merchant; not stored
  - Email content: stored for 30 days then purged (raw text), parsed data retained

- [ ] **Data Retention Policy**:
  - `inbound_emails.raw_email_text`: purge after 30 days (cron job)
  - `user_programs`: retained until user deletes account
  - `reputation_events`: retained indefinitely (audit trail)
  - Account data: deleted within 30 days of deletion request

- [ ] **Data Subject Rights** — Implement and document:
  - Right of access: user can export their data from Settings → Privacy
  - Right of correction: user can update wallet data at any time
  - Right of erasure: "Delete My Account" removes all PII within 30 days
  - Right to withdraw consent: toggles in Settings → Notifications and Privacy

- [ ] **Cross-border Transfers**: Supabase (Postgres in AWS Bahrain region), Railway (US-east by default — assess adequacy), Anthropic (US) — document transfers and assess adequacy decisions

- [ ] **Data Processing Agreements (DPAs)**: Execute DPAs with:
  - Supabase Inc.
  - Railway Corp.
  - Anthropic, PBC
  - Postmark (Wildbit)
  - Google LLC (Firebase, OAuth)
  - Mapbox Inc.

- [ ] **Security measures documented**: Supabase RLS, TLS in transit, service role key rotation policy, Railway environment variable encryption

- [ ] **Breach Notification**: Procedure documented; notify UAE TDRA within 72 hours of becoming aware of a breach affecting UAE residents

### PDPL Registration

Companies processing personal data of UAE residents may need to register with the UAE Telecommunications and Digital Government Regulatory Authority (TDRA). Confirm current registration thresholds with legal counsel.

---

## 2. Terms of Service (Draft)

**LOYALTYONE TERMS OF SERVICE**
*Last updated: [Date]*

These Terms of Service ("Terms") govern your use of the LoyaltyOne mobile application and website (the "Service") operated by [Company Name] ("LoyaltyOne", "we", "us", or "our"), a company incorporated in the United Arab Emirates.

By registering for or using the Service, you agree to be bound by these Terms.

### 2.1 Eligibility
The Service is available to residents of the United Arab Emirates aged 18 years or older. By using the Service, you represent and warrant that you meet these requirements.

### 2.2 Account Registration
You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately at support@loyaltyone.ae of any unauthorized use of your account.

### 2.3 The Service
LoyaltyOne provides:
- A dashboard to track loyalty program balances and expiry dates
- AI-powered recommendations on maximising reward value at UAE merchants
- A community-contributed database of merchant earn rules
- Tools to submit, confirm, and dispute merchant loyalty rules

### 2.4 Community-Contributed Content
**Accuracy Disclaimer**: Merchant earn rules contributed by users are based on community reports and are not verified or endorsed by LoyaltyOne or the loyalty programs themselves. Earn rates, discount percentages, and availability may change without notice. Always verify current offers with the relevant merchant or program before making purchasing decisions based on information shown in the Service.

By submitting a merchant rule, you represent that:
- You have personally observed or experienced the rule you are submitting
- The information is accurate to the best of your knowledge as of the submission date
- You are not submitting rules for commercial gain, to disadvantage competitors, or for any fraudulent purpose

LoyaltyOne reserves the right to remove, edit, or reject any submitted content at its sole discretion.

### 2.5 Email Forwarding Feature
If you use the email forwarding feature, you acknowledge that:
- You are voluntarily forwarding loyalty program emails to LoyaltyOne's processing system
- Email content will be processed by an AI model (Anthropic Claude) to extract balance data
- Raw email text is stored temporarily and purged within 30 days
- You must have the right to forward these emails and must not forward emails on behalf of others without their consent

### 2.6 Acceptable Use
You agree not to:
- Submit false, misleading, or fraudulent merchant rules
- Attempt to manipulate the reputation or confidence scoring system
- Use the Service to collect data about other users without their consent
- Attempt to reverse-engineer, scrape, or create derivative works from the Service
- Violate any applicable laws or regulations

### 2.7 Intellectual Property
The Service and its original content (excluding community-contributed rules) are owned by LoyaltyOne and protected by applicable intellectual property laws. Community-contributed rules are licensed to LoyaltyOne under a non-exclusive, worldwide, royalty-free licence for the purpose of operating and improving the Service.

### 2.8 Disclaimer of Warranties
THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. LOYALTYONE DOES NOT WARRANT THAT LOYALTY PROGRAM INFORMATION IS ACCURATE, COMPLETE, OR CURRENT. EARN RATES, REDEMPTION VALUES, AND PROGRAM TERMS ARE SUBJECT TO CHANGE BY THE RESPECTIVE PROGRAMS WITHOUT NOTICE.

### 2.9 Limitation of Liability
TO THE MAXIMUM EXTENT PERMITTED BY UAE LAW, LOYALTYONE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES RESULTING FROM YOUR USE OF THE SERVICE, INCLUDING ANY DECISIONS MADE BASED ON LOYALTY PROGRAM INFORMATION DISPLAYED IN THE SERVICE.

### 2.10 Governing Law
These Terms are governed by the laws of the United Arab Emirates. Any disputes shall be subject to the exclusive jurisdiction of the courts of Dubai, UAE.

### 2.11 Changes to Terms
We may update these Terms from time to time. We will notify you of material changes via email or in-app notification at least 14 days before the changes take effect. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.

### 2.12 Contact
Questions about these Terms: legal@loyaltyone.ae

---

## 3. Privacy Policy (Draft)

**LOYALTYONE PRIVACY POLICY**
*Last updated: [Date]*

LoyaltyOne ("we", "us", "our") is committed to protecting your privacy in accordance with the UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection (PDPL).

### 3.1 Data We Collect

| Category | Data | Purpose | Legal Basis |
|---|---|---|---|
| Identity | Name, email, phone number | Account creation, authentication | Consent |
| Authentication | Google/Apple sign-in tokens | Third-party auth | Consent |
| Loyalty balances | Program balances, tier, expiry dates | Core Service feature | Contract performance |
| Email content | Forwarded loyalty emails (temporary) | Balance extraction via AI | Consent |
| Location | Approximate lat/lng (not stored) | Nearby merchant suggestions | Consent |
| Usage | In-app events, clicks (PostHog) | Analytics and improvement | Legitimate interest |
| Device | Push token (FCM) | Expiry notifications | Consent |

### 3.2 How We Use Your Data
- To provide and improve the Service
- To send you alerts about expiring loyalty points (with your consent)
- To generate AI-powered loyalty recommendations
- To send you administrative communications (account security, Terms updates)

### 3.3 Data Sharing
We do not sell your personal data. We share data with:
- **Anthropic** (Claude AI): email text and screenshot content for parsing — processed under DPA
- **Supabase**: database and authentication infrastructure — DPA in place, Bahrain region
- **Railway**: worker infrastructure — DPA in place
- **Firebase (Google)**: push notification delivery — Google's standard terms apply
- **Postmark**: email processing infrastructure — DPA in place
- Law enforcement when required by UAE law

### 3.4 Data Retention
- Account data: until deletion request + 30-day grace period
- Raw email text: 30 days then automatically purged
- Parsed loyalty data: until account deletion
- Analytics events: 24 months

### 3.5 Your Rights
Under UAE PDPL, you have the right to:
- **Access** your personal data (export from Settings → Privacy → Export Data)
- **Correct** inaccurate data (edit directly in the app)
- **Delete** your data (Settings → Account → Delete Account)
- **Withdraw consent** for optional processing (Settings → Privacy)
- **Lodge a complaint** with the UAE TDRA

### 3.6 Security
We implement technical and organisational measures including: database-level row security (Supabase RLS), TLS for all data in transit, encrypted environment variables, and access controls on all server-side keys.

### 3.7 International Transfers
Your data is processed in the UAE (Supabase/AWS Bahrain) and the United States (Anthropic, Railway, Google). We ensure appropriate safeguards are in place for international transfers as required by PDPL.

### 3.8 Contact
Privacy questions or requests: privacy@loyaltyone.ae

---

## 4. In-App Disclaimer Language

The following disclaimer text should appear in the recommendation and merchant rule views:

**Short form** (shown below every recommendation):
> "Earn rates shown are based on community-reported data and may not reflect current program terms. Verify with your bank or loyalty program before relying on this information. LoyaltyOne is not affiliated with any loyalty program shown."

**Long form** (linked from "About these recommendations"):
> "LoyaltyOne aggregates loyalty program information from official sources and community contributions. While we strive for accuracy, earn rates, bonus categories, and redemption values are subject to change by the issuing programs. Program terms and conditions, including earn rates, may differ by card tier, merchant location, or purchase date. LoyaltyOne is an independent service and is not affiliated with, endorsed by, or in partnership with any of the loyalty programs listed unless specifically stated. All earn rate estimates are indicative only. Always check current terms at the official program website or app before making financial decisions."

---

## 5. Third-Party ToS Considerations

Before launching, review and comply with the terms of each loyalty program's third-party use policies:

| Program | Key Consideration |
|---|---|
| Emirates Skywards | ToS prohibits scraping; use only user-provided data |
| Etihad Guest | Similar anti-scraping provisions; email parsing of user-forwarded emails is generally permitted |
| ADCB TouchPoints | Review Commercial Terms before any affiliate or referral arrangement |
| Marriott Bonvoy | Bonvoy Points are non-transferable; ensure displayed values don't imply transferability |
| All programs | Do not represent endorsement or official partnership without written agreement |
| Google OAuth | Must comply with Google API Services User Data Policy; do not request scopes beyond what's needed |
| Apple Sign In | Must offer Apple Sign In if offering any other third-party sign-in on iOS |

**Recommended action**: Obtain written legal review of data aggregation legality under UAE law and the ToS of each program before commercial launch.
