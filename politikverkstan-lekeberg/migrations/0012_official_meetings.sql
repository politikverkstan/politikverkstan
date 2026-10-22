-- Public MeetingPlus meeting calendar, kept separate from private work_meetings.
-- Only public meeting metadata; never imports agenda text, files or private notes.
CREATE TABLE official_meetings (
 source_url TEXT PRIMARY KEY CHECK(source_url LIKE 'https://meetings.lekeberg.se/committees/%'),
 committee_key TEXT NOT NULL CHECK(committee_key IN ('kf','bun','sn','ks')),
 committee TEXT NOT NULL,
 meeting_date TEXT NOT NULL,
 start_time TEXT NOT NULL DEFAULT '',
 end_time TEXT NOT NULL DEFAULT '',
 location TEXT NOT NULL DEFAULT '',
 first_seen_at TEXT NOT NULL,
 last_seen_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX idx_official_meetings_date ON official_meetings(meeting_date,committee_key);
CREATE TABLE official_meeting_sources (
 committee_key TEXT PRIMARY KEY CHECK(committee_key IN ('kf','bun','sn','ks')),
 source_url TEXT NOT NULL,
 last_attempt_at TEXT NOT NULL,
 last_success_at TEXT NOT NULL DEFAULT '',
 last_count INTEGER NOT NULL DEFAULT 0,
 last_error TEXT NOT NULL DEFAULT ''
);
