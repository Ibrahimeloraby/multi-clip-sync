# Omniform — Lovable Build Prompt

Copy and paste the prompt below directly into Lovable to build the complete Omniform platform.

---

## LOVABLE PROMPT

Build a full-stack AI-powered data collection and structuring platform called **Omniform** using React, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

---

### Overview

Omniform lets businesses upload data from any source (WhatsApp messages, screenshots, voice notes, PDFs, invoices, receipts, POS transactions, Excel sheets) and uses Claude AI to automatically classify the document, extract structured fields, and store clean data in a searchable database. It supports multiple business verticals (Retail, F&B, Logistics, Finance, etc.) and includes a human-in-the-loop review queue for low-confidence extractions.

---

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Storage + Edge Functions + Auth)
- **AI**: Anthropic Claude API via Supabase Edge Functions (multimodal — handles images, PDFs, text)
- **Speech-to-text**: OpenAI Whisper API (for audio/voice notes)
- **Charts**: Recharts
- **Routing**: React Router v6

---

### Color Scheme & Design

- **Background**: `slate-950` (very dark navy)
- **Surface**: `slate-900`, `slate-800`  
- **Borders**: `slate-700`
- **Primary accent**: `indigo-600` / `indigo-500` (buttons, active nav, badges)
- **Text primary**: `white`
- **Text secondary**: `slate-400`
- **Success**: `green-400/500`
- **Warning**: `yellow-400/500`
- **Error**: `red-400/500`
- **Font**: System sans-serif, clean and professional
- Overall feel: Dark SaaS dashboard, similar to Linear or Vercel

---

### Supabase Database Schema

Create these tables with the exact column names shown:

```sql
-- Organizations (multi-tenant)
organizations: id (uuid pk), name (text), slug (text unique), plan (text default 'starter'), settings (jsonb), created_at

-- Profiles (extends auth.users)
profiles: id (uuid pk → auth.users), organization_id (uuid → organizations), full_name (text), avatar_url (text), role (text default 'owner'), created_at

-- Business Verticals
business_verticals: id, organization_id, name, description, icon, color, is_template (bool), created_at

-- Extraction Schemas
extraction_schemas: id, organization_id, vertical_id (→ business_verticals), name, description, fields (jsonb array), document_types (text[]), is_active (bool default true), created_at

-- Data Sources
data_sources: id, organization_id, name, type (enum: manual_upload|whatsapp|email|google_drive|pos_webhook|api), config (jsonb), is_active (bool), last_synced_at, created_at

-- Uploads
uploads: id, organization_id, data_source_id, uploaded_by (→ auth.users), file_name, file_type (enum: image|audio|pdf|spreadsheet|text|archive), mime_type, file_size (bigint), storage_path, storage_url, status (enum: pending|processing|completed|failed default pending), metadata (jsonb), created_at

-- Processing Jobs
processing_jobs: id, organization_id, upload_id (→ uploads), status (enum: queued|processing|completed|failed|needs_review), job_type (enum: classify|extract|transcribe|parse_table), input (jsonb), output (jsonb), error (text), confidence (float 0-1), model_used, tokens_used (int), started_at, completed_at, created_at

-- Extracted Records (structured AI output)
extracted_records: id, organization_id, upload_id (→ uploads), schema_id (→ extraction_schemas), vertical_id (→ business_verticals), document_type (text), raw_data (jsonb), normalized_data (jsonb), confidence (float 0-1), field_confidences (jsonb), review_status (enum: auto_approved|needs_review|approved|rejected), reviewed_by (→ auth.users), reviewed_at, notes, created_at

-- Audit Logs
audit_logs: id, organization_id, user_id, action, resource_type, resource_id, details (jsonb), created_at
```

Enable Row Level Security on all tables. Users can only see data where `organization_id = their organization`.

Create a Supabase storage bucket called `omniform-uploads` (private, 50MB limit).

Create a trigger on `auth.users` insert that automatically creates both an organization and a profile for the new user.

---

### Application Layout

The app has two layout modes:

1. **Auth layout** (no nav): Full-screen split layout for login/signup
2. **App layout** (with nav): Fixed sidebar on desktop, bottom/horizontal scroll nav on mobile

**Sidebar (desktop, `slate-950` background)**:
- Logo: Brain icon + "Omniform" text in indigo
- Collapsible (toggle chevron at bottom)
- Nav items with icons: Dashboard, Upload Data, Documents, Records, Review Queue, Schemas, Integrations, Settings
- Active state: `bg-indigo-600 text-white`
- Inactive: `text-slate-400 hover:bg-slate-800`

**Header**:
- Height: 64px, `slate-950` background
- Mobile only: logo + horizontal scrolling nav tabs
- Right: notification bell + user avatar dropdown (Profile, Sign out)

---

### Pages

#### 1. Auth Page (`/auth` or shown when not logged in)

Split screen layout:
- **Left panel** (hidden on mobile): Gradient background `indigo-950 → slate-900 → slate-950` with floating blur circles. Show app name, tagline "AI-powered data collection and structuring", and 4 feature cards in 2×2 grid: "Any Source", "Any Format", "AI Extraction", "Any Vertical"
- **Right panel**: Email + password form. Toggle between Sign In and Sign Up. Show/hide password toggle. Loading spinner on submit. Error toast on failure.

#### 2. Dashboard (`/dashboard`)

- **Page header**: "Dashboard" title + "Upload Data" button (indigo, links to `/upload`)
- **Stats row** (4 cards, 2×2 on mobile, 4 across on desktop):
  - Total Documents (FileText icon, indigo)
  - Processed Today (CheckCircle icon, green)
  - Pending Review (AlertTriangle icon, yellow)
  - Processing Queue (TrendingUp icon, violet)
- **2-column section**:
  - Left (2/3 width): Area chart "Processing Activity" — last 14 days, two lines: Uploads (indigo) and Processed (green). Use Recharts AreaChart.
  - Right (1/3 width): "Quick Actions" card — 3 rows linking to Upload, Review Queue, Schemas with arrow icons
- **Recent Uploads table**: file icon, filename, date, status badge. "View all" link.
- **Recent Records table**: document type badge, confidence percentage, review status badge, date

All data fetched from Supabase using React Query. Show skeleton loaders while loading. Show empty states with helpful CTAs.

#### 3. Upload Page (`/upload`)

- **Page header**: title + description
- **Vertical selector**: shadcn Select dropdown — options: Auto-detect, Retail, F&B, Logistics, Finance, Healthcare, Real Estate, Construction, Custom. Help text explaining it improves AI accuracy.
- **Drag-and-drop zone**: Large area with upload icon, "Drag & drop files here or click to browse" text. On drag-over: indigo border + background tint. Show supported formats as pill badges: PDF, Images, Audio, Excel/CSV, WhatsApp exports, ZIP. Max 50MB / 20 files.
- **File list**: As files are added, show each with: type icon, filename, size, progress bar (during upload), status icon (spinner/checkmark/error X). Remove button for pending files.
- **Upload button**: "Process with AI" with Sparkles icon + ArrowRight. Disabled until files added. Shows spinner while uploading. Success toast after.
- **"What happens next"** section: 4 numbered steps explaining the pipeline: Classification → Extraction → Validation → Structured Output

Upload flow: Upload file to Supabase Storage → insert `uploads` row → invoke `process-document` edge function → toast success.

#### 4. Documents Page (`/documents`)

- **Header**: title + count + Refresh button
- **Filter bar**: Search input (by filename), Status filter dropdown, File type filter dropdown
- **Table**: file icon + filename, file type, file size, status badge, uploaded date. Hover row highlights. 
- Status badges: pending (gray), processing (blue), completed (green), failed (red)
- Empty state: upload CTA

#### 5. Records Page (`/records`)

- **Header**: title + count + "Export CSV" button
- **Filters**: Search (searches all field values), Document type dropdown
- **Expandable table**: Each row shows document type badge, confidence %, review status, date, and expand chevron.
  - When expanded: show all extracted fields as a grid of labeled cards. Each card shows field name + value. Colored dot indicates per-field confidence (green/yellow/red).
- Export CSV: download all visible records with all extracted fields as columns
- Empty state: upload CTA

#### 6. Review Queue (`/review`)

- **Header**: title + count + yellow badge if items pending
- **Yellow info banner**: "Human review required — these records have <85% confidence"
- **Empty state**: Green checkmark icon, "Queue is clear" message
- **Review cards** (one per record needing review):
  - Card header: document type badge, confidence %, date
  - Field grid: 2×3 grid of field cards (field name + extracted value + per-field confidence dot)
  - Notes textarea
  - Two buttons: "Approve" (green) and "Reject" (red outline)
  - On approve/reject: PATCH `extracted_records` → set `review_status`, `reviewed_by`, `reviewed_at`, `notes` → remove from queue with toast

#### 7. Schemas Page (`/schemas`)

- **Header**: title + description + "New Schema" button
- **Schema cards** (one per schema, collapsible):
  - Header: GitBranch icon, schema name, field count + document types, Active/Inactive badge, expand chevron
  - Expanded: list each field as `code tag (key)` + label + type badge + required badge
  - Activate/Deactivate toggle button
- **Create Schema form** (shown inline when "New Schema" clicked):
  - Schema name input
  - Document types: pill buttons that toggle (multi-select): invoice, receipt, whatsapp_message, voice_note, spreadsheet, pdf, screenshot, pos_transaction, contract
  - Fields section: each field row has key input, label input, type select (text/number/date/currency/boolean/enum), required checkbox, delete button
  - "Add field" button, Save + Cancel buttons
  - On save: insert to `extraction_schemas` table

#### 8. Integrations Page (`/integrations`)

Cards for each integration source. Each card shows:
- Icon (colored), source name, description, Connected badge (if active), Configure/Connect button

On click: expand inline config form.

Sources:
1. **WhatsApp Business** (MessageCircle, emerald): Phone Number ID + Access Token fields. Show webhook URL to copy.
2. **Email Inbox** (Mail, blue): Show auto-generated forwarding email address.
3. **Google Drive** (HardDrive, yellow): Folder ID + Service Account JSON fields.
4. **POS Webhook** (ShoppingBag, cyan): Show webhook endpoint URL + secret.
5. **REST API** (Code, violet): Show generated API key with copy + rotate buttons.

On connect: insert/update `data_sources` row.

Bottom note: "Manual upload always available" reminder.

#### 9. Settings Page (`/settings`)

Sections (cards with icon headers):

1. **Organization**: Name input, email (read-only), Save button
2. **API Keys**: Show masked API key, Copy button, Rotate button, security warning
3. **Notifications**: Three toggle switches: Processing complete, Review required, Weekly digest
4. **Data & Privacy**: Two security info rows (Data isolation, Encryption), "Export my data" danger button

---

### Supabase Edge Functions

Create these Deno Edge Functions:

#### `process-document`
Input: `{ upload_id, schema_id? }`
1. Fetch upload record from DB
2. Mark upload as `processing`
3. Download file from Supabase Storage
4. For images/PDFs: base64 encode for Claude vision
5. Call Claude API (`claude-sonnet-4-6`) to classify document type + confidence (JSON output)
6. Find matching extraction schema (by `schema_id` or matching `document_types` array)
7. Call Claude API again with schema fields to extract structured data — return `{ fields: {...}, field_confidences: {...}, overall_confidence: 0-1 }`
8. If confidence ≥ 0.85: `review_status = auto_approved`, else `needs_review`
9. Insert `extracted_records` row
10. Mark upload as `completed`
11. Update processing job as `completed`

Claude prompt for extraction (use this exact structure):
```
Extract structured data from this [document_type].
Fields to extract:
- field_key (Label, type: text|number|date|currency, required/optional)
...
Return ONLY JSON: { "fields": { "key": value_or_null }, "field_confidences": { "key": 0-1 }, "overall_confidence": 0-1 }
```

#### `ingest-file`  
Accepts `multipart/form-data` with `file`, optional `schema_id`, `vertical`, `data_source_id`.
1. Upload file to Supabase Storage under `uploads/{user_id}/{timestamp}-{uuid}.{ext}`
2. Insert `uploads` row
3. Invoke `process-document` asynchronously

#### `webhook-whatsapp`
- GET: respond to Meta webhook verification challenge
- POST: verify HMAC signature, parse messages array, for each message create an `uploads` row and invoke `process-document`

#### `transcribe-audio`
Input: `{ upload_id }`
1. Download audio from storage
2. Call OpenAI Whisper API (`whisper-1`, verbose_json)
3. Update upload metadata with transcript text + language
4. Invoke `process-document` with the transcript text

---

### TypeScript Types

```typescript
type DocumentType = "invoice" | "receipt" | "whatsapp_message" | "voice_note" | "spreadsheet" | "pdf" | "screenshot" | "pos_transaction" | "contract" | "other"
type FileCategory = "image" | "audio" | "pdf" | "spreadsheet" | "text" | "archive"
type UploadStatus = "pending" | "processing" | "completed" | "failed"
type ReviewStatus = "auto_approved" | "needs_review" | "approved" | "rejected"
type FieldType = "text" | "number" | "date" | "currency" | "boolean" | "enum"

interface SchemaField {
  key: string
  label: string
  type: FieldType
  required: boolean
  ai_hint?: string
}
```

---

### Constants

```typescript
DOCUMENT_TYPE_LABELS: maps each DocumentType to a human-readable label
DOCUMENT_TYPE_COLORS: maps each DocumentType to Tailwind badge classes
CONFIDENCE_THRESHOLDS: { high: 0.85, medium: 0.65, low: 0 }
MAX_FILE_SIZE_MB: 50
MAX_FILES_PER_UPLOAD: 20
SUPPORTED_MIME_TYPES: all image, audio, pdf, spreadsheet, text, zip types
```

---

### Data Flow Summary

```
User drops file(s) on DropZone
  → upload to Supabase Storage (omniform-uploads bucket)
  → insert uploads row (status: pending)
  → invoke process-document edge function
     → classify with Claude (document_type + confidence)
     → find matching extraction_schemas row
     → extract fields with Claude (raw_data + field_confidences + overall_confidence)
     → if confidence >= 0.85: review_status = auto_approved
     → else: review_status = needs_review
     → insert extracted_records row
     → update uploads.status = completed
  → record appears in /records
  → if needs_review: appears in /review queue
```

---

### Key UX Details

- All data mutations show toast notifications (sonner)
- All queries use React Query with 30s stale time
- Loading states: spinner centered in containers
- Empty states: icon + message + CTA button
- Confidence values: show as colored percentages (green ≥85%, yellow ≥65%, red <65%)
- Per-field confidence: colored dot (green/yellow/red) next to each extracted value
- All tables support inline expansion to show full extracted data
- CSV export: generate client-side using all fields as dynamic columns
- Mobile: sidebar collapses to header tabs (horizontal scroll)
- No external routing library beyond react-router-dom

---

### Environment Variables

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
ANTHROPIC_API_KEY=your_anthropic_key          (Edge Function secret)
OPENAI_API_KEY=your_openai_key                (Edge Function secret, for Whisper)
WHATSAPP_VERIFY_TOKEN=your_token              (Edge Function secret)
WHATSAPP_APP_SECRET=your_app_secret           (Edge Function secret)
```

---

### What NOT to build (out of scope for v1)

- Real-time collaboration
- Custom domain setup
- Billing/payment integration
- Mobile native app
- PII redaction pipeline (placeholder in Settings is fine)
- Actual Google Drive OAuth (config form is sufficient for v1)
