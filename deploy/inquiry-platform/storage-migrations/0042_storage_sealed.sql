-- Generated from inquiry-platform v0.9.0 (79375dd); deployment-owned SQL.
-- Apply as one batch after every service, including unassigned, is active.
INSERT OR REPLACE INTO project_storage_checks VALUES('all', (SELECT COUNT(*) FROM services s WHERE s.is_active=1 AND NOT EXISTS(SELECT 1 FROM project_storage p WHERE p.project_id=s.id AND p.state='active')));
INSERT INTO platform_settings(key,value) VALUES('project_storage_required','1') ON CONFLICT(key) DO UPDATE SET value='1';
