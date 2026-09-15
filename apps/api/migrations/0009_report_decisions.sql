CREATE TABLE remeet_report_decisions (
  report_id TEXT PRIMARY KEY,
  decision TEXT NOT NULL CHECK(decision IN ('delete', 'dismiss')),
  report_digest TEXT NOT NULL,
  decided_at TEXT NOT NULL
);
CREATE TABLE remeet_moderation_proposals (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  request TEXT NOT NULL,
  action TEXT,
  base_revision INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  completed_revision INTEGER
);
