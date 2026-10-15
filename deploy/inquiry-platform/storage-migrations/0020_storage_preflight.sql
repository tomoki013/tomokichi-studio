-- Generated from inquiry-platform v0.9.0 (79375dd); deployment-owned SQL.
INSERT OR IGNORE INTO services(id,name,slug,is_active) VALUES('unassigned','Unassigned','unassigned',1);
-- Preserve the historical mailbox->report merge in one physical owner.
-- IDs, messages, redirects, relation and timestamps remain intact.
INSERT OR REPLACE INTO project_storage_checks VALUES('historical-mailbox-merge', CASE WHEN EXISTS(
 SELECT 1 FROM tickets source JOIN tickets target ON target.id=source.merged_into
 JOIN support_thread_redirects redirect ON redirect.source_thread_id=source.id AND redirect.target_thread_id=target.id
 JOIN support_threads thread ON thread.id=source.id
 WHERE source.id='af57fbc8-455f-40d8-bbba-698d8d94981b'
 AND target.id='3eb70aff-0dc2-4b93-89d1-f524a6d89eb8'
 AND source.service_id IN ('studio','b39dd1ed-0efa-4db1-b2a1-5f41e99dbc0f')
 AND target.service_id='b39dd1ed-0efa-4db1-b2a1-5f41e99dbc0f'
 AND (thread.app_id IS NULL OR thread.app_id='b39dd1ed-0efa-4db1-b2a1-5f41e99dbc0f')
) THEN 0 ELSE 1 END);
UPDATE tickets SET service_id='b39dd1ed-0efa-4db1-b2a1-5f41e99dbc0f'
WHERE id='af57fbc8-455f-40d8-bbba-698d8d94981b' AND service_id='studio';
UPDATE support_threads SET app_id='b39dd1ed-0efa-4db1-b2a1-5f41e99dbc0f' WHERE id='af57fbc8-455f-40d8-bbba-698d8d94981b' AND app_id IS NULL;
INSERT OR IGNORE INTO audit_logs(id,actor_type,actor_id,action,target_type,target_id,metadata_json,created_at)
VALUES('storage-v1-historical-mailbox-merge','system',NULL,'storage.owner_reconciled','support_thread','af57fbc8-455f-40d8-bbba-698d8d94981b','{"reason":"historical_merge","migration":"storage-v1"}',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
