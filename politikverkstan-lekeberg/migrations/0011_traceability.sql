-- 1.0: Case audit trail, tracked follow-ups and explicitly anchored positions.
-- Apply exactly once after 0010. All old case data remains private by default.
ALTER TABLE work_cases ADD COLUMN last_editor_email TEXT REFERENCES work_users(email);

CREATE TABLE work_case_events (
 id TEXT PRIMARY KEY,
 case_id TEXT NOT NULL REFERENCES work_cases(id) ON DELETE CASCADE,
 actor_email TEXT NOT NULL REFERENCES work_users(email),
 kind TEXT NOT NULL CHECK(kind IN ('created','edited','sharing','followup','position')),
 case_revision INTEGER NOT NULL,
 scope_at_event TEXT NOT NULL CHECK(scope_at_event IN ('mine','team')),
 changes_json TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX idx_case_events_history ON work_case_events(case_id,created_at DESC,id DESC);
-- Triggers give fail-closed audit: the change and its event share one SQLite transaction.
-- Private motion/file IDs and legacy personal meeting notes are NOT archived in the event log.
CREATE TRIGGER work_case_audit_create AFTER INSERT ON work_cases BEGIN
 INSERT INTO work_case_events VALUES(
 lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))),
 NEW.id,NEW.owner_email,'created',NEW.revision,'mine',
 json_object('before',NULL,'after',json_object(
 'title',NEW.title,'committee',NEW.committee,'status',NEW.status,
 'meeting_date',NEW.meeting_date,'labels',json(NEW.labels_json),
 'content',json(json_remove(NEW.content_json,'$.motion_id','$.file_id','$.meeting_notes')),
 'scope',NEW.scope,'assignee_email',NEW.assignee_email)),NEW.created_at);
END;
CREATE TRIGGER work_case_audit_update AFTER UPDATE OF title,committee,status,meeting_date,labels_json,content_json,scope,assignee_email ON work_cases
WHEN OLD.title IS NOT NEW.title OR OLD.committee IS NOT NEW.committee
 OR OLD.status IS NOT NEW.status OR OLD.meeting_date IS NOT NEW.meeting_date
 OR OLD.labels_json IS NOT NEW.labels_json OR OLD.content_json IS NOT NEW.content_json
 OR OLD.scope IS NOT NEW.scope OR OLD.assignee_email IS NOT NEW.assignee_email
BEGIN
 INSERT INTO work_case_events VALUES(
 lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))),
 NEW.id,COALESCE(NEW.last_editor_email,NEW.owner_email),
 CASE WHEN OLD.scope IS NOT NEW.scope OR OLD.assignee_email IS NOT NEW.assignee_email THEN 'sharing' ELSE 'edited' END,
 NEW.revision,
 CASE WHEN OLD.scope='team' AND NEW.scope='team' THEN 'team' ELSE 'mine' END,
 json_object('before',json_object(
 'title',OLD.title,'committee',OLD.committee,'status',OLD.status,
 'meeting_date',OLD.meeting_date,'labels',json(OLD.labels_json),
 'content',json(json_remove(OLD.content_json,'$.motion_id','$.file_id','$.meeting_notes')),
 'scope',OLD.scope,'assignee_email',OLD.assignee_email),
 'after',json_object(
 'title',NEW.title,'committee',NEW.committee,'status',NEW.status,
 'meeting_date',NEW.meeting_date,'labels',json(NEW.labels_json),
 'content',json(json_remove(NEW.content_json,'$.motion_id','$.file_id','$.meeting_notes')),
 'scope',NEW.scope,'assignee_email',NEW.assignee_email)),
 NEW.updated_at);
END;

CREATE TABLE work_followups (
 id TEXT PRIMARY KEY,
 case_id TEXT NOT NULL REFERENCES work_cases(id) ON DELETE CASCADE,
 meeting_id TEXT REFERENCES work_meetings(id) ON DELETE SET NULL,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
 details TEXT NOT NULL DEFAULT '',
 due_date TEXT NOT NULL DEFAULT '',
 assignee_email TEXT REFERENCES work_users(email),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')),
 revision INTEGER NOT NULL DEFAULT 1,
 creator_email TEXT NOT NULL REFERENCES work_users(email),
 editor_email TEXT NOT NULL REFERENCES work_users(email),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 completed_at TEXT
);
CREATE INDEX idx_followups_case_status ON work_followups(case_id,status,due_date);
CREATE INDEX idx_followups_assignee ON work_followups(assignee_email,status,due_date);
CREATE TRIGGER work_followups_audit_create AFTER INSERT ON work_followups BEGIN
 INSERT INTO work_case_events VALUES(
 lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))),
 NEW.case_id,NEW.creator_email,'followup',(SELECT revision FROM work_cases WHERE id=NEW.case_id),
 (SELECT scope FROM work_cases WHERE id=NEW.case_id),
 json_object('action','created','id',NEW.id,'title',NEW.title,'status',NEW.status,'due_date',NEW.due_date,'assignee_email',NEW.assignee_email),NEW.created_at);
END;
CREATE TRIGGER work_followups_audit_update AFTER UPDATE ON work_followups BEGIN
 INSERT INTO work_case_events VALUES(
 lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))),
 NEW.case_id,NEW.editor_email,'followup',(SELECT revision FROM work_cases WHERE id=NEW.case_id),
 (SELECT scope FROM work_cases WHERE id=NEW.case_id),
 json_object('action','updated','id',NEW.id,
 'before',json_object('title',OLD.title,'status',OLD.status,'due_date',OLD.due_date,'assignee_email',OLD.assignee_email),
 'after',json_object('title',NEW.title,'status',NEW.status,'due_date',NEW.due_date,'assignee_email',NEW.assignee_email)),
 NEW.updated_at);
END;

-- Exactly one shared/owned stance per case; the owner controls formal anchoring.
CREATE TABLE work_case_positions (
 case_id TEXT PRIMARY KEY REFERENCES work_cases(id) ON DELETE CASCADE,
 body TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL CHECK(status IN ('discussion','personal','proposed','endorsed')),
 source TEXT NOT NULL DEFAULT '',
 anchored_on TEXT NOT NULL DEFAULT '',
 actor_email TEXT NOT NULL REFERENCES work_users(email),
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TRIGGER work_positions_audit_create AFTER INSERT ON work_case_positions BEGIN
 INSERT INTO work_case_events VALUES(
 lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))),
 NEW.case_id,NEW.actor_email,'position',(SELECT revision FROM work_cases WHERE id=NEW.case_id),
 CASE WHEN NEW.status IN ('proposed','endorsed') THEN (SELECT scope FROM work_cases WHERE id=NEW.case_id) ELSE 'mine' END,
 json_object('before',NULL,'after',json_object('body',NEW.body,'status',NEW.status,'source',NEW.source,'anchored_on',NEW.anchored_on)),NEW.created_at);
END;
CREATE TRIGGER work_positions_audit_update AFTER UPDATE ON work_case_positions BEGIN
 INSERT INTO work_case_events VALUES(
 lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-a'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))),
 NEW.case_id,NEW.actor_email,'position',(SELECT revision FROM work_cases WHERE id=NEW.case_id),
 CASE WHEN NEW.status IN ('proposed','endorsed') AND OLD.status IN ('proposed','endorsed') THEN (SELECT scope FROM work_cases WHERE id=NEW.case_id) ELSE 'mine' END,
 json_object('before',json_object('body',OLD.body,'status',OLD.status,'source',OLD.source,'anchored_on',OLD.anchored_on),
 'after',json_object('body',NEW.body,'status',NEW.status,'source',NEW.source,'anchored_on',NEW.anchored_on)),NEW.updated_at);
END;
