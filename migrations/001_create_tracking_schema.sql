CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(64) NOT NULL UNIQUE,
  event_name VARCHAR(150) NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  product_name VARCHAR(100) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  producer VARCHAR(50) NOT NULL,
  source_of_truth VARCHAR(50) NOT NULL,

  user_id VARCHAR(255),
  anonymous_id VARCHAR(255),
  session_id VARCHAR(255),
  identity_key VARCHAR(255),
  resolved_user_state VARCHAR(50) NOT NULL,

  campaign_name VARCHAR(255),
  source VARCHAR(255),
  medium VARCHAR(255),
  referer TEXT,
  attribution_source_type VARCHAR(50),

  schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  trace_id VARCHAR(255),
  idempotency_key VARCHAR(255),
  validation_status VARCHAR(20) NOT NULL,
  validation_errors JSONB,

  parameters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL,

  CONSTRAINT chk_tracking_events_platform
    CHECK (platform IN ('web', 'android', 'ios', 'backend')),
  CONSTRAINT chk_tracking_events_producer
    CHECK (producer IN ('client', 'backend', 'system')),
  CONSTRAINT chk_tracking_events_source_of_truth
    CHECK (source_of_truth IN ('client', 'backend', 'system')),
  CONSTRAINT chk_tracking_events_validation_status
    CHECK (validation_status IN ('valid', 'warning')),
  CONSTRAINT chk_tracking_events_resolved_user_state
    CHECK (resolved_user_state IN ('anonymous', 'identified', 'backend_identified')),
  CONSTRAINT chk_tracking_events_identity_presence
    CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_event_name
  ON tracking_events (event_name);
CREATE INDEX IF NOT EXISTS idx_tracking_events_event_time
  ON tracking_events (event_time DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_product_name
  ON tracking_events (product_name);
CREATE INDEX IF NOT EXISTS idx_tracking_events_platform
  ON tracking_events (platform);
CREATE INDEX IF NOT EXISTS idx_tracking_events_user_id
  ON tracking_events (user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_events_anonymous_id
  ON tracking_events (anonymous_id)
  WHERE anonymous_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_events_session_id
  ON tracking_events (session_id)
  WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_events_identity_key
  ON tracking_events (identity_key)
  WHERE identity_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_events_campaign
  ON tracking_events (campaign_name, source, medium);
CREATE INDEX IF NOT EXISTS idx_tracking_events_received_at
  ON tracking_events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_parameters_json
  ON tracking_events USING GIN (parameters_json);
CREATE INDEX IF NOT EXISTS idx_tracking_events_raw_payload
  ON tracking_events USING GIN (raw_payload);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tracking_events_backend_callback_idempotency
  ON tracking_events (event_name, idempotency_key)
  WHERE producer = 'backend' AND idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS identity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  first_linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT chk_identity_links_non_empty
    CHECK (anonymous_id <> '' AND user_id <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_identity_links_identity
  ON identity_links (anonymous_id, user_id, product_name);
CREATE INDEX IF NOT EXISTS idx_identity_links_anonymous_id
  ON identity_links (anonymous_id);
CREATE INDEX IF NOT EXISTS idx_identity_links_user_id
  ON identity_links (user_id);
CREATE INDEX IF NOT EXISTS idx_identity_links_product_name
  ON identity_links (product_name);
CREATE INDEX IF NOT EXISTS idx_identity_links_active
  ON identity_links (is_active);

CREATE TABLE IF NOT EXISTS tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL UNIQUE,
  product_name VARCHAR(100) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  anonymous_id VARCHAR(255),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  landing_page TEXT,
  campaign_name VARCHAR(255),
  source VARCHAR(255),
  medium VARCHAR(255),
  referer TEXT,
  attribution_source_type VARCHAR(50),
  raw_attribution JSONB,
  CONSTRAINT chk_tracking_sessions_platform
    CHECK (platform IN ('web', 'android', 'ios', 'backend'))
);

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_user_id
  ON tracking_sessions (user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_anonymous_id
  ON tracking_sessions (anonymous_id)
  WHERE anonymous_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_started_at
  ON tracking_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_campaign
  ON tracking_sessions (campaign_name, source, medium);

CREATE TABLE IF NOT EXISTS tracking_invalid_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(150),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  product_name VARCHAR(100),
  platform VARCHAR(50),
  error_code VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  validation_errors JSONB,
  raw_payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tracking_invalid_events_received_at
  ON tracking_invalid_events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_invalid_events_event_name
  ON tracking_invalid_events (event_name);
CREATE INDEX IF NOT EXISTS idx_tracking_invalid_events_error_code
  ON tracking_invalid_events (error_code);

CREATE TABLE IF NOT EXISTS tracking_event_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(100) NOT NULL,
  event_name VARCHAR(150) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  producer VARCHAR(50) NOT NULL,
  source_of_truth VARCHAR(50) NOT NULL,
  description TEXT,
  required_parameters TEXT[] NOT NULL DEFAULT '{}',
  optional_parameters TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tracking_event_registry_event
    UNIQUE (product_name, event_name, platform),
  CONSTRAINT chk_tracking_event_registry_platform
    CHECK (platform IN ('web', 'android', 'ios', 'backend')),
  CONSTRAINT chk_tracking_event_registry_producer
    CHECK (producer IN ('client', 'backend', 'system')),
  CONSTRAINT chk_tracking_event_registry_source_of_truth
    CHECK (source_of_truth IN ('client', 'backend', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_tracking_event_registry_event_name
  ON tracking_event_registry (event_name);
CREATE INDEX IF NOT EXISTS idx_tracking_event_registry_product
  ON tracking_event_registry (product_name);
CREATE INDEX IF NOT EXISTS idx_tracking_event_registry_active
  ON tracking_event_registry (is_active);
