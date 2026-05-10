-- ============================================================
-- Row Level Security Policies
-- Every table is isolated per organization
-- ============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Organizations: users see only their own
CREATE POLICY "org_self" ON public.organizations
  FOR ALL USING (id = get_user_org_id());

-- Profiles: users see their own org members
CREATE POLICY "profiles_own_org" ON public.profiles
  FOR ALL USING (organization_id = get_user_org_id());

-- All other tables: scoped to organization
CREATE POLICY "verticals_org" ON public.business_verticals
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "schemas_org" ON public.extraction_schemas
  FOR ALL USING (organization_id = get_user_org_id() OR organization_id IS NULL);

CREATE POLICY "sources_org" ON public.data_sources
  FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY "uploads_org" ON public.uploads
  FOR ALL USING (organization_id = get_user_org_id() OR organization_id IS NULL);

CREATE POLICY "jobs_org" ON public.processing_jobs
  FOR ALL USING (organization_id = get_user_org_id() OR organization_id IS NULL);

CREATE POLICY "records_org" ON public.extracted_records
  FOR ALL USING (organization_id = get_user_org_id() OR organization_id IS NULL);

CREATE POLICY "audit_org" ON public.audit_logs
  FOR ALL USING (organization_id = get_user_org_id() OR organization_id IS NULL);

-- Storage bucket for uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'omniform-uploads',
  'omniform-uploads',
  false,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/m4a',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain',
    'application/zip'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload to their own prefix
CREATE POLICY "storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'omniform-uploads' AND auth.role() = 'authenticated'
  );

CREATE POLICY "storage_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'omniform-uploads' AND auth.role() = 'authenticated'
  );

CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'omniform-uploads' AND auth.role() = 'authenticated'
  );
