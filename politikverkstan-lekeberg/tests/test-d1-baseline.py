"""Test one-time D1 migration ledger baselining without touching user data."""
from pathlib import Path
import sqlite3

root=Path(__file__).resolve().parents[1]
db=sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
files=sorted((root/"migrations").glob("*.sql"))
assert len(files)==11

for path in files:
    db.executescript(path.read_text(encoding="utf8"))
db.execute("""INSERT INTO work_users(email,display_name,role,active,created_at)
 VALUES('owner@test.se','Ägare','user',1,'2026-10-22')""")
db.execute("""INSERT INTO work_cases
 (id,owner_email,title,committee,status,meeting_date,labels_json,content_json,created_at,updated_at)
 VALUES('case-1','owner@test.se','Sparat ärende','Kommunfullmäktige','nytt',
 '','[]','{}','2026-10-22','2026-10-22')""")
events=db.execute("SELECT COUNT(*) FROM work_case_events").fetchone()[0]

baseline=(root/"ops"/"manual-baseline-0001-to-0011.sql").read_text(encoding="utf8")
# Make a copy of a plausible partial installation: audit and tables present but an index missing.
db.execute("DROP INDEX idx_followups_assignee")
db.executescript(baseline)
assert db.execute("SELECT COUNT(*) FROM d1_migrations").fetchone()[0]==0, "Incomplete schema must never be marked as migrated"

# Complete the missing index and repeat the guarded baseline, then confirm idempotency.
db.execute("CREATE INDEX idx_followups_assignee ON work_followups(assignee_email,status,due_date)")
db.executescript(baseline)
assert [row[0] for row in db.execute("SELECT name FROM d1_migrations ORDER BY id")]==[p.name for p in files]
db.executescript(baseline)
assert db.execute("SELECT COUNT(*) FROM d1_migrations").fetchone()[0]==11
assert db.execute("SELECT title FROM work_cases WHERE id='case-1'").fetchone()[0]=='Sparat ärende'
assert db.execute("SELECT COUNT(*) FROM work_case_events").fetchone()[0]==events
assert not db.execute("PRAGMA foreign_key_check").fetchall()
assert db.execute("PRAGMA integrity_check").fetchone()[0]=='ok'
print("PASS D1 ledger baseline: refuses incomplete schema, preserves data, idempotent 11 rows")
