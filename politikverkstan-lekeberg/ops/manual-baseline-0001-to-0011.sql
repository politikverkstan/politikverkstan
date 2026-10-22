-- ONE-TIME D1 migration ledger baseline for the already installed 0001–0011 schema.
-- IMPORTANT: Do not run until you have verified the current production schema,
-- run PRAGMA foreign_key_check + quick_check and secured a database export.
-- This does NOT run/replay old migrations or modify user content.
-- Fail closed: it inserts NOTHING if any expected table/index/trigger or
-- any ADD COLUMN column from migrations 0001–0011 is missing.
-- IF NOT EXISTS on the ledger is not a guarantee of existing schema equivalence.
-- Never place this file in migrations/ or add it to automatic deployment.
CREATE TABLE IF NOT EXISTS d1_migrations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT UNIQUE,
 applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

WITH
 required_objects(object_type,object_name) AS (VALUES
 ('table','coalition_counts'),
 ('table','security_events'),
 ('index','idx_security_events_stamp'),
 ('table','work_users'),
 ('table','work_motions'),
 ('table','work_motion_versions'),
 ('table','work_ideas'),
 ('index','idx_work_owner_updated'),
 ('table','work_motion_shares'),
 ('table','work_motion_comments'),
 ('table','work_idea_comments'),
 ('index','idx_work_shares_user'),
 ('index','idx_motion_comments'),
 ('index','idx_idea_comments'),
 ('table','work_idea_status_history'),
 ('index','idx_work_motions_lifecycle'),
 ('index','idx_work_idea_status_history'),
 ('table','work_branding'),
 ('table','work_folders'),
 ('table','work_files'),
 ('table','work_file_chunks'),
 ('index','idx_folders_scope_owner'),
 ('index','idx_files_scope_owner'),
 ('table','work_cases'),
 ('index','idx_work_cases_owner_updated'),
 ('index','idx_work_cases_owner_meeting'),
 ('table','work_case_notes'),
 ('table','work_case_comments'),
 ('index','idx_work_cases_team_updated'),
 ('index','idx_work_cases_assignee'),
 ('index','idx_work_case_comments_created'),
 ('table','work_meetings'),
 ('table','work_meeting_items'),
 ('table','work_meeting_notes'),
 ('index','idx_work_meetings_owner'),
 ('index','idx_work_meetings_scope'),
 ('index','idx_work_meeting_items_order'),
 ('table','work_tasks'),
 ('index','idx_work_tasks_owner_status_due'),
 ('table','work_case_events'),
 ('table','work_followups'),
 ('table','work_case_positions'),
 ('index','idx_case_events_history'),
 ('index','idx_followups_case_status'),
 ('index','idx_followups_assignee'),
 ('trigger','work_case_audit_create'),
 ('trigger','work_case_audit_update'),
 ('trigger','work_followups_audit_create'),
 ('trigger','work_followups_audit_update'),
 ('trigger','work_positions_audit_create'),
 ('trigger','work_positions_audit_update')
 ),
 required_columns(table_name,column_name) AS (VALUES
 ('work_motions','team_permission'),
 ('work_motions','origin_idea_id'),
 ('work_motion_versions','editor_email'),
 ('work_ideas','owner_email'),
 ('work_ideas','status'),
 ('work_ideas','updated_at'),
 ('work_motions','archived_at'),
 ('work_motions','archived_by'),
 ('work_motions','trashed_at'),
 ('work_cases','scope'),
 ('work_cases','assignee_email'),
 ('work_cases','last_editor_email')
 ),
 actual_columns(table_name,column_name) AS (
 SELECT 'work_motions' AS table_name,name FROM pragma_table_info('work_motions')
 UNION ALL
 SELECT 'work_motion_versions' AS table_name,name FROM pragma_table_info('work_motion_versions')
 UNION ALL
 SELECT 'work_ideas' AS table_name,name FROM pragma_table_info('work_ideas')
 UNION ALL
 SELECT 'work_cases' AS table_name,name FROM pragma_table_info('work_cases')
 ),
 baseline(name) AS (VALUES
 ('0001_analytics.sql'),
 ('0002_workroom.sql'),
 ('0003_collaboration.sql'),
 ('0004_lifecycle.sql'),
 ('0005_branding.sql'),
 ('0006_files.sql'),
 ('0007_cases.sql'),
 ('0008_shared_cases.sql'),
 ('0009_meetings.sql'),
 ('0010_dashboard_tasks.sql'),
 ('0011_traceability.sql')
 )
INSERT OR IGNORE INTO d1_migrations(name)
SELECT baseline.name FROM baseline
WHERE NOT EXISTS (
 SELECT 1 FROM required_objects r
 WHERE NOT EXISTS (
  SELECT 1 FROM sqlite_master s
  WHERE s.type=r.object_type AND s.name=r.object_name
 )
)
AND NOT EXISTS (
 SELECT 1 FROM required_columns r
 WHERE NOT EXISTS (
  SELECT 1 FROM actual_columns a
  WHERE a.table_name=r.table_name AND a.column_name=r.column_name
 )
);

-- Verify that this returns 11 rows with filenames 0001–0011 before
-- enabling deploy:cloudflare; always review unexpected rows first.
SELECT name FROM d1_migrations ORDER BY id;
