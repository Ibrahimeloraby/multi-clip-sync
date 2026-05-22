-- =============================================================================
-- LoyaltyOne UAE: Row Level Security Policies
-- Migration: 20260519000002_rls_policies.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: is_admin()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM users WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_programs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expiring_alerts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_rewards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_emails    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates  ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- users
-- =============================================================================

-- SELECT own row
CREATE POLICY users_select_own ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- UPDATE own row
CREATE POLICY users_update_own ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can see all users
CREATE POLICY users_select_admin ON users
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- programs
-- =============================================================================

-- All authenticated users can read programs
CREATE POLICY programs_select_authenticated ON programs
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert programs
CREATE POLICY programs_insert_admin ON programs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update programs
CREATE POLICY programs_update_admin ON programs
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete programs
CREATE POLICY programs_delete_admin ON programs
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- user_programs
-- =============================================================================

CREATE POLICY user_programs_select_own ON user_programs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_programs_insert_own ON user_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_programs_update_own ON user_programs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_programs_delete_own ON user_programs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- merchants
-- =============================================================================

-- All authenticated users can read merchants
CREATE POLICY merchants_select_authenticated ON merchants
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert merchants
CREATE POLICY merchants_insert_authenticated ON merchants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update merchants they submitted; admins can update all
CREATE POLICY merchants_update_own_or_admin ON merchants
  FOR UPDATE
  TO authenticated
  USING (created_by_user_id = auth.uid() OR is_admin())
  WITH CHECK (created_by_user_id = auth.uid() OR is_admin());

-- Only admins can delete merchants
CREATE POLICY merchants_delete_admin ON merchants
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- merchant_rules
-- =============================================================================

-- All authenticated users can read non-expired rules
CREATE POLICY merchant_rules_select_active ON merchant_rules
  FOR SELECT
  TO authenticated
  USING (status != 'expired');

-- Phone-verified authenticated users can submit rules
CREATE POLICY merchant_rules_insert_phone_verified ON merchant_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND phone_verified = true
    )
  );

-- Admins can update rules
CREATE POLICY merchant_rules_update_admin ON merchant_rules
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete rules
CREATE POLICY merchant_rules_delete_admin ON merchant_rules
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- rule_confirmations
-- =============================================================================

-- Users can see their own confirmations
CREATE POLICY rule_confirmations_select_own ON rule_confirmations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can insert confirmations with 90-day rate limit:
-- max 10 confirmations per user per 90 days
CREATE POLICY rule_confirmations_insert_rate_limited ON rule_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      SELECT COUNT(*)
      FROM rule_confirmations rc
      WHERE rc.user_id = auth.uid()
        AND rc.created_at > (now() - INTERVAL '90 days')
    ) < 100
  );

-- No UPDATE on rule_confirmations (immutable audit trail)

-- =============================================================================
-- transactions
-- =============================================================================

CREATE POLICY transactions_select_own ON transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY transactions_insert_own ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY transactions_update_own ON transactions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY transactions_delete_own ON transactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- recommendations
-- =============================================================================

CREATE POLICY recommendations_select_own ON recommendations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY recommendations_insert_own ON recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY recommendations_update_own ON recommendations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY recommendations_delete_own ON recommendations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- expiring_alerts
-- =============================================================================

CREATE POLICY expiring_alerts_select_own ON expiring_alerts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- reputation_events
-- =============================================================================

CREATE POLICY reputation_events_select_own ON reputation_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- monthly_rewards
-- =============================================================================

CREATE POLICY monthly_rewards_select_own ON monthly_rewards
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- inbound_emails
-- =============================================================================

CREATE POLICY inbound_emails_select_own ON inbound_emails
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY inbound_emails_insert_own ON inbound_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY inbound_emails_update_own ON inbound_emails
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY inbound_emails_delete_own ON inbound_emails
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- admin_review_queue
-- =============================================================================

-- Authenticated users can read the queue
CREATE POLICY admin_review_queue_select_authenticated ON admin_review_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can submit items
CREATE POLICY admin_review_queue_insert_authenticated ON admin_review_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins get full CRUD
CREATE POLICY admin_review_queue_update_admin ON admin_review_queue
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY admin_review_queue_delete_admin ON admin_review_queue
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- prompt_templates
-- =============================================================================

-- Authenticated users can read active templates
CREATE POLICY prompt_templates_select_authenticated ON prompt_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin());

-- Admins have full CRUD
CREATE POLICY prompt_templates_insert_admin ON prompt_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY prompt_templates_update_admin ON prompt_templates
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY prompt_templates_delete_admin ON prompt_templates
  FOR DELETE
  TO authenticated
  USING (is_admin());
