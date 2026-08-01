PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS checkpoints (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  discovered INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  detail TEXT
);

CREATE TABLE IF NOT EXISTS sources (
  source_key TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK(source_type IN ('GMAIL','DRIVE')),
  external_id TEXT NOT NULL,
  revision TEXT,
  modified_at TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  title_hash TEXT,
  mime_type TEXT,
  client_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  priority TEXT NOT NULL DEFAULT 'VERDE',
  priority_score INTEGER NOT NULL DEFAULT 0,
  material_type TEXT NOT NULL DEFAULT 'Datos',
  draft_file_id TEXT,
  draft_url TEXT,
  slack_channel TEXT,
  slack_ts TEXT,
  notion_page_id TEXT,
  analysis_json TEXT NOT NULL,
  metadata_json TEXT,
  previous_source_key TEXT,
  processed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sources_client_ref ON sources(client_ref, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_slack ON sources(slack_channel, slack_ts);
CREATE INDEX IF NOT EXISTS idx_sources_status_priority ON sources(status, priority_score DESC);

CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('APROBADO','REVISAR','POSPUESTO','DESCARTADO')),
  slack_user_id TEXT,
  slack_reaction TEXT,
  note TEXT,
  decided_at TEXT NOT NULL,
  FOREIGN KEY(source_key) REFERENCES sources(source_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_usage (
  day TEXT PRIMARY KEY,
  ai_calls INTEGER NOT NULL DEFAULT 0,
  items_processed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_receipts (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL
);

INSERT OR IGNORE INTO checkpoints(key, value, updated_at)
VALUES ('system_initialized_at', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
