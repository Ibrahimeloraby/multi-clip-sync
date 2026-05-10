-- ============================================================
-- AI Customer Journey Intelligence Platform
-- Full database schema with RLS, indexes, and utility functions
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ORGANIZATIONS (multi-tenant root)
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  industry        TEXT,
  plan            TEXT NOT NULL DEFAULT 'starter', -- starter | growth | enterprise
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- org members (links auth users to orgs)
CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,  -- references auth.users
  role            TEXT NOT NULL DEFAULT 'member', -- owner | admin | analyst | member
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);

-- ============================================================
-- DATA CONNECTIONS (warehouse credentials, encrypted)
-- ============================================================
CREATE TABLE IF NOT EXISTS data_connections (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  connector_type      TEXT NOT NULL, -- snowflake | bigquery | redshift | clickhouse | postgres | databricks
  credentials         JSONB NOT NULL DEFAULT '{}', -- stored encrypted
  status              TEXT NOT NULL DEFAULT 'pending', -- pending | active | error | disconnected
  last_tested_at      TIMESTAMPTZ,
  last_sync_at        TIMESTAMPTZ,
  schema_discovered   BOOLEAN NOT NULL DEFAULT FALSE,
  field_mappings      JSONB NOT NULL DEFAULT '{}',
  metadata            JSONB NOT NULL DEFAULT '{}',
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_connections_org_id ON data_connections(organization_id);

-- ============================================================
-- EVENT SCHEMAS (discovered schema per connection)
-- ============================================================
CREATE TABLE IF NOT EXISTS event_schemas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id       UUID NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
  table_schema        TEXT NOT NULL,
  table_name          TEXT NOT NULL,
  columns             JSONB NOT NULL DEFAULT '[]',
  row_count_estimate  BIGINT,
  suggested_mappings  JSONB NOT NULL DEFAULT '[]',
  discovered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_schemas_org_id ON event_schemas(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_schemas_connection_id ON event_schemas(connection_id);

-- ============================================================
-- CUSTOMERS (unified customer profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id         TEXT,  -- ID from the warehouse
  email               TEXT,
  name                TEXT,
  phone               TEXT,
  country             TEXT,
  city                TEXT,
  first_seen_at       TIMESTAMPTZ,
  last_seen_at        TIMESTAMPTZ,
  total_revenue       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  transaction_count   INTEGER NOT NULL DEFAULT 0,
  attributes          JSONB NOT NULL DEFAULT '{}',
  pii_masked          BOOLEAN NOT NULL DEFAULT FALSE,
  gdpr_erased         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_external_id ON customers(organization_id, external_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_seen ON customers(organization_id, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_customers_revenue ON customers(organization_id, total_revenue DESC);

-- ============================================================
-- EVENTS (touchpoint events across all channels)
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  external_customer_id TEXT,
  connection_id       UUID REFERENCES data_connections(id) ON DELETE SET NULL,
  channel             TEXT NOT NULL, -- web | mobile | email | in_store | call_center | push | sms | social
  event_type          TEXT NOT NULL, -- page_view | purchase | add_to_cart | support_ticket | login | churn | etc.
  revenue             NUMERIC(14, 2),
  currency            TEXT DEFAULT 'USD',
  properties          JSONB NOT NULL DEFAULT '{}',
  session_id          TEXT,
  occurred_at         TIMESTAMPTZ NOT NULL,
  ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_customer_id ON events(customer_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(organization_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_channel ON events(organization_id, channel);
CREATE INDEX IF NOT EXISTS idx_events_external_customer ON events(organization_id, external_customer_id);

-- ============================================================
-- CUSTOMER SEGMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_segments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  segment_type        TEXT NOT NULL DEFAULT 'manual', -- manual | ai_generated | rfm | behavioral
  criteria            JSONB NOT NULL DEFAULT '{}',  -- rule-based criteria
  member_count        INTEGER NOT NULL DEFAULT 0,
  avg_clv             NUMERIC(14, 2),
  avg_churn_rate      NUMERIC(5, 4),
  color               TEXT DEFAULT '#6366f1',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_computed_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_segments_org_id ON customer_segments(organization_id);

-- ============================================================
-- SEGMENT MEMBERSHIPS (M:M)
-- ============================================================
CREATE TABLE IF NOT EXISTS segment_memberships (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  segment_id          UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  score               NUMERIC(5, 4),  -- membership confidence / relevance score
  added_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(segment_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_segment_memberships_segment ON segment_memberships(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_memberships_customer ON segment_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_segment_memberships_org ON segment_memberships(organization_id);

-- ============================================================
-- KPI SNAPSHOTS (daily org-level KPIs)
-- ============================================================
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date           DATE NOT NULL,
  total_customers         INTEGER NOT NULL DEFAULT 0,
  active_customers_30d    INTEGER NOT NULL DEFAULT 0,
  new_customers           INTEGER NOT NULL DEFAULT 0,
  churned_customers       INTEGER NOT NULL DEFAULT 0,
  churn_rate              NUMERIC(5, 4),
  total_revenue           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  avg_revenue_per_customer NUMERIC(14, 2),
  avg_clv                 NUMERIC(14, 2),
  avg_order_value         NUMERIC(14, 2),
  win_back_rate           NUMERIC(5, 4),
  nps_score               NUMERIC(5, 2),
  retention_rate_30d      NUMERIC(5, 4),
  retention_rate_90d      NUMERIC(5, 4),
  mom_growth_rate         NUMERIC(5, 4),
  metadata                JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_org_date ON kpi_snapshots(organization_id, snapshot_date DESC);

-- ============================================================
-- CUSTOMER SCORES (ML-computed scores per customer)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_scores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  churn_score         NUMERIC(5, 4) NOT NULL DEFAULT 0, -- 0=safe, 1=certain churn
  clv_score           NUMERIC(14, 2) NOT NULL DEFAULT 0, -- predicted lifetime value $
  winback_score       NUMERIC(5, 4) NOT NULL DEFAULT 0, -- likelihood of win-back if churned
  rfm_recency         SMALLINT,          -- 1-5
  rfm_frequency       SMALLINT,          -- 1-5
  rfm_monetary        SMALLINT,          -- 1-5
  rfm_segment         TEXT,              -- Champions | Loyal | At Risk | etc.
  engagement_score    NUMERIC(5, 4),
  nps_predictor       NUMERIC(5, 2),
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version       TEXT DEFAULT 'v1',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_scores_org ON customer_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_scores_customer ON customer_scores(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_scores_churn ON customer_scores(organization_id, churn_score DESC);
CREATE INDEX IF NOT EXISTS idx_customer_scores_clv ON customer_scores(organization_id, clv_score DESC);

-- ============================================================
-- PREDICTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS predictions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id             UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  prediction_type         TEXT NOT NULL, -- churn_date | next_purchase | predicted_clv | next_best_action
  predicted_value         TEXT,          -- serialized prediction value
  predicted_date          TIMESTAMPTZ,
  confidence              NUMERIC(5, 4),
  explanation             TEXT,
  features_snapshot       JSONB NOT NULL DEFAULT '{}',
  model_version           TEXT DEFAULT 'v1',
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_org ON predictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_predictions_customer ON predictions(customer_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(organization_id, prediction_type);

-- ============================================================
-- AGENT CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_conversations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL,  -- references auth.users
  title               TEXT,
  messages            JSONB NOT NULL DEFAULT '[]',
  context             JSONB NOT NULL DEFAULT '{}',
  is_pinned           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_org ON agent_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON agent_conversations(organization_id, created_at DESC);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  metric              TEXT NOT NULL,  -- churn_rate | revenue | active_customers | etc.
  operator            TEXT NOT NULL,  -- gt | lt | gte | lte | eq
  threshold           NUMERIC NOT NULL,
  severity            TEXT NOT NULL DEFAULT 'medium', -- critical | high | medium | low
  notification_channels JSONB NOT NULL DEFAULT '[]', -- [{type: 'email', target: '...'}, ...]
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  triggered_count     INTEGER NOT NULL DEFAULT 0,
  last_triggered_at   TIMESTAMPTZ,
  last_value          NUMERIC,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_org ON alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(organization_id, is_active);

-- Alert history
CREATE TABLE IF NOT EXISTS alert_history (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_id            UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  triggered_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_value        NUMERIC NOT NULL,
  threshold_value     NUMERIC NOT NULL,
  resolved_at         TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_org ON alert_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert ON alert_history(alert_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Helper function: returns all org IDs the current user belongs to
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Organizations: members can read their own orgs; owners can update
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (id = ANY(get_user_organization_ids()));

CREATE POLICY "org_insert" ON organizations
  FOR INSERT WITH CHECK (TRUE); -- handled by app layer

CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Organization members
CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "org_members_insert" ON organization_members
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Generic policy macro for org-scoped tables
CREATE POLICY "data_connections_select" ON data_connections
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "data_connections_insert" ON data_connections
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "data_connections_update" ON data_connections
  FOR UPDATE USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "data_connections_delete" ON data_connections
  FOR DELETE USING (organization_id = ANY(get_user_organization_ids()));

-- event_schemas
CREATE POLICY "event_schemas_select" ON event_schemas
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "event_schemas_insert" ON event_schemas
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "event_schemas_update" ON event_schemas
  FOR UPDATE USING (organization_id = ANY(get_user_organization_ids()));

-- customers
CREATE POLICY "customers_select" ON customers
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "customers_insert" ON customers
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "customers_update" ON customers
  FOR UPDATE USING (organization_id = ANY(get_user_organization_ids()));

-- events
CREATE POLICY "events_select" ON events
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "events_insert" ON events
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));

-- customer_segments
CREATE POLICY "segments_select" ON customer_segments
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "segments_insert" ON customer_segments
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "segments_update" ON customer_segments
  FOR UPDATE USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "segments_delete" ON customer_segments
  FOR DELETE USING (organization_id = ANY(get_user_organization_ids()));

-- segment_memberships
CREATE POLICY "memberships_select" ON segment_memberships
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "memberships_insert" ON segment_memberships
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "memberships_delete" ON segment_memberships
  FOR DELETE USING (organization_id = ANY(get_user_organization_ids()));

-- kpi_snapshots
CREATE POLICY "kpi_select" ON kpi_snapshots
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "kpi_insert" ON kpi_snapshots
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));

-- customer_scores
CREATE POLICY "scores_select" ON customer_scores
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "scores_insert" ON customer_scores
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "scores_update" ON customer_scores
  FOR UPDATE USING (organization_id = ANY(get_user_organization_ids()));

-- predictions
CREATE POLICY "predictions_select" ON predictions
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "predictions_insert" ON predictions
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));

-- agent_conversations
CREATE POLICY "conversations_select" ON agent_conversations
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()) AND user_id = auth.uid());
CREATE POLICY "conversations_insert" ON agent_conversations
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()) AND user_id = auth.uid());
CREATE POLICY "conversations_update" ON agent_conversations
  FOR UPDATE USING (organization_id = ANY(get_user_organization_ids()) AND user_id = auth.uid());

-- alerts
CREATE POLICY "alerts_select" ON alerts
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "alerts_insert" ON alerts
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "alerts_update" ON alerts
  FOR UPDATE USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "alerts_delete" ON alerts
  FOR DELETE USING (organization_id = ANY(get_user_organization_ids()));

-- alert_history
CREATE POLICY "alert_history_select" ON alert_history
  FOR SELECT USING (organization_id = ANY(get_user_organization_ids()));
CREATE POLICY "alert_history_insert" ON alert_history
  FOR INSERT WITH CHECK (organization_id = ANY(get_user_organization_ids()));

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

-- Compute RFM scores for an organization
-- Returns a table of customer_id, recency, frequency, monetary scores (1-5)
CREATE OR REPLACE FUNCTION compute_rfm(p_org_id UUID)
RETURNS TABLE(
  customer_id     UUID,
  recency_days    INTEGER,
  frequency       INTEGER,
  monetary        NUMERIC,
  rfm_recency     SMALLINT,
  rfm_frequency   SMALLINT,
  rfm_monetary    SMALLINT,
  rfm_segment     TEXT
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  RETURN QUERY
  WITH raw AS (
    SELECT
      c.id                                        AS cid,
      EXTRACT(DAY FROM (v_now - c.last_seen_at))::INTEGER AS recency_days,
      c.transaction_count                          AS frequency,
      c.total_revenue                              AS monetary
    FROM customers c
    WHERE c.organization_id = p_org_id
      AND c.last_seen_at IS NOT NULL
  ),
  percentiles AS (
    SELECT
      cid,
      recency_days,
      frequency,
      monetary,
      -- Recency: lower days = higher score
      CASE WHEN recency_days <= PERCENTILE_CONT(0.2) WITHIN GROUP (ORDER BY recency_days) OVER () THEN 5
           WHEN recency_days <= PERCENTILE_CONT(0.4) WITHIN GROUP (ORDER BY recency_days) OVER () THEN 4
           WHEN recency_days <= PERCENTILE_CONT(0.6) WITHIN GROUP (ORDER BY recency_days) OVER () THEN 3
           WHEN recency_days <= PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY recency_days) OVER () THEN 2
           ELSE 1 END::SMALLINT AS r_score,
      -- Frequency: higher = better
      NTILE(5) OVER (ORDER BY frequency)::SMALLINT AS f_score,
      -- Monetary: higher = better
      NTILE(5) OVER (ORDER BY monetary)::SMALLINT AS m_score
    FROM raw
  )
  SELECT
    cid,
    recency_days,
    frequency,
    monetary,
    r_score,
    f_score,
    m_score,
    CASE
      WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
      WHEN r_score >= 3 AND f_score >= 3 AND m_score >= 3 THEN 'Loyal Customers'
      WHEN r_score >= 4 AND f_score <= 2 THEN 'New Customers'
      WHEN r_score >= 3 AND f_score >= 3 AND m_score <= 2 THEN 'Potential Loyalists'
      WHEN r_score = 3 AND f_score = 3 THEN 'Needs Attention'
      WHEN r_score <= 3 AND f_score >= 4 AND m_score >= 4 THEN 'At Risk'
      WHEN r_score <= 2 AND f_score >= 4 THEN 'Cannot Lose Them'
      WHEN r_score <= 2 AND f_score <= 2 AND m_score >= 3 THEN 'Hibernating'
      WHEN r_score = 1 AND f_score = 1 AND m_score = 1 THEN 'Lost'
      ELSE 'Promising'
    END AS rfm_segment
  FROM percentiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get churn candidates above a given threshold
CREATE OR REPLACE FUNCTION get_churn_candidates(p_org_id UUID, p_threshold NUMERIC DEFAULT 0.7)
RETURNS TABLE(
  customer_id     UUID,
  email           TEXT,
  name            TEXT,
  churn_score     NUMERIC,
  days_since_last INTEGER,
  total_revenue   NUMERIC,
  rfm_segment     TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.email,
    c.name,
    cs.churn_score,
    EXTRACT(DAY FROM (NOW() - c.last_seen_at))::INTEGER AS days_since_last,
    c.total_revenue,
    cs.rfm_segment
  FROM customers c
  JOIN customer_scores cs ON cs.customer_id = c.id
  WHERE c.organization_id = p_org_id
    AND cs.churn_score >= p_threshold
  ORDER BY cs.churn_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_data_connections_updated_at
  BEFORE UPDATE ON data_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_event_schemas_updated_at
  BEFORE UPDATE ON event_schemas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_segments_updated_at
  BEFORE UPDATE ON customer_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customer_scores_updated_at
  BEFORE UPDATE ON customer_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_predictions_updated_at
  BEFORE UPDATE ON predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON agent_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_alerts_updated_at
  BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
