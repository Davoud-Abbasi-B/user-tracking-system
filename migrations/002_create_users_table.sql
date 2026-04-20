CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(255) PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_login_at TIMESTAMPTZ NOT NULL,
  login_count INTEGER NOT NULL DEFAULT 1,

  first_campaign_name VARCHAR(255),
  first_source VARCHAR(150),
  first_medium VARCHAR(150),

  last_campaign_name VARCHAR(255),
  last_source VARCHAR(150),
  last_medium VARCHAR(150),
  last_referer TEXT,
  last_landing_page TEXT,

  last_platform VARCHAR(20),
  last_product_name VARCHAR(100),
  last_store VARCHAR(150),

  schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  trace_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_users_last_platform
    CHECK (last_platform IN ('web', 'android', 'ios', 'backend') OR last_platform IS NULL),
  CONSTRAINT chk_users_login_count_positive
    CHECK (login_count >= 1)
);

CREATE INDEX IF NOT EXISTS idx_users_last_login_at
  ON users (last_login_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_last_campaign
  ON users (last_campaign_name, last_source, last_medium);

CREATE INDEX IF NOT EXISTS idx_users_last_platform
  ON users (last_platform);
