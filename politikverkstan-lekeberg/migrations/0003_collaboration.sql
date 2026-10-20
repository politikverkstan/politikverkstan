-- Politikverkstan 0.5.1. Apply exactly ONCE after 0002_workroom.sql.
-- All legacy motion rows remain private (team_permission = 'none'). No DELETE or DROP.
ALTER TABLE work_motions ADD COLUMN team_permission TEXT NOT NULL DEFAULT 'none' CHECK(team_permission IN ('none','read','comment','edit'));
ALTER TABLE work_motions ADD COLUMN origin_idea_id TEXT;
ALTER TABLE work_motion_versions ADD COLUMN editor_email TEXT;
CREATE TABLE IF NOT EXISTS work_motion_shares (
  motion_id TEXT NOT NULL REFERENCES work_motions(id) ON DELETE CASCADE,
  email TEXT NOT NULL REFERENCES work_users(email),
  permission TEXT NOT NULL CHECK(permission IN ('read','comment','edit')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(motion_id,email)
);
CREATE INDEX IF NOT EXISTS idx_work_shares_user ON work_motion_shares(email,motion_id);
CREATE TABLE IF NOT EXISTS work_motion_comments (
  id TEXT PRIMARY KEY,
  motion_id TEXT NOT NULL REFERENCES work_motions(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL REFERENCES work_users(email),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_motion_comments ON work_motion_comments(motion_id,created_at);
ALTER TABLE work_ideas ADD COLUMN owner_email TEXT REFERENCES work_users(email);
ALTER TABLE work_ideas ADD COLUMN status TEXT NOT NULL DEFAULT 'ny' CHECK(status IN ('ny','diskussion','underlag','redo','motion','avslutad'));
ALTER TABLE work_ideas ADD COLUMN updated_at TEXT;
CREATE TABLE IF NOT EXISTS work_idea_comments (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES work_ideas(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL REFERENCES work_users(email),
  body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idea_comments ON work_idea_comments(idea_id,created_at);
UPDATE work_ideas SET updated_at=created_at WHERE updated_at IS NULL;
