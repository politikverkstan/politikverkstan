-- Optional reference to one public MeetingPlus meeting for a user's own preparation.
-- Never copies the external meeting into work_meetings automatically.
-- Existing meetings, sharing ACLs, agendas and private notes are unchanged.
ALTER TABLE work_meetings ADD COLUMN official_source_url TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_work_meetings_official_source ON work_meetings(official_source_url);
