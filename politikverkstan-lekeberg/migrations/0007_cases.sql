-- 0.7.0 / Etapp 2: strictly private casework for one authenticated user.
-- Apply AFTER 0006_files.sql. No automatic sharing or public endpoints.
CREATE TABLE IF NOT EXISTS work_cases (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL REFERENCES work_users(email),
  title TEXT NOT NULL,
  committee TEXT NOT NULL DEFAULT 'Annat',
  status TEXT NOT NULL DEFAULT 'nytt' CHECK(status IN ('nytt','granskning','stallningstagande','beslutat','uppfoljning','avslutat')),
  meeting_date TEXT NOT NULL DEFAULT '',
  labels_json TEXT NOT NULL DEFAULT '[]',
  content_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_work_cases_owner_updated ON work_cases(owner_email, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_cases_owner_meeting ON work_cases(owner_email,meeting_date);
