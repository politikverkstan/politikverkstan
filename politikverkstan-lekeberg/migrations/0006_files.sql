-- 0.5.4: Private and team file area, stored in D1 without external storage bindings.
-- Apply after 0005_branding.sql. Existing motion and user data are unchanged.
CREATE TABLE IF NOT EXISTS work_folders (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL REFERENCES work_users(email),
  scope TEXT NOT NULL CHECK(scope IN ('mine','team')),
  parent_id TEXT REFERENCES work_folders(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_folders_scope_owner ON work_folders(scope,owner_email,parent_id);
CREATE TABLE IF NOT EXISTS work_files (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL REFERENCES work_users(email),
  scope TEXT NOT NULL CHECK(scope IN ('mine','team')),
  folder_id TEXT REFERENCES work_folders(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_scope_owner ON work_files(scope,owner_email,folder_id);
CREATE TABLE IF NOT EXISTS work_file_chunks (
  file_id TEXT NOT NULL REFERENCES work_files(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  data_base64 TEXT NOT NULL,
  PRIMARY KEY(file_id,seq)
);
