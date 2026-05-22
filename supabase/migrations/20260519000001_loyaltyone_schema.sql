-- =============================================================================
-- LoyaltyOne UAE: Core Schema Migration
-- Migration: 20260519000001_loyaltyone_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                    text        UNIQUE,
  phone                    text        UNIQUE,
  full_name                text,
  preferred_language       text        DEFAULT 'en' CHECK (preferred_language IN ('en','ar')),
  created_at               timestamptz DEFAULT now(),
  goals                    jsonb       DEFAULT '[]',
  monthly_spend_categories jsonb       DEFAULT '{}',
  reputation_score         int         DEFAULT 0,
  reputation_tier          text        DEFAULT 'newcomer'
                                         CHECK (reputation_tier IN ('newcomer','contributor','trusted','expert','maven')),
  phone_verified           bool        DEFAULT false,
  is_admin                 bool        DEFAULT false
);

-- ---------------------------------------------------------------------------
-- programs (master list, admin-managed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                         text        UNIQUE NOT NULL,
  display_name_en              text        NOT NULL,
  display_name_ar              text        NOT NULL,
  logo_url                     text,
  category                     text        NOT NULL
                                             CHECK (category IN ('retail','airline','hotel','bank','telco','gov','fitness','entertainment')),
  default_earn_rate_aed        numeric     DEFAULT 1,
  default_redemption_value_aed numeric     DEFAULT 0.01,
  expiry_rule                  jsonb       DEFAULT '{}',
  transfer_partners            jsonb       DEFAULT '[]',
  key_merchants                jsonb       DEFAULT '[]',
  official_url                 text,
  last_official_update         timestamptz DEFAULT now(),
  created_at                   timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_programs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_programs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id          uuid        NOT NULL REFERENCES programs(id),
  current_balance     numeric     DEFAULT 0,
  tier_name           text,
  expiry_dates        jsonb       DEFAULT '[]',
  tracking_method     text        DEFAULT 'manual'
                                    CHECK (tracking_method IN ('manual','email_forward','screenshot')),
  forwarding_address  text,
  last_updated_at     timestamptz DEFAULT now(),
  last_confirmed_at   timestamptz,
  UNIQUE(user_id, program_id)
);

-- ---------------------------------------------------------------------------
-- merchants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchants (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text        UNIQUE NOT NULL,
  display_name_en     text        NOT NULL,
  display_name_ar     text        NOT NULL,
  category            text[]      DEFAULT '{}',
  logo_url            text,
  location_data       jsonb       DEFAULT '{}',
  is_verified         bool        DEFAULT false,
  created_by_user_id  uuid        REFERENCES users(id),
  created_at          timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- merchant_rules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchant_rules (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id           uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  program_id            uuid        NOT NULL REFERENCES programs(id),
  rule_type             text        NOT NULL
                                      CHECK (rule_type IN ('earn','cashback','discount','bogo','multiplier')),
  earn_rate             numeric,
  multiplier            numeric,
  discount_pct          numeric,
  cashback_pct          numeric,
  applies_to_categories text[]      DEFAULT '{}',
  min_spend             numeric     DEFAULT 0,
  max_spend             numeric,
  days_of_week          int[]       DEFAULT '{}',
  start_date            date,
  end_date              date,
  source                text        DEFAULT 'community'
                                      CHECK (source IN ('official','community','personal')),
  status                text        DEFAULT 'pending'
                                      CHECK (status IN ('pending','provisional','verified','trusted','disputed','expired')),
  submitted_by_user_id  uuid        REFERENCES users(id),
  verified_by_user_id   uuid        REFERENCES users(id),
  upvotes               int         DEFAULT 0,
  downvotes             int         DEFAULT 0,
  confirmations         int         DEFAULT 0,
  disputes              int         DEFAULT 0,
  confidence_score      numeric     DEFAULT 0,
  evidence_attachments  text[]      DEFAULT '{}',
  description_text      text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  last_confirmed_at     timestamptz
);

-- ---------------------------------------------------------------------------
-- rule_confirmations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rule_confirmations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id      uuid        NOT NULL REFERENCES merchant_rules(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES users(id),
  action       text        NOT NULL CHECK (action IN ('confirm','dispute','upvote','downvote')),
  evidence_url text,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(rule_id, user_id, action)
);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_id                uuid        REFERENCES merchants(id),
  amount_aed                 numeric     NOT NULL,
  recommended_rule_id        uuid        REFERENCES merchant_rules(id),
  used_rule_id               uuid        REFERENCES merchant_rules(id),
  points_earned              numeric,
  discount_applied_aed       numeric     DEFAULT 0,
  cashback_aed               numeric     DEFAULT 0,
  payment_method             text,
  receipt_url                text,
  notes                      text,
  estimated_value_aed        numeric,
  was_recommendation_followed bool,
  created_at                 timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- recommendations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_id         uuid        REFERENCES merchants(id),
  spend_estimate      numeric,
  considered_programs jsonb       DEFAULT '[]',
  chosen_program_id   uuid        REFERENCES programs(id),
  reasoning_text      text,
  alternatives        jsonb       DEFAULT '[]',
  was_followed        bool,
  created_at          timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- expiring_alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expiring_alerts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_program_id     uuid        NOT NULL REFERENCES user_programs(id) ON DELETE CASCADE,
  amount              numeric     NOT NULL,
  expires_at          timestamptz NOT NULL,
  alert_level         text        NOT NULL CHECK (alert_level IN ('30d','14d','7d','1d')),
  notified_at         timestamptz,
  estimated_value_aed numeric
);

-- ---------------------------------------------------------------------------
-- reputation_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reputation_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type     text        NOT NULL,
  points_delta   int         NOT NULL,
  reference_id   uuid,
  reference_type text,
  created_at     timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- monthly_rewards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_rewards (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES users(id),
  month            date        NOT NULL,
  rank             int,
  reward_type      text,
  reward_value_aed numeric,
  awarded_at       timestamptz DEFAULT now(),
  claimed_at       timestamptz
);

-- ---------------------------------------------------------------------------
-- inbound_emails
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inbound_emails (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_email_text  text,
  sender          text,
  subject         text,
  parsed_data     jsonb,
  parsing_status  text        DEFAULT 'pending'
                                CHECK (parsing_status IN ('pending','success','failed','unknown_program')),
  created_at      timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- admin_review_queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_review_queue (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name            text        NOT NULL,
  record_id             uuid        NOT NULL,
  action_type           text        NOT NULL,
  submitted_by_user_id  uuid        REFERENCES users(id),
  status                text        DEFAULT 'pending'
                                      CHECK (status IN ('pending','approved','rejected')),
  reviewed_by           uuid        REFERENCES users(id),
  reviewed_at           timestamptz,
  notes                 text,
  created_at            timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- prompt_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompt_templates (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key         text        UNIQUE NOT NULL,
  name                 text        NOT NULL,
  system_prompt        text        NOT NULL,
  user_prompt_template text,
  version              int         DEFAULT 1,
  is_active            bool        DEFAULT true,
  updated_by           uuid        REFERENCES users(id),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_reputation_tier
  ON users (reputation_tier);

CREATE INDEX IF NOT EXISTS idx_user_programs_user_id
  ON user_programs (user_id);

CREATE INDEX IF NOT EXISTS idx_merchant_rules_merchant_program_status
  ON merchant_rules (merchant_id, program_id, status);

CREATE INDEX IF NOT EXISTS idx_merchant_rules_confidence_score
  ON merchant_rules (confidence_score);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created
  ON transactions (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_rule_confirmations_rule_user
  ON rule_confirmations (rule_id, user_id);
