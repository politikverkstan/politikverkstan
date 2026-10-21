-- Politikverkstan 0.9.0: separate private/team meetings and agenda, independent of 0.8.0 case ownership.
-- Apply once after 0008_shared_cases.sql. Existing records remain untouched.
CREATE TABLE IF NOT EXISTS work_meetings (
 id TEXT PRIMARY KEY,
 owner_email TEXT NOT NULL REFERENCES work_users(email),
 title TEXT NOT NULL,
 committee TEXT NOT NULL,
 meeting_date TEXT NOT NULL,
 start_time TEXT NOT NULL DEFAULT '',
 location TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','held','closed')),
 scope TEXT NOT NULL DEFAULT 'mine' CHECK(scope IN ('mine','team')),
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_work_meetings_owner ON work_meetings(owner_email,meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_meetings_scope ON work_meetings(scope,meeting_date DESC);
CREATE TABLE IF NOT EXISTS work_meeting_items (
 id TEXT PRIMARY KEY,
 meeting_id TEXT NOT NULL REFERENCES work_meetings(id) ON DELETE CASCADE,
 position INTEGER NOT NULL CHECK(position>=0),
 title TEXT NOT NULL,
 case_id TEXT REFERENCES work_cases(id) ON DELETE SET NULL,
 preparation TEXT NOT NULL DEFAULT '',
 outcome TEXT NOT NULL DEFAULT '',
 follow_up TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_work_meeting_items_order ON work_meeting_items(meeting_id,position,created_at);
CREATE TABLE IF NOT EXISTS work_meeting_notes (
 meeting_id TEXT NOT NULL REFERENCES work_meetings(id) ON DELETE CASCADE,
 user_email TEXT NOT NULL REFERENCES work_users(email),
 body TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL,
 PRIMARY KEY(meeting_id,user_email)
);
