-- ============================================
-- KNOWLEDGE HUB: DATABASE SCHEMA
-- ============================================

-- Knowledge items (tagged learnings from all sources)
CREATE TABLE IF NOT EXISTS hub_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  content TEXT NOT NULL,
  summary TEXT,
  tag TEXT NOT NULL CHECK (tag IN ('#learning', '#agent')),
  source TEXT NOT NULL,
  department TEXT NOT NULL,
  author TEXT NOT NULL,
  meeting_title TEXT,
  citations TEXT[] DEFAULT '{}',
  key_topics TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_knowledge_department ON hub_knowledge_items(department);
CREATE INDEX IF NOT EXISTS idx_hub_knowledge_tag ON hub_knowledge_items(tag);
CREATE INDEX IF NOT EXISTS idx_hub_knowledge_status ON hub_knowledge_items(status);
CREATE INDEX IF NOT EXISTS idx_hub_knowledge_created ON hub_knowledge_items(created_at DESC);

ALTER TABLE hub_knowledge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_knowledge_read_all" ON hub_knowledge_items FOR SELECT USING (true);
CREATE POLICY "hub_knowledge_insert_auth" ON hub_knowledge_items FOR INSERT WITH CHECK (true);
CREATE POLICY "hub_knowledge_update_auth" ON hub_knowledge_items FOR UPDATE USING (true);

-- Chat sessions
CREATE TABLE IF NOT EXISTS hub_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  department TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hub_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_chat_sessions_own" ON hub_chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "hub_chat_sessions_insert_anon" ON hub_chat_sessions FOR INSERT WITH CHECK (true);

-- Chat messages
CREATE TABLE IF NOT EXISTS hub_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES hub_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  department TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hub_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_chat_messages_read" ON hub_chat_messages FOR SELECT USING (true);
CREATE POLICY "hub_chat_messages_insert" ON hub_chat_messages FOR INSERT WITH CHECK (true);

-- Connected sources config
CREATE TABLE IF NOT EXISTS hub_connected_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  source_type TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'pending', 'disconnected')),
  config JSONB DEFAULT '{}',
  items_tagged INTEGER DEFAULT 0,
  last_sync TIMESTAMPTZ,
  tag_instruction TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, source_type)
);

ALTER TABLE hub_connected_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_sources_read_all" ON hub_connected_sources FOR SELECT USING (true);
CREATE POLICY "hub_sources_manage" ON hub_connected_sources FOR ALL USING (true);

-- User roles (department-level access)
CREATE TABLE IF NOT EXISTS hub_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  department TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'contributor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, department)
);

ALTER TABLE hub_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_roles_read_all" ON hub_user_roles FOR SELECT USING (true);
CREATE POLICY "hub_roles_manage" ON hub_user_roles FOR ALL USING (true);

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO hub_connected_sources (org_id, source_type, label, status, items_tagged, last_sync, tag_instruction) VALUES
('default', 'teams',      'Microsoft Teams',    'connected',    284, NOW() - INTERVAL '2 hours',  'Add #learning or #agent anywhere in meeting chat or transcript'),
('default', 'slack',      'Slack',              'connected',    391, NOW() - INTERVAL '15 minutes','Add #learning or #agent to any message or thread reply'),
('default', 'zoom',       'Zoom',               'connected',    112, NOW() - INTERVAL '3 hours',  'Add #learning or #agent in meeting chat during or after the call'),
('default', 'email',      'Microsoft 365 Email','connected',    203, NOW() - INTERVAL '6 hours',  'Add #learning or #agent anywhere in email subject or body'),
('default', 'pdf',        'PDF / Documents',    'connected',     87, NOW() - INTERVAL '1 day',    'Add #learning or #agent as a comment or in document metadata on upload'),
('default', 'powerbi',    'Power BI',           'connected',     44, NOW() - INTERVAL '2 days',   'Tag report pages or dataset descriptions with #learning or #agent'),
('default', 'sharepoint', 'SharePoint / OneDrive','connected',  168, NOW() - INTERVAL '8 hours',  'Add #learning or #agent to file metadata or document description'),
('default', 'confluence', 'Confluence',         'pending',        0, NULL,                        'Add #learning or #agent label to any page or space'),
('default', 'jira',       'Jira',               'disconnected',   0, NULL,                        'Add #learning or #agent to ticket description or comments')
ON CONFLICT (org_id, source_type) DO NOTHING;

INSERT INTO hub_knowledge_items (content, summary, tag, source, department, author, meeting_title, citations, key_topics, status, created_at) VALUES
('In our Q2 planning meeting, we decided to shift 30% of the paid social budget from Meta to LinkedIn due to better B2B conversion rates seen in Q1. The CPL on LinkedIn dropped 18% after the audience retargeting update. #learning',
 'Shift 30% paid social budget to LinkedIn — 18% better CPL vs Meta for B2B',
 '#learning', 'teams', 'marketing', 'Sarah Chen', 'Q2 Marketing Planning',
 ARRAY['Q1 Performance Report.pdf', 'Teams: Q2 Planning — 31 May'],
 ARRAY['Budget Reallocation', 'LinkedIn', 'CPL', 'B2B'], 'active', NOW() - INTERVAL '1 day'),

('Enterprise deal with Nordex fell through — main objection was integration complexity with their existing SAP stack. We need a dedicated SAP integration playbook. Flagging for the product team. #agent',
 'Lost Nordex deal: SAP integration gap. Need dedicated integration playbook.',
 '#agent', 'zoom', 'sales', 'James Okafor', 'Enterprise Pipeline Review',
 ARRAY['Zoom: Enterprise Pipeline Review — 31 May'],
 ARRAY['Nordex', 'SAP Integration', 'Deal Loss', 'Product Gap'], 'active', NOW() - INTERVAL '20 hours'),

('Q1 actuals came in 7% under budget on headcount due to delayed hiring. Finance recommends rolling unspent HC budget into H2 cloud infrastructure investment to avoid year-end clawback. Board approval needed. #learning',
 'Q1 HC underspend 7% — recommend reallocation to H2 cloud infra. Board sign-off required.',
 '#learning', 'pdf', 'finance', 'Priya Nair', 'Q1 Finance Close Report',
 ARRAY['Q1 Finance Close Report May2026.pdf'],
 ARRAY['Q1 Actuals', 'Headcount', 'Budget Reallocation', 'Cloud'], 'active', NOW() - INTERVAL '2 days'),

('Attrition in the engineering function hit 14% in Q1 — highest in 3 years. Exit interviews point to compensation misalignment vs market. Benchmarking study commissioned. Results expected June 15. #learning',
 'Engineering attrition 14% (3yr high) — comp misalignment suspected. Benchmark due June 15.',
 '#learning', 'slack', 'hr', 'Maya Patel', NULL,
 ARRAY['#hr-leadership Slack thread'],
 ARRAY['Attrition', 'Engineering', 'Compensation', 'Retention'], 'active', NOW() - INTERVAL '3 days'),

('Warehouse picking efficiency improved 22% after deploying the new routing algorithm in pilot sites. Rolling out to all 8 sites in June. Estimated annual saving: £1.4M. #agent',
 'Picking efficiency +22% from routing algo. £1.4M annual saving. Full rollout June.',
 '#agent', 'powerbi', 'operations', 'Tom Richards', NULL,
 ARRAY['Operations Dashboard — PowerBI May26'],
 ARRAY['Warehouse', 'Routing Algorithm', 'Efficiency', 'Cost Saving'], 'active', NOW() - INTERVAL '1 day'),

('Supplier X contract renewal is due August 1. Current spend is £3.2M/year. Market benchmarking shows 12-15% saving potential. Negotiation strategy: introduce Supplier Y as credible alternative during opening round. #learning',
 'Supplier X renewal Aug 1 — £3.2M/yr, 12-15% saving possible. Use Supplier Y as leverage.',
 '#learning', 'email', 'procurement', 'Aisha Mohammed', NULL,
 ARRAY['Email: Supplier X Renewal Strategy — 28 May'],
 ARRAY['Supplier X', 'Contract Renewal', 'Negotiation', 'Cost Saving'], 'active', NOW() - INTERVAL '4 days'),

('ICO issued updated guidance on AI-generated profiling under GDPR Article 22. Our current lead scoring model likely constitutes automated decision-making and needs a human-in-the-loop review checkpoint. Legal review initiated. #learning',
 'ICO guidance: AI lead scoring = GDPR Article 22 automated decision. Legal review started.',
 '#learning', 'pdf', 'compliance', 'Rachel Foster', NULL,
 ARRAY['ICO Guidance on AI Profiling May2026.pdf'],
 ARRAY['GDPR', 'Article 22', 'AI Profiling', 'Lead Scoring'], 'active', NOW() - INTERVAL '5 days'),

('Third-party cyber risk assessment flagged two critical vendors with no SOC2 certification. Combined annual spend: £800K. Recommend requiring SOC2 Type II within 90 days or initiating vendor replacement. #agent',
 'Two critical vendors lack SOC2 (£800K spend). Require cert in 90 days or replace.',
 '#agent', 'sharepoint', 'risk', 'Daniel Wu', NULL,
 ARRAY['Cyber Risk Assessment Q2 2026.docx — SharePoint'],
 ARRAY['Cyber Risk', 'SOC2', 'Third-Party', 'Vendor Management'], 'active', NOW() - INTERVAL '2 days'),

('Board unanimously approved the £15M Series B extension. Key condition: ARR must reach £8M by December or convertible note terms activate. CEO to communicate revised milestones to leadership team by EOW. #learning',
 'Series B extension £15M approved. ARR target £8M by Dec or convertible note activates.',
 '#learning', 'pdf', 'board', 'CEO Office', 'Board Meeting May 2026',
 ARRAY['Board Minutes May2026 — CONFIDENTIAL.pdf'],
 ARRAY['Series B', 'Fundraising', 'ARR Target', 'Milestones'], 'active', NOW() - INTERVAL '7 days'),

('Migration to AWS completed for 6 of 9 core services. Remaining 3 blocked on legacy Oracle DB dependencies. Cloud infra team estimates 6-week effort to refactor. Cost optimisation dashboard now live in PowerBI. #agent',
 'AWS migration 6/9 services done. 3 blocked on Oracle. Refactor est. 6 weeks.',
 '#agent', 'confluence', 'it', 'Kevin Torres', NULL,
 ARRAY['IT Migration Tracker — Confluence'],
 ARRAY['AWS', 'Cloud Migration', 'Oracle', 'Infrastructure'], 'active', NOW() - INTERVAL '12 hours'),

('NPS score for enterprise segment dropped from 52 to 41 in May. Root cause: onboarding friction. Three customers cited "too many steps before first value". Customer success team proposing a streamlined 3-step onboarding track. #learning',
 'Enterprise NPS dropped 52→41. Onboarding friction is root cause. 3-step track proposed.',
 '#learning', 'zoom', 'sales', 'Lisa Park', 'Customer Success Review',
 ARRAY['Zoom: Customer Success Review — 30 May'],
 ARRAY['NPS', 'Onboarding', 'Enterprise', 'Customer Success'], 'active', NOW() - INTERVAL '2 days'),

('Content team discovered that long-form case studies (2000+ words) are generating 4x more inbound leads than short blogs. Recommending a content pivot: reduce blog cadence from 3/week to 1/week, double down on case study production. #agent',
 'Long-form case studies = 4x more leads. Pivot: fewer blogs, more case studies.',
 '#agent', 'slack', 'marketing', 'Emma Walsh', NULL,
 ARRAY['#marketing-content Slack thread — 30 May'],
 ARRAY['Content Strategy', 'Case Studies', 'Inbound Leads', 'SEO'], 'active', NOW() - INTERVAL '2 days'),

('Pending: New procurement policy requires all contracts over £50K to go through legal review before signing. Previously the threshold was £100K. Flagging for all team leads. #learning',
 'New policy: contracts >£50K need legal review (was £100K). All team leads to note.',
 '#learning', 'email', 'compliance', 'Rachel Foster', NULL,
 ARRAY['Email: Policy Update — Procurement Thresholds'],
 ARRAY['Policy', 'Procurement', 'Legal Review', 'Contracts'], 'pending', NOW() - INTERVAL '6 hours'),

('Draft: Sales team closing rate on SMB dropped from 32% to 24% in May. Suspect pricing objection is root cause. Need analysis across deal notes. #agent',
 'SMB close rate dropped 32%→24%. Pricing objection suspected — needs deal note analysis.',
 '#agent', 'slack', 'sales', 'James Okafor', NULL,
 ARRAY['#sales-leadership Slack thread'],
 ARRAY['Close Rate', 'SMB', 'Pricing', 'Win/Loss'], 'pending', NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;

INSERT INTO hub_user_roles (email, display_name, department, role) VALUES
('sarah.chen@company.com',    'Sarah Chen',    'marketing',   'contributor'),
('james.okafor@company.com',  'James Okafor',  'sales',       'contributor'),
('priya.nair@company.com',    'Priya Nair',    'finance',     'contributor'),
('maya.patel@company.com',    'Maya Patel',    'hr',          'contributor'),
('tom.richards@company.com',  'Tom Richards',  'operations',  'contributor'),
('aisha.m@company.com',       'Aisha Mohammed','procurement', 'contributor'),
('rachel.f@company.com',      'Rachel Foster', 'compliance',  'contributor'),
('daniel.wu@company.com',     'Daniel Wu',     'risk',        'contributor'),
('kevin.t@company.com',       'Kevin Torres',  'it',          'contributor'),
('admin@company.com',         'Admin',         NULL,          'admin')
ON CONFLICT (email, department) DO NOTHING;
