-- 0.8.0: Shared cases inside the single approved SD Lekeberg workspace.
-- Apply ONCE after 0007_cases.sql. All existing cases remain private.
ALTER TABLE work_cases ADD COLUMN scope TEXT NOT NULL DEFAULT 'mine' CHECK(scope IN ('mine','team'));
ALTER TABLE work_cases ADD COLUMN assignee_email TEXT REFERENCES work_users(email);
CREATE INDEX IF NOT EXISTS idx_work_cases_team_updated ON work_cases(scope,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_cases_assignee ON work_cases(assignee_email,status);
CREATE TABLE IF NOT EXISTS work_case_notes(
  case_id TEXT NOT NULL REFERENCES work_cases(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES work_users(email),
  body TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  PRIMARY KEY(case_id,user_email)
);
CREATE TABLE IF NOT EXISTS work_case_comments(
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES work_cases(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL REFERENCES work_users(email),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_work_case_comments_created ON work_case_comments(case_id,created_at);
-- Keep 0.7.0 meeting notes private before any dossier may be shared.
INSERT INTO work_case_notes(case_id,user_email,body,updated_at)
 SELECT id,owner_email,json_extract(content_json,'$.meeting_notes'),updated_at
 FROM work_cases WHERE json_type(content_json,'$.meeting_notes')='text'
   AND length(json_extract(content_json,'$.meeting_notes'))>0
 ON CONFLICT(case_id,user_email) DO NOTHING;
UPDATE work_cases SET content_json=json_remove(content_json,'$.meeting_notes')
 WHERE json_type(content_json,'$.meeting_notes') IS NOT NULL;
