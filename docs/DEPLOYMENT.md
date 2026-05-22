# LoyaltyOne — Deployment Guide

---

## 1. Supabase Project Setup

### 1.1 Create a project

1. Go to https://supabase.com and create an account.
2. Click **New Project**, choose a name (e.g. `loyaltyone-prod`), set a strong DB password, pick the **Middle East (Bahrain)** region for lowest latency from UAE.
3. Wait ~2 minutes for provisioning.

### 1.2 Install and configure the CLI

```bash
npm install -g supabase

# Login with your browser
npx supabase login

# Link to your project (find the ref in: Project Settings → General)
npx supabase link --project-ref YOUR_PROJECT_REF
```

### 1.3 Run migrations

```bash
# Push all migrations (20260519* files run schema + seed data)
npx supabase db push

# Or using the combined SQL file directly via psql:
psql "$DATABASE_URL" -f supabase/migrations/COMBINED_MIGRATIONS.sql
```

### 1.4 Verify seed data

In the Supabase dashboard → Table Editor:
- `programs` should have 18 rows
- `merchants` should have 50 rows
- `merchant_rules` should have 70+ rows
- `prompt_templates` should have 7 rows

### 1.5 Deploy Edge Functions

```bash
# Set secrets (one-time)
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Deploy all edge functions
npx supabase functions deploy get-recommendation
npx supabase functions deploy parse-screenshot
npx supabase functions deploy validate-rule
npx supabase functions deploy compute-confidence

# Or deploy all at once
npx supabase functions deploy
```

### 1.6 Get API keys

In Supabase dashboard → **Settings → API**:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (workers only, never frontend)

---

## 2. Auth Providers

### 2.1 Google OAuth

1. Go to https://console.cloud.google.com → **APIs & Services → Credentials**
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. In Supabase dashboard → **Authentication → Providers → Google**:
   - Enable Google
   - Paste Client ID and Client Secret
   - Save

### 2.2 Apple Sign-in

1. Go to https://developer.apple.com → **Certificates, Identifiers & Profiles**
2. Create a **Services ID** (e.g. `ae.loyaltyone.web`)
3. Enable **Sign in with Apple** and add your domain + return URL:
   - Domain: `loyaltyone.ae`
   - Return URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Create a **Key** with Sign in with Apple enabled; download the `.p8` file
5. In Supabase → **Authentication → Providers → Apple**:
   - Enable Apple
   - Paste Service ID, Team ID, Key ID, and the contents of the `.p8` file
   - Save

### 2.3 Phone OTP

1. In Supabase → **Authentication → Providers → Phone**:
   - Enable Phone
   - Choose an SMS provider (Twilio recommended):
     - Create a Twilio account and get an Account SID, Auth Token, and a Verify Service SID
   - Paste credentials and save

---

## 3. Vercel Frontend Deployment

### 3.1 Connect repository

1. Go to https://vercel.com and import your GitHub repository
2. Framework: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Node.js version: `20.x`

### 3.2 Set environment variables

In Vercel dashboard → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |
| `VITE_MAPBOX_TOKEN` | Your Mapbox public token |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_APP_URL` | `https://loyaltyone.ae` |
| `VITE_APP_ENV` | `production` |
| `VITE_POSTHOG_KEY` | PostHog key (optional) |
| `VITE_POSTHOG_HOST` | PostHog host (optional) |

### 3.3 Custom domain

1. Vercel → **Settings → Domains** → add `loyaltyone.ae`
2. Update your DNS registrar:
   - `A` record: `76.76.21.21`
   - `CNAME www`: `cname.vercel-dns.com`
3. Wait for SSL provisioning (~5 minutes)

### 3.4 GitHub Actions deployment

Add these secrets to your GitHub repo → **Settings → Secrets → Actions**:

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | From Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | From `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` after `vercel link` |
| `VITE_SUPABASE_URL` | Same as above |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same as above |
| `VITE_MAPBOX_TOKEN` | Same as above |
| `VITE_APP_URL` | `https://loyaltyone.ae` |

---

## 4. Railway Workers Deployment

### 4.1 Setup

1. Go to https://railway.app and create a new project
2. Link your GitHub repo
3. Deploy each worker as a separate **Service**

### 4.2 Worker: email-inbound

- **Root directory**: `workers/email-inbound`
- **Build command**: `npm install && npm run build`
- **Start command**: `node dist/index.js`
- **Port**: `3001`

**Environment variables:**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Anthropic key |
| `POSTMARK_WEBHOOK_TOKEN` | Postmark inbound webhook token |
| `PORT` | `3001` |

**Cron**: None — HTTP server, always running.

### 4.3 Worker: expiry-check

- **Root directory**: `workers/expiry-check`
- **Build command**: `npm install && npm run build`
- **Start command**: `node dist/index.js`

**Environment variables:**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

**Cron (Railway Cron Service)**: `0 6 * * *` (06:00 UTC = 10:00 GST daily)

### 4.4 Worker: confidence-recompute

- **Root directory**: `workers/confidence-recompute`
- **Build command**: `npm install && npm run build`
- **Start command**: `node dist/index.js`

**Environment variables:**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

**Cron**: `0 3 * * *` (03:00 UTC daily, off-peak)

### 4.5 Worker: monthly-rewards

- **Root directory**: `workers/monthly-rewards`
- **Build command**: `npm install && npm run build`
- **Start command**: `node dist/index.js`

**Environment variables:**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

**Cron**: `0 2 1 * *` (02:00 UTC on 1st of each month)

### 4.6 Worker: admin-digest

- **Root directory**: `workers/admin-digest`
- **Build command**: `npm install && npm run build`
- **Start command**: `node dist/index.js`

**Environment variables:**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `resend` |
| `SMTP_PASS` | Resend API key (`re_...`) |
| `ADMIN_EMAIL` | `admin@loyaltyone.ae` |
| `FROM_EMAIL` | `notifications@loyaltyone.ae` |

**Cron**: `0 7 * * *` (07:00 UTC = 11:00 GST daily)

### 4.7 Worker: geofence-prompts

- **Root directory**: `workers/geofence-prompts`
- **Build command**: `npm install && npm run build`
- **Start command**: `node dist/index.js`
- **Port**: `3002`

**Environment variables:**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key |
| `PORT` | `3002` |

**Cron**: None — HTTP server, always running.

---

## 5. Postmark Inbound Email Setup

1. Create a **Postmark** account (https://postmarkapp.com)
2. Go to **Inbound** → create an inbound stream
3. Set the inbound email address to: `*@inbox.loyaltyone.ae`
4. Configure a **webhook URL**: `https://your-email-inbound.railway.app/webhook`
5. Set a **webhook token** and save it as `POSTMARK_WEBHOOK_TOKEN`
6. In your DNS, add a **MX record**: `inbox.loyaltyone.ae → MX 10 inbound.postmarkapp.com`

Users forward loyalty emails to `u-{shortId}@inbox.loyaltyone.ae`. The short ID is generated during onboarding and stored in user metadata.

---

## 6. Firebase Cloud Messaging (Push Notifications)

### 6.1 Create a Firebase project

1. Go to https://console.firebase.google.com → **New project** → `loyaltyone-prod`
2. Add a **Web app**: name it `LoyaltyOne PWA`
3. Copy the Firebase config (API key, project ID, messaging sender ID, app ID)

### 6.2 Enable Cloud Messaging

1. In Firebase → **Project Settings → Cloud Messaging**
2. Generate a **Server key** → paste as `FCM_SERVER_KEY`
3. Generate a **VAPID key pair** for web push
4. Copy the **VAPID public key** to `src/lib/constants.ts`

### 6.3 Service worker

The Vite PWA plugin auto-generates `public/sw.js`. Ensure `vite.config.ts` has FCM integration in the service worker options if you use background push messages.

---

## 7. Mapbox Setup

1. Create an account at https://account.mapbox.com
2. Go to **Access tokens** → **Create a token**
3. Scopes needed: `styles:read`, `tiles:read`, `geocoding:read`
4. Restrict to allowed URLs: `https://loyaltyone.ae`, `https://*.vercel.app`
5. Paste the public token as `VITE_MAPBOX_TOKEN`

---

## 8. Post-deployment Checklist

- [ ] Supabase RLS policies are enabled (verify in Table Editor → RLS enabled per table)
- [ ] Edge functions deployed and responding (`/health` endpoints return 200)
- [ ] Auth providers tested (Google, Apple, Email, Phone OTP)
- [ ] Postmark MX record propagated (`nslookup -type=MX inbox.loyaltyone.ae`)
- [ ] Railway workers running (check Railway dashboard → deployment logs)
- [ ] Admin digest received at `admin@loyaltyone.ae`
- [ ] FCM push notification delivered on test device
- [ ] Mapbox tiles loading in geofence-prompts worker's merchant lookup
- [ ] Confidence recompute completed without errors
- [ ] CI/CD pipeline green in GitHub Actions
