-- Operator moderation of shared Remeet content.
--
-- Two tables, and the split between them is the whole privacy design:
--
--   remeet_moderation_actions  — everything the operator needs, private to D1
--   (the published manifest)   — the id, the digest, and whether it is revoked
--
-- The manifest is a public file that every Remeet install fetches with no
-- identifier attached. Putting the reason, the reunion, the reporter or the
-- verb in it would turn that file into a running public account of who has been
-- moderated and why. Those columns therefore live here and are never served.
--
-- There is no column for the content itself. Remeet holds no copy of anybody's
-- writing or photos: the reported text goes to the operator by mail and the
-- photo to R2 with a 30-day lifecycle, and both are covered by the retention in
-- the privacy policy. A database of people's private writing is one somebody
-- has to protect forever, and this feature does not need one.
CREATE TABLE IF NOT EXISTS remeet_moderation_actions (
    action_id    TEXT PRIMARY KEY,

    -- Published. Opaque without the content it was computed from; see
    -- services/remeet/moderation-digest.ts.
    target       TEXT NOT NULL,

    -- Operator-only from here down.
    -- What the digest was computed from, kept so a mistaken action can be
    -- traced back and so the same content is not actioned twice by accident.
    target_kind  TEXT NOT NULL CHECK (
        target_kind IN ('wish', 'waitingMemory', 'anniversaryCard', 'statusNote', 'reunionField')
    ),
    content_id   TEXT,
    reunion_id   TEXT,
    root_field   TEXT,
    reason_code  TEXT NOT NULL,
    report_id    TEXT,
    note         TEXT,

    status       TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
    issued_at    TEXT NOT NULL,
    issued_by    TEXT NOT NULL,
    revoked_at   TEXT,
    revoked_by   TEXT
);

-- One action per target: issuing the same removal twice is a mistake, not a
-- second removal, and the manifest would carry a duplicate entry forever.
CREATE UNIQUE INDEX IF NOT EXISTS idx_moderation_target ON remeet_moderation_actions(target);
CREATE INDEX IF NOT EXISTS idx_moderation_status ON remeet_moderation_actions(status, issued_at);

-- The signed manifest, exactly as it is served.
--
-- Stored whole rather than rebuilt per request, because it is signed: the bytes
-- that were signed are the bytes that must be served, and reassembling them
-- from rows would reintroduce the canonicalisation problem the envelope format
-- exists to avoid. One row, replaced on each publish, plus the revision so a
-- rollback can be detected before it is served.
CREATE TABLE IF NOT EXISTS remeet_moderation_manifest (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    revision     INTEGER NOT NULL,
    generated_at TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    key_id       TEXT NOT NULL,
    body         TEXT NOT NULL,
    etag         TEXT NOT NULL
);
