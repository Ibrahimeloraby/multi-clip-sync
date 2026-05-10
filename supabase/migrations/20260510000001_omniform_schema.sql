-- ============================================================
-- Omniform: AI Data Collection & Structuring Platform
-- Core Schema
-- ============================================================

-- Organizations (multi-tenant)
CREATE TABLE IF NOT EXISTS public.organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  org_id UUID;
  org_slug TEXT;
BEGIN
  -- Generate unique slug from email
  org_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'))
              || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create default organization
  INSERT INTO public.organizations (name, slug)
  VALUES (split_part(NEW.email, '@', 1) || '''s workspace', org_slug)
  RETURNING id INTO org_id;

  -- Create profile
  INSERT INTO public.profiles (id, organization_id, full_name, role)
  VALUES (NEW.id, org_id, NEW.raw_user_meta_data->>'full_name', 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Business Verticals
CREATE TABLE IF NOT EXISTS public.business_verticals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  icon            TEXT,
  color           TEXT,
  is_template     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extraction Schemas
CREATE TABLE IF NOT EXISTS public.extraction_schemas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  vertical_id     UUID REFERENCES public.business_verticals(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  fields          JSONB NOT NULL DEFAULT '[]',
  document_types  TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Data Sources (ingestion channels)
CREATE TABLE IF NOT EXISTS public.data_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('manual_upload', 'whatsapp', 'email', 'google_drive', 'pos_webhook', 'api')),
  config          JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uploads (raw files)
CREATE TABLE IF NOT EXISTS public.uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  data_source_id  UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  uploaded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL CHECK (file_type IN ('image', 'audio', 'pdf', 'spreadsheet', 'text', 'archive')),
  mime_type       TEXT,
  file_size       BIGINT,
  storage_path    TEXT NOT NULL,
  storage_url     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Processing Jobs (async queue)
CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  upload_id       UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'needs_review')),
  job_type        TEXT NOT NULL CHECK (job_type IN ('classify', 'extract', 'transcribe', 'parse_table')),
  input           JSONB NOT NULL DEFAULT '{}',
  output          JSONB NOT NULL DEFAULT '{}',
  error           TEXT,
  confidence      FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  model_used      TEXT,
  tokens_used     INTEGER,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extracted Records (structured output)
CREATE TABLE IF NOT EXISTS public.extracted_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  upload_id         UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
  schema_id         UUID REFERENCES public.extraction_schemas(id) ON DELETE SET NULL,
  vertical_id       UUID REFERENCES public.business_verticals(id) ON DELETE SET NULL,
  document_type     TEXT NOT NULL DEFAULT 'other',
  raw_data          JSONB NOT NULL DEFAULT '{}',
  normalized_data   JSONB NOT NULL DEFAULT '{}',
  confidence        FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  field_confidences JSONB NOT NULL DEFAULT '{}',
  review_status     TEXT NOT NULL DEFAULT 'auto_approved'
                    CHECK (review_status IN ('auto_approved', 'needs_review', 'approved', 'rejected')),
  reviewed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     UUID,
  details         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS uploads_org_status ON public.uploads(organization_id, status);
CREATE INDEX IF NOT EXISTS uploads_org_created ON public.uploads(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS processing_jobs_upload ON public.processing_jobs(upload_id);
CREATE INDEX IF NOT EXISTS processing_jobs_status ON public.processing_jobs(status);
CREATE INDEX IF NOT EXISTS extracted_records_org ON public.extracted_records(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS extracted_records_review ON public.extracted_records(organization_id, review_status);
CREATE INDEX IF NOT EXISTS extracted_records_type ON public.extracted_records(organization_id, document_type);
CREATE INDEX IF NOT EXISTS audit_logs_org ON public.audit_logs(organization_id, created_at DESC);
