"""Schema migrations through 0012, including legacy-note privacy."""
from pathlib import Path
import sqlite3

root = Path(__file__).resolve().parents[1]
sql_dir = root / "migrations"
files = sorted(sql_dir.glob("*.sql"))
assert len(files) == 12, f"Expected exactly twelve versioned SQL files; found {files}"
assert [p.name[:4] for p in files] == [f"{i:04d}" for i in range(1, 13)]

connection = sqlite3.connect(":memory:")
connection.execute("PRAGMA foreign_keys=ON")
connection.execute("PRAGMA journal_mode=MEMORY")

for i, path in enumerate(files):
    if i == 7:  # Prepare an existing v0.7.0 record before v0.8.0 upgrade.
        connection.execute(
            "INSERT INTO work_users(email,display_name,role,active,created_at) "
            "VALUES('owner@test.se','Ägare','user',1,'2026-10-01')"
        )
        connection.execute(
            "INSERT INTO work_cases"
            "(id,owner_email,title,committee,status,meeting_date,labels_json,"
            "content_json,revision,created_at,updated_at) "
            "VALUES('old-case','owner@test.se','Äldre ärende','Kommunfullmäktige',"
            "'nytt','','[]',"
            "'{\"summary\":\"Läsbart underlag\",\"meeting_notes\":\"Privat från 0.7\"}',"
            "1,'2026-10-01','2026-10-01')"
        )
    connection.executescript(path.read_text(encoding="utf-8"))
    errors = connection.execute("PRAGMA foreign_key_check").fetchall()
    assert not errors, (path.name, errors)

tables = {r[0] for r in connection.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
)}
assert {"official_meetings", "official_meeting_sources", "work_cases", "work_case_notes", "work_case_comments",
        "work_meetings", "work_meeting_items", "work_meeting_notes"} <= tables
columns = {r[1] for r in connection.execute("PRAGMA table_info(work_cases)")}
assert {"scope", "assignee_email", "content_json", "revision"} <= columns
scope, content = connection.execute(
    "SELECT scope,content_json FROM work_cases WHERE id='old-case'"
).fetchone()
assert scope == "mine", "Existing cases must remain private"
assert "meeting_notes" not in content, "Legacy private notes cannot remain in shareable content"
assert connection.execute(
    "SELECT body FROM work_case_notes WHERE case_id='old-case'"
).fetchone()[0] == "Privat från 0.7"

connection.execute(
    "INSERT INTO work_meetings(id,owner_email,title,committee,meeting_date,"
    "created_at,updated_at) VALUES("
    "'meeting1','owner@test.se','Budgetmöte','Kommunfullmäktige','2026-11-01',"
    "'2026-10-22','2026-10-22')"
)
assert connection.execute(
    "SELECT scope FROM work_meetings WHERE id='meeting1'"
).fetchone()[0] == "mine"
connection.execute(
    "INSERT INTO work_meeting_items"
    "(id,meeting_id,position,title,case_id,created_at,updated_at) "
    "VALUES('item1','meeting1',0,'Ärendepunkt','old-case','2026-10-22','2026-10-22')"
)
connection.execute(
    "INSERT INTO work_meeting_notes(meeting_id,user_email,body,updated_at) "
    "VALUES('meeting1','owner@test.se','Privat mötesnot','2026-10-22')"
)
connection.execute("DELETE FROM work_meetings WHERE id='meeting1'")
assert connection.execute(
    "SELECT COUNT(*) FROM work_meeting_items WHERE meeting_id='meeting1'"
).fetchone()[0] == 0
assert connection.execute(
    "SELECT COUNT(*) FROM work_meeting_notes WHERE meeting_id='meeting1'"
).fetchone()[0] == 0
assert connection.execute(
    "SELECT COUNT(*) FROM work_cases WHERE id='old-case'"
).fetchone()[0] == 1, "Deleting meetings must not delete linked cases"
connection.execute(
    "INSERT INTO work_tasks(id,owner_email,title,due_date,priority,created_at,updated_at) "
    "VALUES('task1','owner@test.se','Uppföljning','2026-11-02','high','2026-10-22','2026-10-22')"
)
assert connection.execute(
    "SELECT done,revision FROM work_tasks WHERE id='task1'"
).fetchone() == (0, 1), "New personal tasks must default to open"
assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
assert not connection.execute("PRAGMA foreign_key_check").fetchall()
print("PASS: migrations 0001–0011, legacy notes, private defaults, referential integrity and cascades")
