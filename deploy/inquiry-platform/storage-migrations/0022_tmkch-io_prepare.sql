-- Generated from inquiry-platform v0.9.0 (79375dd); deployment-owned SQL.
-- Storage schema v1; generated for deployment-owned prefix p_product01.

INSERT OR IGNORE INTO project_storage(project_id,table_prefix,schema_version) VALUES((SELECT id FROM services WHERE slug='tmkch-io'),'p_product01',1);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'), CASE WHEN EXISTS(SELECT 1 FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io') AND table_prefix='p_product01' AND schema_version=1) THEN 0 ELSE 1 END;

CREATE TABLE IF NOT EXISTS p_product01_support_tickets (
    id              TEXT PRIMARY KEY,
    app_id          TEXT REFERENCES apps(id),
    source          TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    -- Only ever a name the person typed. Never derived from the address.
    requester_name  TEXT,
    subject         TEXT NOT NULL,
    status          TEXT NOT NULL,
    unread_count    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    last_message_at TEXT NOT NULL,
    resolved_at     TEXT
, mail_subject TEXT);

CREATE INDEX IF NOT EXISTS p_product01_idx_support_threads_app ON p_product01_support_tickets(app_id);

CREATE INDEX IF NOT EXISTS p_product01_idx_support_threads_status ON p_product01_support_tickets(status);

CREATE INDEX IF NOT EXISTS p_product01_idx_support_threads_last_message ON p_product01_support_tickets(last_message_at);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('support_threads'))=13 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('support_threads') WHERE name NOT IN ('id','app_id','source','requester_email','requester_name','subject','status','unread_count','created_at','updated_at','last_message_at','resolved_at','mail_subject')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_support_tickets'))=13 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_support_tickets') WHERE name NOT IN ('id','app_id','source','requester_email','requester_name','subject','status','unread_count','created_at','updated_at','last_message_at','resolved_at','mail_subject')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_threads_INSERT BEFORE INSERT ON support_threads WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ((COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=NEW.id),NEW.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned'))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_threads_INSERT AFTER INSERT ON support_threads WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND (COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=NEW.id),NEW.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned'))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
INSERT INTO p_product01_support_tickets(id,app_id,source,requester_email,requester_name,subject,status,unread_count,created_at,updated_at,last_message_at,resolved_at,mail_subject) VALUES(NEW.id,NEW.app_id,NEW.source,NEW.requester_email,NEW.requester_name,NEW.subject,NEW.status,NEW.unread_count,NEW.created_at,NEW.updated_at,NEW.last_message_at,NEW.resolved_at,NEW.mail_subject) ON CONFLICT(id) DO UPDATE SET app_id=excluded.app_id,source=excluded.source,requester_email=excluded.requester_email,requester_name=excluded.requester_name,subject=excluded.subject,status=excluded.status,unread_count=excluded.unread_count,created_at=excluded.created_at,updated_at=excluded.updated_at,last_message_at=excluded.last_message_at,resolved_at=excluded.resolved_at,mail_subject=excluded.mail_subject;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_threads_UPDATE BEFORE UPDATE ON support_threads WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ((COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=NEW.id),NEW.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned'))=(SELECT id FROM services WHERE slug='tmkch-io') OR (COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=OLD.id),OLD.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned'))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_threads_UPDATE AFTER UPDATE ON support_threads WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND (COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=NEW.id),NEW.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned'))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
INSERT INTO p_product01_support_tickets(id,app_id,source,requester_email,requester_name,subject,status,unread_count,created_at,updated_at,last_message_at,resolved_at,mail_subject) VALUES(NEW.id,NEW.app_id,NEW.source,NEW.requester_email,NEW.requester_name,NEW.subject,NEW.status,NEW.unread_count,NEW.created_at,NEW.updated_at,NEW.last_message_at,NEW.resolved_at,NEW.mail_subject) ON CONFLICT(id) DO UPDATE SET app_id=excluded.app_id,source=excluded.source,requester_email=excluded.requester_email,requester_name=excluded.requester_name,subject=excluded.subject,status=excluded.status,unread_count=excluded.unread_count,created_at=excluded.created_at,updated_at=excluded.updated_at,last_message_at=excluded.last_message_at,resolved_at=excluded.resolved_at,mail_subject=excluded.mail_subject;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_threads_DELETE BEFORE DELETE ON support_threads WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ((COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=OLD.id),OLD.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned'))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_threads_DELETE AFTER DELETE ON support_threads WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND (COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=OLD.id),OLD.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned'))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_support_tickets WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_support_messages (
    id                  TEXT PRIMARY KEY,
    thread_id           TEXT NOT NULL REFERENCES p_product01_support_tickets(id),
    direction           TEXT NOT NULL,
    provider_message_id TEXT,
    in_reply_to         TEXT,
    sender              TEXT,
    recipient           TEXT,
    -- The finished text as it was sent. Never re-rendered from a template:
    -- editing a template must not change what somebody was actually told.
    body_text           TEXT NOT NULL,
    created_at          TEXT NOT NULL
, transport_id TEXT, message_id_checked_at TEXT);

CREATE INDEX IF NOT EXISTS p_product01_idx_support_messages_thread ON p_product01_support_messages(thread_id, created_at);

CREATE INDEX IF NOT EXISTS p_product01_idx_support_messages_provider ON p_product01_support_messages(provider_message_id);

CREATE INDEX IF NOT EXISTS p_product01_support_messages_transport ON p_product01_support_messages(transport_id);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('support_messages'))=11 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('support_messages') WHERE name NOT IN ('id','thread_id','direction','provider_message_id','in_reply_to','sender','recipient','body_text','created_at','transport_id','message_id_checked_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_support_messages'))=11 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_support_messages') WHERE name NOT IN ('id','thread_id','direction','provider_message_id','in_reply_to','sender','recipient','body_text','created_at','transport_id','message_id_checked_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_messages_INSERT BEFORE INSERT ON support_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_messages_INSERT AFTER INSERT ON support_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.thread_id))
BEGIN
INSERT INTO p_product01_support_messages(id,thread_id,direction,provider_message_id,in_reply_to,sender,recipient,body_text,created_at,transport_id,message_id_checked_at) VALUES(NEW.id,NEW.thread_id,NEW.direction,NEW.provider_message_id,NEW.in_reply_to,NEW.sender,NEW.recipient,NEW.body_text,NEW.created_at,NEW.transport_id,NEW.message_id_checked_at) ON CONFLICT(id) DO UPDATE SET thread_id=excluded.thread_id,direction=excluded.direction,provider_message_id=excluded.provider_message_id,in_reply_to=excluded.in_reply_to,sender=excluded.sender,recipient=excluded.recipient,body_text=excluded.body_text,created_at=excluded.created_at,transport_id=excluded.transport_id,message_id_checked_at=excluded.message_id_checked_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_messages_UPDATE BEFORE UPDATE ON support_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_messages_UPDATE AFTER UPDATE ON support_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.thread_id))
BEGIN
INSERT INTO p_product01_support_messages(id,thread_id,direction,provider_message_id,in_reply_to,sender,recipient,body_text,created_at,transport_id,message_id_checked_at) VALUES(NEW.id,NEW.thread_id,NEW.direction,NEW.provider_message_id,NEW.in_reply_to,NEW.sender,NEW.recipient,NEW.body_text,NEW.created_at,NEW.transport_id,NEW.message_id_checked_at) ON CONFLICT(id) DO UPDATE SET thread_id=excluded.thread_id,direction=excluded.direction,provider_message_id=excluded.provider_message_id,in_reply_to=excluded.in_reply_to,sender=excluded.sender,recipient=excluded.recipient,body_text=excluded.body_text,created_at=excluded.created_at,transport_id=excluded.transport_id,message_id_checked_at=excluded.message_id_checked_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_messages_DELETE BEFORE DELETE ON support_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_messages_DELETE AFTER DELETE ON support_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_support_messages WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_support_attachments (
    id                TEXT PRIMARY KEY,
    message_id        TEXT NOT NULL REFERENCES p_product01_support_messages(id),
    r2_key            TEXT NOT NULL,
    original_filename TEXT,
    content_type      TEXT NOT NULL,
    byte_size         INTEGER NOT NULL,
    sha256            TEXT NOT NULL,
    created_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS p_product01_idx_support_attachments_message ON p_product01_support_attachments(message_id);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('support_attachments'))=8 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('support_attachments') WHERE name NOT IN ('id','message_id','r2_key','original_filename','content_type','byte_size','sha256','created_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_support_attachments'))=8 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_support_attachments') WHERE name NOT IN ('id','message_id','r2_key','original_filename','content_type','byte_size','sha256','created_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_attachments_INSERT BEFORE INSERT ON support_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_messages m JOIN main.support_threads th ON th.id=m.thread_id WHERE m.id=NEW.message_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_attachments_INSERT AFTER INSERT ON support_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_messages m JOIN main.support_threads th ON th.id=m.thread_id WHERE m.id=NEW.message_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.message_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_messages WHERE id=NEW.message_id))
BEGIN
INSERT INTO p_product01_support_attachments(id,message_id,r2_key,original_filename,content_type,byte_size,sha256,created_at) VALUES(NEW.id,NEW.message_id,NEW.r2_key,NEW.original_filename,NEW.content_type,NEW.byte_size,NEW.sha256,NEW.created_at) ON CONFLICT(id) DO UPDATE SET message_id=excluded.message_id,r2_key=excluded.r2_key,original_filename=excluded.original_filename,content_type=excluded.content_type,byte_size=excluded.byte_size,sha256=excluded.sha256,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_attachments_UPDATE BEFORE UPDATE ON support_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_messages m JOIN main.support_threads th ON th.id=m.thread_id WHERE m.id=NEW.message_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_messages m JOIN main.support_threads th ON th.id=m.thread_id WHERE m.id=OLD.message_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_attachments_UPDATE AFTER UPDATE ON support_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_messages m JOIN main.support_threads th ON th.id=m.thread_id WHERE m.id=NEW.message_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.message_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_messages WHERE id=NEW.message_id))
BEGIN
INSERT INTO p_product01_support_attachments(id,message_id,r2_key,original_filename,content_type,byte_size,sha256,created_at) VALUES(NEW.id,NEW.message_id,NEW.r2_key,NEW.original_filename,NEW.content_type,NEW.byte_size,NEW.sha256,NEW.created_at) ON CONFLICT(id) DO UPDATE SET message_id=excluded.message_id,r2_key=excluded.r2_key,original_filename=excluded.original_filename,content_type=excluded.content_type,byte_size=excluded.byte_size,sha256=excluded.sha256,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_attachments_DELETE BEFORE DELETE ON support_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_messages m JOIN main.support_threads th ON th.id=m.thread_id WHERE m.id=OLD.message_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_attachments_DELETE AFTER DELETE ON support_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_messages m JOIN main.support_threads th ON th.id=m.thread_id WHERE m.id=OLD.message_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_support_attachments WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_support_drafts (
    thread_id  TEXT PRIMARY KEY REFERENCES p_product01_support_tickets(id),
    body_text  TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('support_drafts'))=4 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('support_drafts') WHERE name NOT IN ('thread_id','body_text','created_at','updated_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_support_drafts'))=4 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_support_drafts') WHERE name NOT IN ('thread_id','body_text','created_at','updated_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_drafts_INSERT BEFORE INSERT ON support_drafts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_drafts_INSERT AFTER INSERT ON support_drafts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.thread_id))
BEGIN
INSERT INTO p_product01_support_drafts(thread_id,body_text,created_at,updated_at) VALUES(NEW.thread_id,NEW.body_text,NEW.created_at,NEW.updated_at) ON CONFLICT(thread_id) DO UPDATE SET body_text=excluded.body_text,created_at=excluded.created_at,updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_drafts_UPDATE BEFORE UPDATE ON support_drafts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_drafts_UPDATE AFTER UPDATE ON support_drafts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.thread_id))
BEGIN
INSERT INTO p_product01_support_drafts(thread_id,body_text,created_at,updated_at) VALUES(NEW.thread_id,NEW.body_text,NEW.created_at,NEW.updated_at) ON CONFLICT(thread_id) DO UPDATE SET body_text=excluded.body_text,created_at=excluded.created_at,updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_drafts_DELETE BEFORE DELETE ON support_drafts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_drafts_DELETE AFTER DELETE ON support_drafts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_support_drafts WHERE thread_id=OLD.thread_id;
END;

CREATE TABLE IF NOT EXISTS p_product01_support_reply_sends (
    idempotency_key TEXT PRIMARY KEY,
    thread_id       TEXT NOT NULL REFERENCES p_product01_support_tickets(id),
    message_id      TEXT NOT NULL,
    created_at      TEXT NOT NULL
);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('support_reply_sends'))=4 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('support_reply_sends') WHERE name NOT IN ('idempotency_key','thread_id','message_id','created_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_support_reply_sends'))=4 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_support_reply_sends') WHERE name NOT IN ('idempotency_key','thread_id','message_id','created_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_reply_sends_INSERT BEFORE INSERT ON support_reply_sends WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_reply_sends_INSERT AFTER INSERT ON support_reply_sends WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.thread_id))
BEGIN
INSERT INTO p_product01_support_reply_sends(idempotency_key,thread_id,message_id,created_at) VALUES(NEW.idempotency_key,NEW.thread_id,NEW.message_id,NEW.created_at) ON CONFLICT(idempotency_key) DO UPDATE SET thread_id=excluded.thread_id,message_id=excluded.message_id,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_reply_sends_UPDATE BEFORE UPDATE ON support_reply_sends WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_reply_sends_UPDATE AFTER UPDATE ON support_reply_sends WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.thread_id))
BEGIN
INSERT INTO p_product01_support_reply_sends(idempotency_key,thread_id,message_id,created_at) VALUES(NEW.idempotency_key,NEW.thread_id,NEW.message_id,NEW.created_at) ON CONFLICT(idempotency_key) DO UPDATE SET thread_id=excluded.thread_id,message_id=excluded.message_id,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_reply_sends_DELETE BEFORE DELETE ON support_reply_sends WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_reply_sends_DELETE AFTER DELETE ON support_reply_sends WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_support_reply_sends WHERE idempotency_key=OLD.idempotency_key;
END;

CREATE TABLE IF NOT EXISTS p_product01_support_reply_attempts (
  idempotency_key TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES p_product01_support_tickets(id),
  provider_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS p_product01_support_reply_attempts_thread ON p_product01_support_reply_attempts(thread_id);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('support_reply_attempts'))=4 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('support_reply_attempts') WHERE name NOT IN ('idempotency_key','thread_id','provider_key','created_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_support_reply_attempts'))=4 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_support_reply_attempts') WHERE name NOT IN ('idempotency_key','thread_id','provider_key','created_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_reply_attempts_INSERT BEFORE INSERT ON support_reply_attempts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_reply_attempts_INSERT AFTER INSERT ON support_reply_attempts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.thread_id))
BEGIN
INSERT INTO p_product01_support_reply_attempts(idempotency_key,thread_id,provider_key,created_at) VALUES(NEW.idempotency_key,NEW.thread_id,NEW.provider_key,NEW.created_at) ON CONFLICT(idempotency_key) DO UPDATE SET thread_id=excluded.thread_id,provider_key=excluded.provider_key,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_reply_attempts_UPDATE BEFORE UPDATE ON support_reply_attempts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_reply_attempts_UPDATE AFTER UPDATE ON support_reply_attempts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=NEW.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.thread_id))
BEGIN
INSERT INTO p_product01_support_reply_attempts(idempotency_key,thread_id,provider_key,created_at) VALUES(NEW.idempotency_key,NEW.thread_id,NEW.provider_key,NEW.created_at) ON CONFLICT(idempotency_key) DO UPDATE SET thread_id=excluded.thread_id,provider_key=excluded.provider_key,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_reply_attempts_DELETE BEFORE DELETE ON support_reply_attempts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_reply_attempts_DELETE AFTER DELETE ON support_reply_attempts WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=OLD.thread_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_support_reply_attempts WHERE idempotency_key=OLD.idempotency_key;
END;

CREATE TABLE IF NOT EXISTS p_product01_support_redirects (
  source_thread_id TEXT PRIMARY KEY REFERENCES p_product01_support_tickets(id),
  target_thread_id TEXT NOT NULL REFERENCES p_product01_support_tickets(id),
  created_at TEXT NOT NULL,
  CHECK (source_thread_id <> target_thread_id)
);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('support_thread_redirects'))=3 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('support_thread_redirects') WHERE name NOT IN ('source_thread_id','target_thread_id','created_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_support_redirects'))=3 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_support_redirects') WHERE name NOT IN ('source_thread_id','target_thread_id','created_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_thread_redirects_INSERT BEFORE INSERT ON support_thread_redirects WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.source_thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_thread_redirects_INSERT AFTER INSERT ON support_thread_redirects WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.source_thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.source_thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.source_thread_id)) AND (NEW.target_thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.target_thread_id))
BEGIN
INSERT INTO p_product01_support_redirects(source_thread_id,target_thread_id,created_at) VALUES(NEW.source_thread_id,NEW.target_thread_id,NEW.created_at) ON CONFLICT(source_thread_id) DO UPDATE SET target_thread_id=excluded.target_thread_id,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_thread_redirects_UPDATE BEFORE UPDATE ON support_thread_redirects WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.source_thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT service_id FROM main.tickets WHERE id=OLD.source_thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_thread_redirects_UPDATE AFTER UPDATE ON support_thread_redirects WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.source_thread_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.source_thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.source_thread_id)) AND (NEW.target_thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.target_thread_id))
BEGIN
INSERT INTO p_product01_support_redirects(source_thread_id,target_thread_id,created_at) VALUES(NEW.source_thread_id,NEW.target_thread_id,NEW.created_at) ON CONFLICT(source_thread_id) DO UPDATE SET target_thread_id=excluded.target_thread_id,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_support_thread_redirects_DELETE BEFORE DELETE ON support_thread_redirects WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=OLD.source_thread_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_support_thread_redirects_DELETE AFTER DELETE ON support_thread_redirects WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=OLD.source_thread_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_support_redirects WHERE source_thread_id=OLD.source_thread_id;
END;

CREATE TABLE IF NOT EXISTS p_product01_moderation_reports (
    id                    TEXT PRIMARY KEY,
    app_id                TEXT NOT NULL REFERENCES apps(id),
    external_report_id    TEXT NOT NULL,
    context_external_id   TEXT,
    content_type          TEXT NOT NULL,
    content_external_id   TEXT,
    -- Pseudonymised references, not the apps' own user ids. See
    -- `pseudonymise()` in src/domain/identity.ts.
    reporter_ref_hash     TEXT,
    author_ref_hash       TEXT,
    reason_code           TEXT NOT NULL,
    detail                TEXT,
    snapshot_text         TEXT,
    status                TEXT NOT NULL,
    priority              TEXT NOT NULL DEFAULT 'normal',
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL,
    resolved_at           TEXT,
    resolution_code       TEXT,
    resolution_note       TEXT
, support_thread_id TEXT REFERENCES p_product01_support_tickets(id), moderation_revision INTEGER NOT NULL DEFAULT 0);

CREATE UNIQUE INDEX IF NOT EXISTS p_product01_idx_reports_external ON p_product01_moderation_reports(external_report_id);

CREATE INDEX IF NOT EXISTS p_product01_idx_reports_app ON p_product01_moderation_reports(app_id);

CREATE INDEX IF NOT EXISTS p_product01_idx_reports_status ON p_product01_moderation_reports(status);

CREATE INDEX IF NOT EXISTS p_product01_idx_reports_created ON p_product01_moderation_reports(created_at);

CREATE INDEX IF NOT EXISTS p_product01_reports_author_history
ON p_product01_moderation_reports(app_id, author_ref_hash, created_at DESC, id DESC);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('reports'))=20 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('reports') WHERE name NOT IN ('id','app_id','external_report_id','context_external_id','content_type','content_external_id','reporter_ref_hash','author_ref_hash','reason_code','detail','snapshot_text','status','priority','created_at','updated_at','resolved_at','resolution_code','resolution_note','support_thread_id','moderation_revision')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_moderation_reports'))=20 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_moderation_reports') WHERE name NOT IN ('id','app_id','external_report_id','context_external_id','content_type','content_external_id','reporter_ref_hash','author_ref_hash','reason_code','detail','snapshot_text','status','priority','created_at','updated_at','resolved_at','resolution_code','resolution_note','support_thread_id','moderation_revision')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_reports_INSERT BEFORE INSERT ON reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ((NEW.app_id)=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_reports_INSERT AFTER INSERT ON reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND (NEW.app_id)=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.support_thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.support_thread_id))
BEGIN
INSERT INTO p_product01_moderation_reports(id,app_id,external_report_id,context_external_id,content_type,content_external_id,reporter_ref_hash,author_ref_hash,reason_code,detail,snapshot_text,status,priority,created_at,updated_at,resolved_at,resolution_code,resolution_note,support_thread_id,moderation_revision) VALUES(NEW.id,NEW.app_id,NEW.external_report_id,NEW.context_external_id,NEW.content_type,NEW.content_external_id,NEW.reporter_ref_hash,NEW.author_ref_hash,NEW.reason_code,NEW.detail,NEW.snapshot_text,NEW.status,NEW.priority,NEW.created_at,NEW.updated_at,NEW.resolved_at,NEW.resolution_code,NEW.resolution_note,NEW.support_thread_id,NEW.moderation_revision) ON CONFLICT(id) DO UPDATE SET app_id=excluded.app_id,external_report_id=excluded.external_report_id,context_external_id=excluded.context_external_id,content_type=excluded.content_type,content_external_id=excluded.content_external_id,reporter_ref_hash=excluded.reporter_ref_hash,author_ref_hash=excluded.author_ref_hash,reason_code=excluded.reason_code,detail=excluded.detail,snapshot_text=excluded.snapshot_text,status=excluded.status,priority=excluded.priority,created_at=excluded.created_at,updated_at=excluded.updated_at,resolved_at=excluded.resolved_at,resolution_code=excluded.resolution_code,resolution_note=excluded.resolution_note,support_thread_id=excluded.support_thread_id,moderation_revision=excluded.moderation_revision;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_reports_UPDATE BEFORE UPDATE ON reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ((NEW.app_id)=(SELECT id FROM services WHERE slug='tmkch-io') OR (OLD.app_id)=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_reports_UPDATE AFTER UPDATE ON reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND (NEW.app_id)=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.support_thread_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_tickets WHERE id=NEW.support_thread_id))
BEGIN
INSERT INTO p_product01_moderation_reports(id,app_id,external_report_id,context_external_id,content_type,content_external_id,reporter_ref_hash,author_ref_hash,reason_code,detail,snapshot_text,status,priority,created_at,updated_at,resolved_at,resolution_code,resolution_note,support_thread_id,moderation_revision) VALUES(NEW.id,NEW.app_id,NEW.external_report_id,NEW.context_external_id,NEW.content_type,NEW.content_external_id,NEW.reporter_ref_hash,NEW.author_ref_hash,NEW.reason_code,NEW.detail,NEW.snapshot_text,NEW.status,NEW.priority,NEW.created_at,NEW.updated_at,NEW.resolved_at,NEW.resolution_code,NEW.resolution_note,NEW.support_thread_id,NEW.moderation_revision) ON CONFLICT(id) DO UPDATE SET app_id=excluded.app_id,external_report_id=excluded.external_report_id,context_external_id=excluded.context_external_id,content_type=excluded.content_type,content_external_id=excluded.content_external_id,reporter_ref_hash=excluded.reporter_ref_hash,author_ref_hash=excluded.author_ref_hash,reason_code=excluded.reason_code,detail=excluded.detail,snapshot_text=excluded.snapshot_text,status=excluded.status,priority=excluded.priority,created_at=excluded.created_at,updated_at=excluded.updated_at,resolved_at=excluded.resolved_at,resolution_code=excluded.resolution_code,resolution_note=excluded.resolution_note,support_thread_id=excluded.support_thread_id,moderation_revision=excluded.moderation_revision;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_reports_DELETE BEFORE DELETE ON reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ((OLD.app_id)=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_reports_DELETE AFTER DELETE ON reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND (OLD.app_id)=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_moderation_reports WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_moderation_events (
    id          TEXT PRIMARY KEY,
    report_id   TEXT NOT NULL REFERENCES p_product01_moderation_reports(id),
    event_type  TEXT NOT NULL,
    from_status TEXT,
    to_status   TEXT,
    actor_id    TEXT,
    note        TEXT,
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS p_product01_idx_report_events_report ON p_product01_moderation_events(report_id, created_at);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('report_events'))=8 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('report_events') WHERE name NOT IN ('id','report_id','event_type','from_status','to_status','actor_id','note','created_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_moderation_events'))=8 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_moderation_events') WHERE name NOT IN ('id','report_id','event_type','from_status','to_status','actor_id','note','created_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_report_events_INSERT BEFORE INSERT ON report_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_report_events_INSERT AFTER INSERT ON report_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.report_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_moderation_reports WHERE id=NEW.report_id))
BEGIN
INSERT INTO p_product01_moderation_events(id,report_id,event_type,from_status,to_status,actor_id,note,created_at) VALUES(NEW.id,NEW.report_id,NEW.event_type,NEW.from_status,NEW.to_status,NEW.actor_id,NEW.note,NEW.created_at) ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,event_type=excluded.event_type,from_status=excluded.from_status,to_status=excluded.to_status,actor_id=excluded.actor_id,note=excluded.note,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_report_events_UPDATE BEFORE UPDATE ON report_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT app_id FROM main.reports WHERE id=OLD.report_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_report_events_UPDATE AFTER UPDATE ON report_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.report_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_moderation_reports WHERE id=NEW.report_id))
BEGIN
INSERT INTO p_product01_moderation_events(id,report_id,event_type,from_status,to_status,actor_id,note,created_at) VALUES(NEW.id,NEW.report_id,NEW.event_type,NEW.from_status,NEW.to_status,NEW.actor_id,NEW.note,NEW.created_at) ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,event_type=excluded.event_type,from_status=excluded.from_status,to_status=excluded.to_status,actor_id=excluded.actor_id,note=excluded.note,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_report_events_DELETE BEFORE DELETE ON report_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT app_id FROM main.reports WHERE id=OLD.report_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_report_events_DELETE AFTER DELETE ON report_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT app_id FROM main.reports WHERE id=OLD.report_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_moderation_events WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_moderation_evidence (
    id                TEXT PRIMARY KEY,
    report_id         TEXT NOT NULL REFERENCES p_product01_moderation_reports(id),
    r2_key            TEXT NOT NULL,
    content_type      TEXT NOT NULL,
    original_filename TEXT,
    byte_size         INTEGER NOT NULL,
    sha256            TEXT NOT NULL,
    created_at        TEXT NOT NULL
, expired_at TEXT);

CREATE INDEX IF NOT EXISTS p_product01_idx_report_attachments_report ON p_product01_moderation_evidence(report_id);

CREATE INDEX IF NOT EXISTS p_product01_report_attachments_expiry ON p_product01_moderation_evidence(created_at) WHERE expired_at IS NULL;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('report_attachments'))=9 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('report_attachments') WHERE name NOT IN ('id','report_id','r2_key','content_type','original_filename','byte_size','sha256','created_at','expired_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_moderation_evidence'))=9 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_moderation_evidence') WHERE name NOT IN ('id','report_id','r2_key','content_type','original_filename','byte_size','sha256','created_at','expired_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_report_attachments_INSERT BEFORE INSERT ON report_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_report_attachments_INSERT AFTER INSERT ON report_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.report_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_moderation_reports WHERE id=NEW.report_id))
BEGIN
INSERT INTO p_product01_moderation_evidence(id,report_id,r2_key,content_type,original_filename,byte_size,sha256,created_at,expired_at) VALUES(NEW.id,NEW.report_id,NEW.r2_key,NEW.content_type,NEW.original_filename,NEW.byte_size,NEW.sha256,NEW.created_at,NEW.expired_at) ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,r2_key=excluded.r2_key,content_type=excluded.content_type,original_filename=excluded.original_filename,byte_size=excluded.byte_size,sha256=excluded.sha256,created_at=excluded.created_at,expired_at=excluded.expired_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_report_attachments_UPDATE BEFORE UPDATE ON report_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT app_id FROM main.reports WHERE id=OLD.report_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_report_attachments_UPDATE AFTER UPDATE ON report_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.report_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_moderation_reports WHERE id=NEW.report_id))
BEGIN
INSERT INTO p_product01_moderation_evidence(id,report_id,r2_key,content_type,original_filename,byte_size,sha256,created_at,expired_at) VALUES(NEW.id,NEW.report_id,NEW.r2_key,NEW.content_type,NEW.original_filename,NEW.byte_size,NEW.sha256,NEW.created_at,NEW.expired_at) ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,r2_key=excluded.r2_key,content_type=excluded.content_type,original_filename=excluded.original_filename,byte_size=excluded.byte_size,sha256=excluded.sha256,created_at=excluded.created_at,expired_at=excluded.expired_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_report_attachments_DELETE BEFORE DELETE ON report_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT app_id FROM main.reports WHERE id=OLD.report_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_report_attachments_DELETE AFTER DELETE ON report_attachments WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT app_id FROM main.reports WHERE id=OLD.report_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_moderation_evidence WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_moderation_operations (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES p_product01_moderation_reports(id),
  decision TEXT NOT NULL CHECK(decision IN ('delete','dismiss')),
  completed_at TEXT
, lease_token TEXT, lease_until TEXT, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('report_operations'))=8 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('report_operations') WHERE name NOT IN ('id','report_id','decision','completed_at','lease_token','lease_until','attempts','last_error')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_moderation_operations'))=8 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_moderation_operations') WHERE name NOT IN ('id','report_id','decision','completed_at','lease_token','lease_until','attempts','last_error')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_report_operations_INSERT BEFORE INSERT ON report_operations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_report_operations_INSERT AFTER INSERT ON report_operations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.report_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_moderation_reports WHERE id=NEW.report_id))
BEGIN
INSERT INTO p_product01_moderation_operations(id,report_id,decision,completed_at,lease_token,lease_until,attempts,last_error) VALUES(NEW.id,NEW.report_id,NEW.decision,NEW.completed_at,NEW.lease_token,NEW.lease_until,NEW.attempts,NEW.last_error) ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,decision=excluded.decision,completed_at=excluded.completed_at,lease_token=excluded.lease_token,lease_until=excluded.lease_until,attempts=excluded.attempts,last_error=excluded.last_error;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_report_operations_UPDATE BEFORE UPDATE ON report_operations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT app_id FROM main.reports WHERE id=OLD.report_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_report_operations_UPDATE AFTER UPDATE ON report_operations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT app_id FROM main.reports WHERE id=NEW.report_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.report_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_moderation_reports WHERE id=NEW.report_id))
BEGIN
INSERT INTO p_product01_moderation_operations(id,report_id,decision,completed_at,lease_token,lease_until,attempts,last_error) VALUES(NEW.id,NEW.report_id,NEW.decision,NEW.completed_at,NEW.lease_token,NEW.lease_until,NEW.attempts,NEW.last_error) ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,decision=excluded.decision,completed_at=excluded.completed_at,lease_token=excluded.lease_token,lease_until=excluded.lease_until,attempts=excluded.attempts,last_error=excluded.last_error;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_report_operations_DELETE BEFORE DELETE ON report_operations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT app_id FROM main.reports WHERE id=OLD.report_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_report_operations_DELETE AFTER DELETE ON report_operations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT app_id FROM main.reports WHERE id=OLD.report_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_moderation_operations WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_cases (
 id TEXT PRIMARY KEY, ticket_number TEXT NOT NULL UNIQUE,
 type TEXT NOT NULL CHECK(type IN ('INQUIRY','REPORT','BUG','INCIDENT','BILLING','PRIVACY','OTHER')),
 status TEXT NOT NULL CHECK(status IN ('NEW','TRIAGE','ACKNOWLEDGED','IN_PROGRESS','WAITING_CUSTOMER','WAITING_INTERNAL','RESOLVED','CLOSED')),
 resolution TEXT CHECK(resolution IN ('RESOLVED','NO_ACTION_REQUIRED','SPAM','DUPLICATE','INVALID','USER_WITHDREW','CONTENT_REMOVED','ACCOUNT_ACTIONED','FIXED','OTHER')),
 priority TEXT NOT NULL CHECK(priority IN ('P1','P2','P3','P4')), impact TEXT NOT NULL CHECK(impact IN ('HIGH','MEDIUM','LOW')), urgency TEXT NOT NULL CHECK(urgency IN ('HIGH','MEDIUM','LOW')), priority_override TEXT,
 service_id TEXT NOT NULL REFERENCES services(id), component_id TEXT REFERENCES service_components(id), category_id TEXT REFERENCES ticket_categories(id), assignment_group_id TEXT REFERENCES assignment_groups(id), assignee_id TEXT REFERENCES ticket_assignees(id),
 subject TEXT NOT NULL, summary TEXT, requester_id TEXT, requester_email TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, acknowledged_at TEXT, first_response_at TEXT, resolved_at TEXT, closed_at TEXT, next_action TEXT, next_action_at TEXT,
 mutation_id TEXT, revision INTEGER NOT NULL DEFAULT 0, merged_into TEXT REFERENCES p_product01_cases(id), sla_ack_minutes INTEGER NOT NULL, sla_response_minutes INTEGER NOT NULL, sla_resolution_minutes INTEGER,
 CHECK(status NOT IN ('RESOLVED','CLOSED') OR resolution IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS p_product01_idx_ticket_queue ON p_product01_cases(status,priority,created_at);

CREATE INDEX IF NOT EXISTS p_product01_idx_ticket_service ON p_product01_cases(service_id,type,updated_at);

CREATE INDEX IF NOT EXISTS p_product01_idx_ticket_next ON p_product01_cases(next_action_at);

CREATE INDEX IF NOT EXISTS p_product01_idx_ticket_assignee ON p_product01_cases(assignee_id,status);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('tickets'))=32 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('tickets') WHERE name NOT IN ('id','ticket_number','type','status','resolution','priority','impact','urgency','priority_override','service_id','component_id','category_id','assignment_group_id','assignee_id','subject','summary','requester_id','requester_email','created_at','updated_at','acknowledged_at','first_response_at','resolved_at','closed_at','next_action','next_action_at','mutation_id','revision','merged_into','sla_ack_minutes','sla_response_minutes','sla_resolution_minutes')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_cases'))=32 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_cases') WHERE name NOT IN ('id','ticket_number','type','status','resolution','priority','impact','urgency','priority_override','service_id','component_id','category_id','assignment_group_id','assignee_id','subject','summary','requester_id','requester_email','created_at','updated_at','acknowledged_at','first_response_at','resolved_at','closed_at','next_action','next_action_at','mutation_id','revision','merged_into','sla_ack_minutes','sla_response_minutes','sla_resolution_minutes')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_tickets_INSERT BEFORE INSERT ON tickets WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ((NEW.service_id)=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_tickets_INSERT AFTER INSERT ON tickets WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND (NEW.service_id)=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.merged_into IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.merged_into))
BEGIN
INSERT INTO p_product01_cases(id,ticket_number,type,status,resolution,priority,impact,urgency,priority_override,service_id,component_id,category_id,assignment_group_id,assignee_id,subject,summary,requester_id,requester_email,created_at,updated_at,acknowledged_at,first_response_at,resolved_at,closed_at,next_action,next_action_at,mutation_id,revision,merged_into,sla_ack_minutes,sla_response_minutes,sla_resolution_minutes) VALUES(NEW.id,NEW.ticket_number,NEW.type,NEW.status,NEW.resolution,NEW.priority,NEW.impact,NEW.urgency,NEW.priority_override,NEW.service_id,NEW.component_id,NEW.category_id,NEW.assignment_group_id,NEW.assignee_id,NEW.subject,NEW.summary,NEW.requester_id,NEW.requester_email,NEW.created_at,NEW.updated_at,NEW.acknowledged_at,NEW.first_response_at,NEW.resolved_at,NEW.closed_at,NEW.next_action,NEW.next_action_at,NEW.mutation_id,NEW.revision,NEW.merged_into,NEW.sla_ack_minutes,NEW.sla_response_minutes,NEW.sla_resolution_minutes) ON CONFLICT(id) DO UPDATE SET ticket_number=excluded.ticket_number,type=excluded.type,status=excluded.status,resolution=excluded.resolution,priority=excluded.priority,impact=excluded.impact,urgency=excluded.urgency,priority_override=excluded.priority_override,service_id=excluded.service_id,component_id=excluded.component_id,category_id=excluded.category_id,assignment_group_id=excluded.assignment_group_id,assignee_id=excluded.assignee_id,subject=excluded.subject,summary=excluded.summary,requester_id=excluded.requester_id,requester_email=excluded.requester_email,created_at=excluded.created_at,updated_at=excluded.updated_at,acknowledged_at=excluded.acknowledged_at,first_response_at=excluded.first_response_at,resolved_at=excluded.resolved_at,closed_at=excluded.closed_at,next_action=excluded.next_action,next_action_at=excluded.next_action_at,mutation_id=excluded.mutation_id,revision=excluded.revision,merged_into=excluded.merged_into,sla_ack_minutes=excluded.sla_ack_minutes,sla_response_minutes=excluded.sla_response_minutes,sla_resolution_minutes=excluded.sla_resolution_minutes;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_tickets_UPDATE BEFORE UPDATE ON tickets WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ((NEW.service_id)=(SELECT id FROM services WHERE slug='tmkch-io') OR (OLD.service_id)=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_tickets_UPDATE AFTER UPDATE ON tickets WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND (NEW.service_id)=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.merged_into IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.merged_into))
BEGIN
INSERT INTO p_product01_cases(id,ticket_number,type,status,resolution,priority,impact,urgency,priority_override,service_id,component_id,category_id,assignment_group_id,assignee_id,subject,summary,requester_id,requester_email,created_at,updated_at,acknowledged_at,first_response_at,resolved_at,closed_at,next_action,next_action_at,mutation_id,revision,merged_into,sla_ack_minutes,sla_response_minutes,sla_resolution_minutes) VALUES(NEW.id,NEW.ticket_number,NEW.type,NEW.status,NEW.resolution,NEW.priority,NEW.impact,NEW.urgency,NEW.priority_override,NEW.service_id,NEW.component_id,NEW.category_id,NEW.assignment_group_id,NEW.assignee_id,NEW.subject,NEW.summary,NEW.requester_id,NEW.requester_email,NEW.created_at,NEW.updated_at,NEW.acknowledged_at,NEW.first_response_at,NEW.resolved_at,NEW.closed_at,NEW.next_action,NEW.next_action_at,NEW.mutation_id,NEW.revision,NEW.merged_into,NEW.sla_ack_minutes,NEW.sla_response_minutes,NEW.sla_resolution_minutes) ON CONFLICT(id) DO UPDATE SET ticket_number=excluded.ticket_number,type=excluded.type,status=excluded.status,resolution=excluded.resolution,priority=excluded.priority,impact=excluded.impact,urgency=excluded.urgency,priority_override=excluded.priority_override,service_id=excluded.service_id,component_id=excluded.component_id,category_id=excluded.category_id,assignment_group_id=excluded.assignment_group_id,assignee_id=excluded.assignee_id,subject=excluded.subject,summary=excluded.summary,requester_id=excluded.requester_id,requester_email=excluded.requester_email,created_at=excluded.created_at,updated_at=excluded.updated_at,acknowledged_at=excluded.acknowledged_at,first_response_at=excluded.first_response_at,resolved_at=excluded.resolved_at,closed_at=excluded.closed_at,next_action=excluded.next_action,next_action_at=excluded.next_action_at,mutation_id=excluded.mutation_id,revision=excluded.revision,merged_into=excluded.merged_into,sla_ack_minutes=excluded.sla_ack_minutes,sla_response_minutes=excluded.sla_response_minutes,sla_resolution_minutes=excluded.sla_resolution_minutes;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_tickets_DELETE BEFORE DELETE ON tickets WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ((OLD.service_id)=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_tickets_DELETE AFTER DELETE ON tickets WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND (OLD.service_id)=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_cases WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_case_sources (source_type TEXT NOT NULL, source_id TEXT NOT NULL, ticket_id TEXT NOT NULL REFERENCES p_product01_cases(id), PRIMARY KEY(source_type,source_id));

CREATE INDEX IF NOT EXISTS p_product01_idx_ticket_sources_ticket ON p_product01_case_sources(ticket_id);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('ticket_sources'))=3 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('ticket_sources') WHERE name NOT IN ('source_type','source_id','ticket_id')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_case_sources'))=3 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_case_sources') WHERE name NOT IN ('source_type','source_id','ticket_id')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_sources_INSERT BEFORE INSERT ON ticket_sources WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_sources_INSERT AFTER INSERT ON ticket_sources WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.ticket_id))
BEGIN
INSERT INTO p_product01_case_sources(source_type,source_id,ticket_id) VALUES(NEW.source_type,NEW.source_id,NEW.ticket_id) ON CONFLICT(source_type,source_id) DO UPDATE SET ticket_id=excluded.ticket_id;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_sources_UPDATE BEFORE UPDATE ON ticket_sources WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_sources_UPDATE AFTER UPDATE ON ticket_sources WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.ticket_id))
BEGIN
INSERT INTO p_product01_case_sources(source_type,source_id,ticket_id) VALUES(NEW.source_type,NEW.source_id,NEW.ticket_id) ON CONFLICT(source_type,source_id) DO UPDATE SET ticket_id=excluded.ticket_id;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_sources_DELETE BEFORE DELETE ON ticket_sources WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_sources_DELETE AFTER DELETE ON ticket_sources WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_case_sources WHERE source_type=OLD.source_type AND source_id=OLD.source_id;
END;

CREATE TABLE IF NOT EXISTS p_product01_case_messages (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES p_product01_cases(id), direction TEXT NOT NULL CHECK(direction IN ('INBOUND','OUTBOUND')), visibility TEXT NOT NULL CHECK(visibility IN ('PUBLIC','INTERNAL')), sender TEXT, recipient TEXT, subject TEXT, body TEXT NOT NULL, created_at TEXT NOT NULL, legacy_message_id TEXT UNIQUE REFERENCES p_product01_support_messages(id), is_automatic INTEGER NOT NULL DEFAULT 0, CHECK(visibility='PUBLIC' OR recipient IS NULL));

CREATE INDEX IF NOT EXISTS p_product01_idx_ticket_messages_page ON p_product01_case_messages(ticket_id,created_at,id);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('ticket_messages'))=11 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('ticket_messages') WHERE name NOT IN ('id','ticket_id','direction','visibility','sender','recipient','subject','body','created_at','legacy_message_id','is_automatic')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_case_messages'))=11 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_case_messages') WHERE name NOT IN ('id','ticket_id','direction','visibility','sender','recipient','subject','body','created_at','legacy_message_id','is_automatic')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_messages_INSERT BEFORE INSERT ON ticket_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_messages_INSERT AFTER INSERT ON ticket_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.ticket_id)) AND (NEW.legacy_message_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_messages WHERE id=NEW.legacy_message_id))
BEGIN
INSERT INTO p_product01_case_messages(id,ticket_id,direction,visibility,sender,recipient,subject,body,created_at,legacy_message_id,is_automatic) VALUES(NEW.id,NEW.ticket_id,NEW.direction,NEW.visibility,NEW.sender,NEW.recipient,NEW.subject,NEW.body,NEW.created_at,NEW.legacy_message_id,NEW.is_automatic) ON CONFLICT(id) DO UPDATE SET ticket_id=excluded.ticket_id,direction=excluded.direction,visibility=excluded.visibility,sender=excluded.sender,recipient=excluded.recipient,subject=excluded.subject,body=excluded.body,created_at=excluded.created_at,legacy_message_id=excluded.legacy_message_id,is_automatic=excluded.is_automatic;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_messages_UPDATE BEFORE UPDATE ON ticket_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_messages_UPDATE AFTER UPDATE ON ticket_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.ticket_id)) AND (NEW.legacy_message_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_support_messages WHERE id=NEW.legacy_message_id))
BEGIN
INSERT INTO p_product01_case_messages(id,ticket_id,direction,visibility,sender,recipient,subject,body,created_at,legacy_message_id,is_automatic) VALUES(NEW.id,NEW.ticket_id,NEW.direction,NEW.visibility,NEW.sender,NEW.recipient,NEW.subject,NEW.body,NEW.created_at,NEW.legacy_message_id,NEW.is_automatic) ON CONFLICT(id) DO UPDATE SET ticket_id=excluded.ticket_id,direction=excluded.direction,visibility=excluded.visibility,sender=excluded.sender,recipient=excluded.recipient,subject=excluded.subject,body=excluded.body,created_at=excluded.created_at,legacy_message_id=excluded.legacy_message_id,is_automatic=excluded.is_automatic;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_messages_DELETE BEFORE DELETE ON ticket_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_messages_DELETE AFTER DELETE ON ticket_messages WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_case_messages WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_case_events (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES p_product01_cases(id), event_type TEXT NOT NULL, actor_id TEXT, metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);

CREATE INDEX IF NOT EXISTS p_product01_idx_ticket_events_page ON p_product01_case_events(ticket_id,created_at,id);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('ticket_events'))=6 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('ticket_events') WHERE name NOT IN ('id','ticket_id','event_type','actor_id','metadata','created_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_case_events'))=6 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_case_events') WHERE name NOT IN ('id','ticket_id','event_type','actor_id','metadata','created_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_events_INSERT BEFORE INSERT ON ticket_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_events_INSERT AFTER INSERT ON ticket_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.ticket_id))
BEGIN
INSERT INTO p_product01_case_events(id,ticket_id,event_type,actor_id,metadata,created_at) VALUES(NEW.id,NEW.ticket_id,NEW.event_type,NEW.actor_id,NEW.metadata,NEW.created_at) ON CONFLICT(id) DO UPDATE SET ticket_id=excluded.ticket_id,event_type=excluded.event_type,actor_id=excluded.actor_id,metadata=excluded.metadata,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_events_UPDATE BEFORE UPDATE ON ticket_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_events_UPDATE AFTER UPDATE ON ticket_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.ticket_id))
BEGIN
INSERT INTO p_product01_case_events(id,ticket_id,event_type,actor_id,metadata,created_at) VALUES(NEW.id,NEW.ticket_id,NEW.event_type,NEW.actor_id,NEW.metadata,NEW.created_at) ON CONFLICT(id) DO UPDATE SET ticket_id=excluded.ticket_id,event_type=excluded.event_type,actor_id=excluded.actor_id,metadata=excluded.metadata,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_events_DELETE BEFORE DELETE ON ticket_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_events_DELETE AFTER DELETE ON ticket_events WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_case_events WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_case_reports (id TEXT PRIMARY KEY REFERENCES p_product01_moderation_reports(id), ticket_id TEXT NOT NULL REFERENCES p_product01_cases(id), reported_user_id TEXT, reported_content_id TEXT, reason TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL);

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('ticket_reports'))=7 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('ticket_reports') WHERE name NOT IN ('id','ticket_id','reported_user_id','reported_content_id','reason','detail','created_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_case_reports'))=7 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_case_reports') WHERE name NOT IN ('id','ticket_id','reported_user_id','reported_content_id','reason','detail','created_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_reports_INSERT BEFORE INSERT ON ticket_reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_reports_INSERT AFTER INSERT ON ticket_reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.id IS NULL OR EXISTS(SELECT 1 FROM p_product01_moderation_reports WHERE id=NEW.id)) AND (NEW.ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.ticket_id))
BEGIN
INSERT INTO p_product01_case_reports(id,ticket_id,reported_user_id,reported_content_id,reason,detail,created_at) VALUES(NEW.id,NEW.ticket_id,NEW.reported_user_id,NEW.reported_content_id,NEW.reason,NEW.detail,NEW.created_at) ON CONFLICT(id) DO UPDATE SET ticket_id=excluded.ticket_id,reported_user_id=excluded.reported_user_id,reported_content_id=excluded.reported_content_id,reason=excluded.reason,detail=excluded.detail,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_reports_UPDATE BEFORE UPDATE ON ticket_reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_reports_UPDATE AFTER UPDATE ON ticket_reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.id IS NULL OR EXISTS(SELECT 1 FROM p_product01_moderation_reports WHERE id=NEW.id)) AND (NEW.ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.ticket_id))
BEGIN
INSERT INTO p_product01_case_reports(id,ticket_id,reported_user_id,reported_content_id,reason,detail,created_at) VALUES(NEW.id,NEW.ticket_id,NEW.reported_user_id,NEW.reported_content_id,NEW.reason,NEW.detail,NEW.created_at) ON CONFLICT(id) DO UPDATE SET ticket_id=excluded.ticket_id,reported_user_id=excluded.reported_user_id,reported_content_id=excluded.reported_content_id,reason=excluded.reason,detail=excluded.detail,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_reports_DELETE BEFORE DELETE ON ticket_reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_reports_DELETE AFTER DELETE ON ticket_reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=OLD.ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_case_reports WHERE id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS p_product01_case_relations (id TEXT PRIMARY KEY, source_ticket_id TEXT NOT NULL REFERENCES p_product01_cases(id), target_ticket_id TEXT NOT NULL REFERENCES p_product01_cases(id), relation_type TEXT NOT NULL CHECK(relation_type IN ('RELATED','DUPLICATE','PARENT','CHILD')), created_at TEXT NOT NULL, UNIQUE(source_ticket_id,target_ticket_id,relation_type), CHECK(source_ticket_id<>target_ticket_id));

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('ticket_relations'))=5 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('ticket_relations') WHERE name NOT IN ('id','source_ticket_id','target_ticket_id','relation_type','created_at')) THEN 0 ELSE 1 END;

INSERT OR REPLACE INTO project_storage_checks SELECT (SELECT id FROM services WHERE slug='tmkch-io'),CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('p_product01_case_relations'))=5 AND NOT EXISTS(SELECT 1 FROM pragma_table_info('p_product01_case_relations') WHERE name NOT IN ('id','source_ticket_id','target_ticket_id','relation_type','created_at')) THEN 0 ELSE 1 END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_relations_INSERT BEFORE INSERT ON ticket_relations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.source_ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_relations_INSERT AFTER INSERT ON ticket_relations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.source_ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.source_ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.source_ticket_id)) AND (NEW.target_ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.target_ticket_id))
BEGIN
INSERT INTO p_product01_case_relations(id,source_ticket_id,target_ticket_id,relation_type,created_at) VALUES(NEW.id,NEW.source_ticket_id,NEW.target_ticket_id,NEW.relation_type,NEW.created_at) ON CONFLICT(id) DO UPDATE SET source_ticket_id=excluded.source_ticket_id,target_ticket_id=excluded.target_ticket_id,relation_type=excluded.relation_type,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_relations_UPDATE BEFORE UPDATE ON ticket_relations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=NEW.source_ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') OR ((SELECT service_id FROM main.tickets WHERE id=OLD.source_ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_relations_UPDATE AFTER UPDATE ON ticket_relations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=NEW.source_ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io') AND (NEW.source_ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.source_ticket_id)) AND (NEW.target_ticket_id IS NULL OR EXISTS(SELECT 1 FROM p_product01_cases WHERE id=NEW.target_ticket_id))
BEGIN
INSERT INTO p_product01_case_relations(id,source_ticket_id,target_ticket_id,relation_type,created_at) VALUES(NEW.id,NEW.source_ticket_id,NEW.target_ticket_id,NEW.relation_type,NEW.created_at) ON CONFLICT(id) DO UPDATE SET source_ticket_id=excluded.source_ticket_id,target_ticket_id=excluded.target_ticket_id,relation_type=excluded.relation_type,created_at=excluded.created_at;
END;

CREATE TRIGGER IF NOT EXISTS p_product01_fence_ticket_relations_DELETE BEFORE DELETE ON ticket_relations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND (((SELECT service_id FROM main.tickets WHERE id=OLD.source_ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io'))
BEGIN
SELECT RAISE(ABORT,'ProjectStorageMoved');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_mirror_ticket_relations_DELETE AFTER DELETE ON ticket_relations WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='copying' AND ((SELECT service_id FROM main.tickets WHERE id=OLD.source_ticket_id))=(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
DELETE FROM p_product01_case_relations WHERE id=OLD.id;
END;

CREATE UNIQUE INDEX IF NOT EXISTS p_product01_form_idempotency ON p_product01_support_messages(provider_message_id) WHERE direction='inbound' AND provider_message_id LIKE 'form-%';

CREATE TRIGGER IF NOT EXISTS p_product01_ticket_report_insert AFTER INSERT ON p_product01_moderation_reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ( NEW.support_thread_id IS NOT NULL
) BEGIN
INSERT OR IGNORE INTO p_product01_case_sources VALUES('report',NEW.id,NEW.support_thread_id);
INSERT OR IGNORE INTO p_product01_case_reports VALUES(NEW.id,NEW.support_thread_id,NEW.author_ref_hash,NEW.content_external_id,NEW.reason_code,NEW.detail,NEW.created_at);
UPDATE p_product01_cases SET type='REPORT',assignment_group_id='moderation',requester_id=NEW.reporter_ref_hash,
 priority= CASE NEW.priority WHEN 'high' THEN 'P2' WHEN 'low' THEN 'P4' ELSE 'P3' END ,
 impact= CASE NEW.priority WHEN 'high' THEN 'HIGH' WHEN 'low' THEN 'LOW' ELSE 'MEDIUM' END ,
 urgency= CASE NEW.priority WHEN 'low' THEN 'LOW' ELSE 'MEDIUM' END
 WHERE id=NEW.support_thread_id;
UPDATE p_product01_cases SET sla_ack_minutes=(SELECT ack FROM ticket_sla_settings WHERE priority=p_product01_cases.priority),sla_response_minutes=(SELECT response FROM ticket_sla_settings WHERE priority=p_product01_cases.priority),sla_resolution_minutes=(SELECT resolution FROM ticket_sla_settings WHERE priority=p_product01_cases.priority) WHERE id=NEW.support_thread_id;

END;

CREATE TRIGGER IF NOT EXISTS p_product01_ticket_report_link AFTER UPDATE OF support_thread_id ON p_product01_moderation_reports WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ( OLD.support_thread_id IS NULL AND NEW.support_thread_id IS NOT NULL
) BEGIN
INSERT OR IGNORE INTO p_product01_case_sources VALUES('report',NEW.id,NEW.support_thread_id);
INSERT OR IGNORE INTO p_product01_case_reports VALUES(NEW.id,NEW.support_thread_id,NEW.author_ref_hash,NEW.content_external_id,NEW.reason_code,NEW.detail,NEW.created_at);
UPDATE p_product01_cases SET type='REPORT',assignment_group_id='moderation',requester_id=NEW.reporter_ref_hash,
 priority= CASE NEW.priority WHEN 'high' THEN 'P2' WHEN 'low' THEN 'P4' ELSE 'P3' END ,
 impact= CASE NEW.priority WHEN 'high' THEN 'HIGH' WHEN 'low' THEN 'LOW' ELSE 'MEDIUM' END ,
 urgency= CASE NEW.priority WHEN 'low' THEN 'LOW' ELSE 'MEDIUM' END
 WHERE id=NEW.support_thread_id;
UPDATE p_product01_cases SET sla_ack_minutes=(SELECT ack FROM ticket_sla_settings WHERE priority=p_product01_cases.priority),sla_response_minutes=(SELECT response FROM ticket_sla_settings WHERE priority=p_product01_cases.priority),sla_resolution_minutes=(SELECT resolution FROM ticket_sla_settings WHERE priority=p_product01_cases.priority) WHERE id=NEW.support_thread_id;

END;

CREATE TRIGGER IF NOT EXISTS p_product01_ticket_report_event AFTER INSERT ON p_product01_moderation_events 
 WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' BEGIN
INSERT OR IGNORE INTO p_product01_case_events SELECT 'report:' || NEW.id,s.ticket_id, CASE NEW.event_type WHEN 'note_added' THEN 'INTERNAL_NOTE_ADDED' WHEN 'resolution_updated' THEN 'REPORT_ACTION' ELSE 'LEGACY_EVENT' END ,NEW.actor_id,json_object('legacyType',NEW.event_type,'from',NEW.from_status,'to',NEW.to_status,'note',NEW.note),NEW.created_at FROM p_product01_case_sources s WHERE s.source_type='report' AND s.source_id=NEW.report_id;

END;

CREATE TRIGGER IF NOT EXISTS p_product01_ticket_send_record AFTER INSERT ON p_product01_support_reply_sends
 WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' BEGIN
UPDATE p_product01_case_messages SET is_automatic= CASE WHEN NEW.idempotency_key LIKE 'report-receipt-%' THEN 1 ELSE 0 END WHERE legacy_message_id=NEW.message_id;
UPDATE p_product01_cases SET first_response_at=COALESCE(first_response_at,(SELECT created_at FROM p_product01_case_messages WHERE legacy_message_id=NEW.message_id)) WHERE id=(SELECT ticket_id FROM p_product01_case_sources WHERE source_type='support' AND source_id=NEW.thread_id);
END;

CREATE TRIGGER IF NOT EXISTS p_product01_ticket_support_insert AFTER INSERT ON p_product01_support_tickets 
 WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' BEGIN
INSERT OR IGNORE INTO ticket_numbers(ticket_id) VALUES(NEW.id);
INSERT OR IGNORE INTO p_product01_cases(id,ticket_number,type,status,resolution,priority,impact,urgency,service_id,subject,requester_email,created_at,updated_at,resolved_at,closed_at,sla_ack_minutes,sla_response_minutes,sla_resolution_minutes) VALUES(NEW.id,(SELECT 'TK-' || printf('%06d',seq) FROM ticket_numbers WHERE ticket_id=NEW.id),'INQUIRY','NEW',NULL,'P3','MEDIUM','MEDIUM',COALESCE(NEW.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned'),NEW.subject,NULLIF(NEW.requester_email,''),NEW.created_at,NEW.updated_at,NULL,NULL,(SELECT ack FROM ticket_sla_settings WHERE priority='P3'),(SELECT response FROM ticket_sla_settings WHERE priority='P3'),(SELECT resolution FROM ticket_sla_settings WHERE priority='P3'));
INSERT OR IGNORE INTO p_product01_case_sources VALUES('support',NEW.id,NEW.id);
INSERT OR IGNORE INTO p_product01_case_events VALUES('created:' || NEW.id,NEW.id,'TICKET_CREATED',NULL,'{}',NEW.created_at);
END;

CREATE TRIGGER IF NOT EXISTS p_product01_ticket_message_insert AFTER INSERT ON p_product01_support_messages 
 WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' BEGIN
INSERT OR IGNORE INTO p_product01_case_messages SELECT NEW.id,s.ticket_id, CASE NEW.direction WHEN 'inbound' THEN 'INBOUND' ELSE 'OUTBOUND' END , CASE NEW.direction WHEN 'internal_note' THEN 'INTERNAL' ELSE 'PUBLIC' END ,NEW.sender, CASE WHEN NEW.direction<>'internal_note' THEN NEW.recipient END ,NULL,NEW.body_text,NEW.created_at,NEW.id,0 FROM p_product01_case_sources s WHERE s.source_type='support' AND s.source_id=NEW.thread_id;
INSERT OR IGNORE INTO p_product01_case_events SELECT 'message:' || NEW.id,s.ticket_id, CASE NEW.direction WHEN 'inbound' THEN 'MESSAGE_RECEIVED' WHEN 'outbound' THEN 'MESSAGE_SENT' ELSE 'INTERNAL_NOTE_ADDED' END ,NEW.sender,json_object('messageId',NEW.id),NEW.created_at FROM p_product01_case_sources s WHERE s.source_type='support' AND s.source_id=NEW.thread_id;
INSERT OR IGNORE INTO p_product01_case_events SELECT 'reopen:' || NEW.id,t.id,'REOPENED',NULL,json_object('previousStatus',t.status,'newStatus','IN_PROGRESS','reason','inbound_reply'),NEW.created_at FROM p_product01_cases t JOIN p_product01_case_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=NEW.thread_id AND NEW.direction='inbound' AND t.status IN ('RESOLVED','CLOSED') AND t.merged_into IS NULL AND NOT EXISTS(SELECT 1 FROM p_product01_case_sources z WHERE z.ticket_id=t.id AND z.source_type='report');
INSERT OR IGNORE INTO p_product01_case_events SELECT 'resume:' || NEW.id,t.id,'STATUS_CHANGED',NULL,json_object('previousStatus',t.status,'newStatus','IN_PROGRESS','reason','inbound_reply'),NEW.created_at FROM p_product01_cases t JOIN p_product01_case_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=NEW.thread_id AND NEW.direction='inbound' AND t.status='WAITING_CUSTOMER' AND NOT EXISTS(SELECT 1 FROM p_product01_case_sources z WHERE z.ticket_id=t.id AND z.source_type='report');
UPDATE p_product01_cases SET updated_at=NEW.created_at,revision=revision+1,
 resolution= CASE WHEN NEW.direction='inbound' AND status IN ('RESOLVED','CLOSED') AND merged_into IS NULL AND NOT EXISTS(SELECT 1 FROM p_product01_case_sources z WHERE z.ticket_id=p_product01_cases.id AND z.source_type='report') THEN NULL ELSE resolution END ,
 resolved_at= CASE WHEN NEW.direction='inbound' AND status IN ('RESOLVED','CLOSED') AND merged_into IS NULL AND NOT EXISTS(SELECT 1 FROM p_product01_case_sources z WHERE z.ticket_id=p_product01_cases.id AND z.source_type='report') THEN NULL ELSE resolved_at END ,
 closed_at= CASE WHEN NEW.direction='inbound' AND status IN ('RESOLVED','CLOSED') AND merged_into IS NULL AND NOT EXISTS(SELECT 1 FROM p_product01_case_sources z WHERE z.ticket_id=p_product01_cases.id AND z.source_type='report') THEN NULL ELSE closed_at END ,
 status= CASE WHEN NEW.direction='inbound' AND status IN ('WAITING_CUSTOMER','RESOLVED','CLOSED') AND merged_into IS NULL AND NOT EXISTS(SELECT 1 FROM p_product01_case_sources z WHERE z.ticket_id=p_product01_cases.id AND z.source_type='report') THEN 'IN_PROGRESS' ELSE status END
 WHERE id=(SELECT ticket_id FROM p_product01_case_sources WHERE source_type='support' AND source_id=NEW.thread_id);


END;

CREATE TRIGGER IF NOT EXISTS p_product01_ticket_report_decision AFTER UPDATE OF status,resolution_code,moderation_revision ON p_product01_moderation_reports
WHEN (SELECT state FROM project_storage WHERE project_id=(SELECT id FROM services WHERE slug='tmkch-io'))='active' AND ( NEW.status<>OLD.status OR NEW.resolution_code IS NOT OLD.resolution_code OR NEW.moderation_revision>OLD.moderation_revision
) BEGIN
UPDATE p_product01_cases SET
 status= CASE NEW.status WHEN 'reviewing' THEN 'TRIAGE' WHEN 'actioned' THEN 'RESOLVED' WHEN 'closed' THEN 'CLOSED' ELSE 'NEW' END ,
 resolution= CASE WHEN NEW.status IN ('closed','actioned') THEN CASE NEW.resolution_code WHEN 'content_removed' THEN 'CONTENT_REMOVED' WHEN 'content_deleted' THEN 'CONTENT_REMOVED' WHEN 'no_action_required' THEN 'NO_ACTION_REQUIRED' WHEN 'no_action' THEN 'NO_ACTION_REQUIRED' ELSE 'OTHER' END ELSE NULL END ,
 resolved_at=NEW.resolved_at,closed_at= CASE WHEN NEW.status='closed' THEN NEW.resolved_at ELSE NULL END ,updated_at=NEW.updated_at,revision=revision+1
 WHERE id=(SELECT ticket_id FROM p_product01_case_sources WHERE source_type='report' AND source_id=NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS p_product01_owner_tickets_INSERT BEFORE INSERT ON p_product01_cases WHEN NEW.service_id IS NOT NULL AND NEW.service_id<>(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
SELECT RAISE(ABORT,'ProjectOwnershipMismatch');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_owner_tickets_UPDATE BEFORE UPDATE ON p_product01_cases WHEN NEW.service_id IS NOT NULL AND NEW.service_id<>(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
SELECT RAISE(ABORT,'ProjectOwnershipMismatch');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_owner_reports_INSERT BEFORE INSERT ON p_product01_moderation_reports WHEN NEW.app_id IS NOT NULL AND NEW.app_id<>(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
SELECT RAISE(ABORT,'ProjectOwnershipMismatch');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_owner_reports_UPDATE BEFORE UPDATE ON p_product01_moderation_reports WHEN NEW.app_id IS NOT NULL AND NEW.app_id<>(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
SELECT RAISE(ABORT,'ProjectOwnershipMismatch');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_owner_support_threads_INSERT BEFORE INSERT ON p_product01_support_tickets WHEN NEW.app_id IS NOT NULL AND NEW.app_id<>(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
SELECT RAISE(ABORT,'ProjectOwnershipMismatch');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_owner_support_threads_UPDATE BEFORE UPDATE ON p_product01_support_tickets WHEN NEW.app_id IS NOT NULL AND NEW.app_id<>(SELECT id FROM services WHERE slug='tmkch-io')
BEGIN
SELECT RAISE(ABORT,'ProjectOwnershipMismatch');
END;

CREATE TRIGGER IF NOT EXISTS p_product01_identity_tickets BEFORE INSERT ON p_product01_cases
BEGIN
SELECT CASE WHEN EXISTS(SELECT 1 FROM project_record_ids WHERE kind='ticket' AND id=NEW.id AND project_id<>(SELECT id FROM services WHERE slug='tmkch-io')) THEN RAISE(ABORT,'ProjectIdCollision') END;
INSERT OR IGNORE INTO project_record_ids VALUES('ticket',NEW.id,(SELECT id FROM services WHERE slug='tmkch-io'));
END;

INSERT OR IGNORE INTO project_record_ids SELECT 'ticket',r.id,r.service_id FROM tickets r WHERE r.service_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS p_product01_identity_reports BEFORE INSERT ON p_product01_moderation_reports
BEGIN
SELECT CASE WHEN EXISTS(SELECT 1 FROM project_record_ids WHERE kind='report' AND id=NEW.id AND project_id<>(SELECT id FROM services WHERE slug='tmkch-io')) THEN RAISE(ABORT,'ProjectIdCollision') END;
INSERT OR IGNORE INTO project_record_ids VALUES('report',NEW.id,(SELECT id FROM services WHERE slug='tmkch-io'));
END;

INSERT OR IGNORE INTO project_record_ids SELECT 'report',r.id,r.app_id FROM reports r WHERE r.app_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS p_product01_identity_support_threads BEFORE INSERT ON p_product01_support_tickets
BEGIN
SELECT CASE WHEN EXISTS(SELECT 1 FROM project_record_ids WHERE kind='thread' AND id=NEW.id AND project_id<>(SELECT id FROM services WHERE slug='tmkch-io')) THEN RAISE(ABORT,'ProjectIdCollision') END;
INSERT OR IGNORE INTO project_record_ids VALUES('thread',NEW.id,(SELECT id FROM services WHERE slug='tmkch-io'));
END;

INSERT OR IGNORE INTO project_record_ids SELECT 'thread',r.id,COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=r.id),r.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM support_threads r WHERE COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=r.id),r.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS p_product01_identity_support_messages BEFORE INSERT ON p_product01_support_messages
BEGIN
SELECT CASE WHEN EXISTS(SELECT 1 FROM project_record_ids WHERE kind='message' AND id=NEW.id AND project_id<>(SELECT id FROM services WHERE slug='tmkch-io')) THEN RAISE(ABORT,'ProjectIdCollision') END;
INSERT OR IGNORE INTO project_record_ids VALUES('message',NEW.id,(SELECT id FROM services WHERE slug='tmkch-io'));
END;

INSERT OR IGNORE INTO project_record_ids SELECT 'message',r.id,(SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=r.thread_id) FROM support_messages r WHERE (SELECT COALESCE((SELECT t.service_id FROM main.tickets t JOIN main.ticket_sources s ON s.ticket_id=t.id WHERE s.source_type='support' AND s.source_id=th.id),th.app_id,(SELECT value FROM platform_settings WHERE key='default_service_id'),'unassigned') FROM main.support_threads th WHERE th.id=r.thread_id) IS NOT NULL;