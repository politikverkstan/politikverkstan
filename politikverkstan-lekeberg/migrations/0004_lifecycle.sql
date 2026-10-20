-- Politikverkstan 0.5.2. One-time migration AFTER 0003_collaboration.sql.
-- Preserves all content; existing motions remain active and existing idea status is untouched.
ALTER TABLE work_motions ADD COLUMN archived_at TEXT;
ALTER TABLE work_motions ADD COLUMN archived_by TEXT;
ALTER TABLE work_motions ADD COLUMN trashed_at TEXT;
CREATE INDEX IF NOT EXISTS idx_work_motions_lifecycle ON work_motions(owner_email,trashed_at,archived_at,updated_at);
CREATE TABLE IF NOT EXISTS work_idea_status_history (
 id TEXT PRIMARY KEY,
 idea_id TEXT NOT NULL REFERENCES work_ideas(id) ON DELETE CASCADE,
 old_status TEXT NOT NULL,
 new_status TEXT NOT NULL,
 editor_email TEXT NOT NULL,
 changed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_work_idea_status_history ON work_idea_status_history(idea_id,changed_at);
