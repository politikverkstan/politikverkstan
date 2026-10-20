-- Aggregated without any individual tracking identifiers or exact observation timestamps.
CREATE TABLE IF NOT EXISTS coalition_counts (
  day TEXT NOT NULL,
  signature TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY(day, signature)
);
-- Optional separate blocked-admin security events, disabled by default.
CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stamp TEXT NOT NULL,
  ip TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category = 'admin_denied'),
  status INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_security_events_stamp ON security_events(stamp);
