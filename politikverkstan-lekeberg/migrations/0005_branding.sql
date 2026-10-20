-- 0.5.3: optional admin-provided logo. No existing tables are changed.
CREATE TABLE IF NOT EXISTS work_branding (
  id INTEGER PRIMARY KEY CHECK(id=1),
  png_base64 TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
