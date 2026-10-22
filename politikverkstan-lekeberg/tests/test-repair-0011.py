"""Non-destructive SQL repair for an interrupted 0011 D1 migration.

The repair must preserve already-created case history and existing cases,
and it must be idempotent. Test against the project's genuine SQLite schemas.
"""
from pathlib import Path
import sqlite3

root=Path(__file__).resolve().parents[1]
db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
migrations=sorted((root/'migrations').glob('*.sql'))
for path in migrations:
    if path.name.startswith('0011_'):
        break
    db.executescript(path.read_text(encoding='utf8'))

db.execute("""INSERT INTO work_users(email,display_name,role,active,created_at)
 VALUES('owner@test.se','Ägare','user',1,'2026-10-22')""")
db.execute("""INSERT INTO work_cases
 (id,owner_email,title,committee,status,meeting_date,labels_json,
 content_json,created_at,updated_at)
 VALUES('old-case','owner@test.se','Budget BUN','Kommunfullmäktige','nytt',
 '','[]','{"summary":"Befintlig verksamhet"}','2026-10-22','2026-10-22')""")

# Reproduce the user's state: case audit events exists, but two 1.0
# workflow tables and their audit triggers do not.
original=(root/'migrations'/'0011_traceability.sql').read_text(encoding='utf8')
partial=original.split('CREATE TABLE work_followups (',1)[0]
assert 'CREATE TRIGGER work_case_audit_update' in partial
db.executescript(partial)
db.execute("""UPDATE work_cases SET title='Budget BUN 2026',
 scope='team',revision=revision+1,last_editor_email='owner@test.se'
 WHERE id='old-case'""")
baseline=db.execute('SELECT COUNT(*) FROM work_case_events').fetchone()[0]
assert baseline==1

repair=(root/'ops'/'repair_0011_missing_tables.sql').read_text(encoding='utf8')
for _ in range(2):
    db.executescript(repair)
assert {'work_followups','work_case_positions','work_case_events'} <= {
    x[0] for x in db.execute("SELECT name FROM sqlite_master WHERE type='table'")
}
expected_triggers={
 'work_case_audit_create','work_case_audit_update',
 'work_followups_audit_create','work_followups_audit_update',
 'work_positions_audit_create','work_positions_audit_update'
}
assert expected_triggers <= {
    x[0] for x in db.execute("SELECT name FROM sqlite_master WHERE type='trigger'")
}
expected_indexes={'idx_case_events_history','idx_followups_case_status','idx_followups_assignee'}
assert expected_indexes <= {
    x[0] for x in db.execute("SELECT name FROM sqlite_master WHERE type='index'")
}
assert db.execute("SELECT title FROM work_cases WHERE id='old-case'").fetchone()[0]=='Budget BUN 2026'
assert db.execute('SELECT COUNT(*) FROM work_case_events').fetchone()[0]==baseline
assert not db.execute('PRAGMA foreign_key_check').fetchall()
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'

db.execute("""INSERT INTO work_followups
 (id,case_id,title,details,status,creator_email,editor_email,created_at,updated_at)
 VALUES('followup-1','old-case','Verifiera finansiering','','open',
 'owner@test.se','owner@test.se','2026-10-22','2026-10-22')""")
db.execute("""UPDATE work_followups SET status='done',revision=revision+1,
 editor_email='owner@test.se',updated_at='2026-10-23'
 WHERE id='followup-1'""")
db.execute("""INSERT INTO work_case_positions
 (case_id,body,status,actor_email,created_at,updated_at)
 VALUES('old-case','Internt underlag','discussion',
 'owner@test.se','2026-10-22','2026-10-22')""")
kinds={row[0] for row in db.execute('SELECT kind FROM work_case_events')}
assert {'edited','sharing','followup','position'} & kinds=={'sharing','followup','position'}
assert db.execute('SELECT COUNT(*) FROM work_case_events').fetchone()[0]==baseline+3
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert not db.execute('PRAGMA foreign_key_check').fetchall()
print('PASS partial 0011 recovery: no data loss, idempotent tables/triggers and audit writes')
