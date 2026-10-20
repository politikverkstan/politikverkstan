-- Private workspace: no links to visitor/IP/telemetry tables.
CREATE TABLE IF NOT EXISTS work_users (
  email TEXT PRIMARY KEY, display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK(role IN ('admin','user')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS work_motions (
  id TEXT PRIMARY KEY, owner_email TEXT NOT NULL REFERENCES work_users(email),
  title TEXT NOT NULL, status TEXT NOT NULL, category TEXT NOT NULL,
  content_json TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_work_owner_updated ON work_motions(owner_email,updated_at DESC);
CREATE TABLE IF NOT EXISTS work_motion_versions (
  motion_id TEXT NOT NULL REFERENCES work_motions(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL, content_json TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY(motion_id,revision)
);
CREATE TABLE IF NOT EXISTS work_ideas (
  id TEXT PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL,
  problem TEXT NOT NULL DEFAULT '',action TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
