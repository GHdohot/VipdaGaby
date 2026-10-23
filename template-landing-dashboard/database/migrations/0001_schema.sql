PRAGMA foreign_keys = ON;

CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  country_code TEXT,
  language TEXT,
  offer_key TEXT,
  device_type TEXT,
  browser_family TEXT,
  os_family TEXT,
  page_key TEXT NOT NULL,
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  created_at INTEGER NOT NULL
, duration_seconds INTEGER, button_key TEXT, payment_method TEXT, destination_type TEXT, variant_key TEXT);

CREATE TABLE analytics_maintenance (
  operation_id TEXT PRIMARY KEY,
  cleanup_day TEXT NOT NULL
);

CREATE TABLE operation_settings (
  operation_id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE "orders" (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  asset TEXT NOT NULL CHECK (asset IN ('USDC', 'USDT', 'SOL')),
  mint TEXT,
  amount TEXT NOT NULL,
  amount_atomic TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  sol_usd TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired')),
  signature TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  paid_at INTEGER,
  operation_id TEXT NOT NULL DEFAULT 'primary',
  session_id TEXT
);

CREATE TABLE payment_claims (
  signature TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE stripe_payments (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  analytics_session_id TEXT,
  plan_key TEXT NOT NULL,
  amount_total INTEGER NOT NULL,
  currency TEXT NOT NULL,
  checkout_status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  payment_intent_id TEXT,
  customer_email TEXT,
  country_code TEXT,
  language TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  paid_at INTEGER
);

CREATE INDEX analytics_operation_button_idx
  ON analytics_events(operation_id, button_key, created_at DESC);

CREATE INDEX analytics_operation_event_idx
  ON analytics_events(operation_id, event_type, created_at DESC);

CREATE INDEX analytics_operation_method_idx
  ON analytics_events(operation_id, payment_method, created_at DESC);

CREATE INDEX analytics_operation_session_idx
  ON analytics_events(operation_id, session_id, created_at DESC);

CREATE INDEX analytics_operation_time_idx
  ON analytics_events(operation_id, created_at DESC);

CREATE INDEX analytics_operation_variant_idx
  ON analytics_events(operation_id, variant_key, created_at DESC);

CREATE INDEX orders_operation_created_idx ON orders(operation_id, created_at DESC);

CREATE INDEX orders_operation_status_idx ON orders(operation_id, status, created_at DESC);

CREATE INDEX orders_status_expiry_idx ON orders(status, expires_at);

CREATE INDEX stripe_payments_analytics_session_idx
  ON stripe_payments(operation_id, analytics_session_id, created_at DESC);

CREATE INDEX stripe_payments_campaign_idx
  ON stripe_payments(operation_id, utm_campaign, created_at DESC);

CREATE INDEX stripe_payments_operation_created_idx
  ON stripe_payments(operation_id, created_at DESC);

CREATE INDEX stripe_payments_operation_status_idx
  ON stripe_payments(operation_id, payment_status, created_at DESC);

