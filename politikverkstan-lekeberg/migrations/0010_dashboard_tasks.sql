-- 0.9.2: Personal work overview tasks. No access granted to other workroom users.
-- Run once after 0009_meetings.sql. Existing cases, motions, meetings remain unchanged.
CREATE TABLE IF NOT EXISTS work_tasks (
 id TEXT PRIMARY KEY,
 owner_email TEXT NOT NULL REFERENCES work_users(email),
 title TEXT NOT NULL,
 due_date TEXT NOT NULL DEFAULT '',
 priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('high','normal','low')),
 done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)),
 case_id TEXT REFERENCES work_cases(id) ON DELETE SET NULL,
 meeting_id TEXT REFERENCES work_meetings(id) ON DELETE SET NULL,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_work_tasks_owner_status_due ON work_tasks(owner_email,done,due_date,updated_at DESC);
