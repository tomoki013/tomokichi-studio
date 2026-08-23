-- Two manifest channels: production and dev.
--
-- Remeet's Debug and Release builds trust *different* Ed25519 keys, for the
-- same reason they talk to different CloudKit environments — a moderation
-- action minted while testing must not be able to order deletions on a build in
-- somebody's hands. That split only means something if there is somewhere to
-- publish a test manifest to; otherwise the Debug build points at a URL nobody
-- serves, which looks configured and is not.
--
-- The channel is part of the primary key rather than a second table, so the
-- "one row, replaced on each publish" shape and the revision monotonicity check
-- carry over unchanged.
--
-- The actions table is deliberately *not* split. An action is a decision about a
-- piece of content; which channel a manifest went out on is a property of the
-- publish, not of the decision. In practice dev publishes carry the same
-- actions, signed with the dev key, which is exactly what makes them a useful
-- rehearsal.
ALTER TABLE remeet_moderation_manifest RENAME TO remeet_moderation_manifest_v1;

CREATE TABLE IF NOT EXISTS remeet_moderation_manifest (
    channel      TEXT PRIMARY KEY CHECK (channel IN ('production', 'dev')),
    revision     INTEGER NOT NULL,
    generated_at TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    key_id       TEXT NOT NULL,
    body         TEXT NOT NULL,
    etag         TEXT NOT NULL
);

-- Anything already published was production, by definition: the dev channel did
-- not exist. Empty in practice — nothing has been published yet — but written
-- so the migration is correct whenever it happens to run.
INSERT INTO remeet_moderation_manifest (channel, revision, generated_at, expires_at, key_id, body, etag)
SELECT 'production', revision, generated_at, expires_at, key_id, body, etag
FROM remeet_moderation_manifest_v1
WHERE id = 1;

DROP TABLE remeet_moderation_manifest_v1;
