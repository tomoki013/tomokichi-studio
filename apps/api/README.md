# tomokichi-api

`https://api.tmkch.io` — one Cloudflare Worker, one namespace per app. Domain
logic stays separated: nothing under `remeet/` may depend on another app's
service, and vice versa.

| Namespace | What it is |
|---|---|
| `/api/v1/support`, `/api/support` | the shared contact form |
| `/remeet/v1/invites*` | Remeet invitations |
| `/api/v1/health` | liveness |

```bash
pnpm dev        # wrangler dev on :8787
pnpm check      # wrangler types + tsc
pnpm test       # vitest, in workerd
pnpm deploy
```

## Remeet invitations

The entrance to a CloudKit share, and nothing else about Remeet. The invitation
URL people actually send is not here — it is `https://remeet.tmkch.io/i/{token}`,
served by the site, which asks this API only for the code to display.

| | |
|---|---|
| `POST /remeet/v1/invites` | `{ ckShareUrl }` → `{ inviteUrl, inviteCode, managementToken, expiresAt }` |
| `POST /remeet/v1/invites/resolve` | `{ token }` or `{ code }` → `{ ckShareUrl }`. The app only |
| `POST /remeet/v1/invites/preview` | `{ token }` → `{ inviteCode }`. For the landing page; never returns a share URL |
| `POST /remeet/v1/invites/revoke` | `{ token, managementToken }` → `{ status }` |

A cron trigger sweeps expired invitations nightly — see Housekeeping below.

Source: `src/routes/remeet/invites.ts` (HTTP, rate limits, client filter) over
`src/services/remeet/` (the domain). Schema in `migrations/`.

### What it stores, and what it refuses to

One row per invitation: opaque lookup hashes, an encrypted CKShare URL, an
encrypted invite code, a status and two timestamps. No name, no reunion, no
photo, no date, no participant — none of Remeet's own data comes near this
database. CloudKit remains the only thing that decides who is in a reunion;
this guards the entrance, and revoking cannot remove somebody already inside.

Four properties worth knowing before changing anything here:

- **Tokens and codes are never stored.** D1 holds
  `HMAC-SHA256(secret, value)`, with the secret in a Worker secret. A copy of
  the database is not a working invitation.
- **The share URL and the code are encrypted above D1's own encryption**, with
  AES-GCM and the invite id as additional authenticated data, so a ciphertext
  cannot be moved between rows.
- **Every "no" is the same `INVITE_UNAVAILABLE`.** Unknown, expired, revoked,
  superseded and wrong-management-token are indistinguishable from outside.
- **Nothing here is logged.** Every request carries either a CKShare URL or a
  value that resolves to one — which is why `routes/remeet/invites.ts` has no
  logging while `routes/support.ts` beside it does.

### Who may call it

`REMEET_INVITE_CLIENT_KEY` is a value the Remeet app and the Remeet site send
as `X-Remeet-Client`. It ships inside the app, so it is a filter rather than a
credential: it stops a bare `curl` and the scanners that follow a domain, not
somebody who has opened the binary. Unset means unenforced, so rotating it
cannot lock out builds already in people's hands — add the new value to the
app and the site first, then here.

Rate limits are per IP, tightest on codes: a wrong code spends five of the
minute's ten attempts, so guessing costs two tries a minute. App Attest is the
control that would make this a real answer; it needs a physical device to
develop against and is the one Phase 5 item left open in `docs/invite-flow.md`
in the app repository.

### The audit trail

`invite_metrics` holds one row per day per outcome and a count — `created`,
`resolved`, `resolve_unavailable`, `code_failed`, `previewed`, `revoked`,
`rejected`. No token, no code, no address, no share: an audit trail that could
identify an invitation would be the thing it exists to protect.

What it answers is whether somebody is working through the code space, which
looks like `code_failed` climbing away from `resolved`:

```bash
pnpm exec wrangler d1 execute remeet-invites --remote \
  --command "SELECT day, outcome, count FROM invite_metrics ORDER BY day DESC, outcome"
```

Counting never fails a request — a broken tally must not turn a working
invitation into an error.

### Housekeeping

A cron trigger (`17 3 * * *`) deletes invitations that expired more than a day
ago. The delay is deliberate: an expired invitation cannot be resolved either
way, and keeping the row a while longer is what stops "expired" and "never
existed" from being distinguishable by how long the answer takes.

### Rotating the keys

Both secrets can be replaced without invalidating invitations already in
people's messages. Reads try the current key and fall back to the retiring one;
writes always use the current one.

```bash
# 1. Move the current values into the PREVIOUS slots.
pnpm exec wrangler secret put REMEET_INVITE_TOKEN_SECRET_PREVIOUS   # the old value
pnpm exec wrangler secret put REMEET_INVITE_URL_KEY_PREVIOUS        # the old value

# 2. Put the new values in place.
openssl rand -base64 32 | pnpm exec wrangler secret put REMEET_INVITE_TOKEN_SECRET
openssl rand -base64 32 | pnpm exec wrangler secret put REMEET_INVITE_URL_KEY

# 3. After the longest invitation lifetime has passed — eight days, to be
#    safe — delete the two PREVIOUS secrets.
pnpm exec wrangler secret delete REMEET_INVITE_TOKEN_SECRET_PREVIOUS
pnpm exec wrangler secret delete REMEET_INVITE_URL_KEY_PREVIOUS
```

Deleting the previous keys before step 3's wait is what makes a rotation
destructive: everything written under them stops resolving that moment.

The client key rotates the other way round — app and site first, API last —
because an unset `REMEET_INVITE_CLIENT_KEY` is unenforced rather than closed.

### Provisioning

Done once, and already done for production. To rebuild it elsewhere:

```bash
pnpm exec wrangler d1 create remeet-invites
# put the printed database_id into wrangler.jsonc
pnpm exec wrangler d1 execute remeet-invites --remote --file migrations/0001_create_invites.sql
pnpm exec wrangler d1 execute remeet-invites --remote --file migrations/0002_add_invite_code.sql

openssl rand -base64 32 | pnpm exec wrangler secret put REMEET_INVITE_TOKEN_SECRET
openssl rand -base64 32 | pnpm exec wrangler secret put REMEET_INVITE_URL_KEY
openssl rand -hex 24    | pnpm exec wrangler secret put REMEET_INVITE_CLIENT_KEY
```

Migrations are applied in order; `0003` adds the audit counters.

`REMEET_INVITE_URL_KEY` cannot be rotated on its own — every stored share URL
and code is sealed with it, so rotating invalidates every invitation still out.
That is survivable (they last seven days) but should be deliberate.

The endpoints answer `503` until the database and the first two secrets exist,
rather than running half-configured.

### Checking a deployment

```bash
KEY=$(pnpm exec wrangler secret list >/dev/null; echo "<the client key from the app build settings>")
curl -s -X POST https://api.tmkch.io/remeet/v1/invites \
  -H 'content-type: application/json' -H "X-Remeet-Client: $KEY" \
  -d '{"ckShareUrl":"https://www.icloud.com/share/0000000000000000000000000"}'
```

Without the header the same call answers `403`, which is the quickest way to
confirm the filter is on.

## Remeet moderation

Operator removal of shared Remeet content — the thing Guideline 1.2 asks for and
Remeet could not do until now, because everybody's data lives in their own
iCloud and Tomokichi Studio has no access to it.

The design is written up in `docs/moderation.md` and `docs/moderation-plan.md`
in the Remeet repository. What matters here:

- **The public manifest is one cached file, identical for everybody.**
  `GET /remeet/v1/moderation/manifest.json` takes no parameters, reads no header
  about the caller and sets no cookie. Each app downloads the whole list and
  matches it locally. The alternative — apps asking "what applies to my
  reunions?" — would have taught this server which accounts hold which reunions
  and when each person opens Remeet, which is the thing the feature exists to
  protect.
- **Each entry is `{ id, target }` and nothing else.** `target` is a SHA-256
  digest that only somebody already holding the content can match. The reason,
  the reunion, the reporter and the content type stay in D1.
- **This Worker cannot mint a manifest.** It is signed with an Ed25519 key that
  lives in the operator's login Keychain — not in this repository, not in a
  Worker secret, not in D1 or R2. Losing the admin token lets an attacker serve
  a file; every Remeet install rejects it, because it will not verify.

### Secrets

```bash
wrangler secret put REMEET_MODERATION_ADMIN_TOKEN   # bearer token for the operator routes
wrangler secret put REMEET_MODERATION_KEY_ID        # e.g. remeet-moderation-2026-08
```

Unset means the operator routes answer 403. That default is the opposite of
`REMEET_INVITE_CLIENT_KEY`'s, deliberately: an unset client key lets traffic
through so the key can be rotated, and an unset admin token must not.

### The operator tool

Runs on the Mac, never in CI.

```bash
# Once. Prints the public key to paste into Remeet's project.yml.
pnpm moderation keygen --key-id remeet-moderation-2026-08

export REMEET_MODERATION_TOKEN=…      # the admin bearer token
export REMEET_MODERATION_KEY_ID=remeet-moderation-2026-08
export REMEET_OPERATOR="tomokichi"

# A report came in, the content was read, and it breaks the rules.
pnpm moderation add --kind wish --id <content-uuid> --reason harassment --report-id <report-uuid>

# A reunion name rather than a piece of content. The value is part of the
# target, so correcting the name lifts the action by itself and re-entering the
# same one brings it back.
pnpm moderation add --kind reunionField --reunion <uuid> \
    --field sharedGroupDisplayName --value "…" --reason harassment

# Misjudged. Note that content already deleted does not come back — Remeet
# holds no copy of it, which is why revocation belongs before deletion.
pnpm moderation revoke --action-id <uuid> --note "misjudged"

# Nothing above reaches anybody until this: it signs the list and publishes it.
pnpm moderation publish
```

### The one operational trap

Signing is manual, so nothing renews the manifest on its own — and an expired
manifest is **refused outright** by every install. Content already hidden stays
hidden, but no new moderation reaches anybody, and there is no error on the
operator's side to notice.

The nightly cron therefore mails a warning once the manifest is within thirty
days of expiry, and keeps mailing until somebody runs `moderation publish`. If
that mail arrives, re-sign; it takes one command.

### Deploying it for the first time

Order matters — the invite change in the same release adds columns that the
running Worker's SQL needs:

```bash
wrangler d1 migrations apply remeet-invites --remote   # 0006, 0007, 0008
wrangler deploy
pnpm moderation keygen --key-id remeet-moderation-2026-08
# paste the printed public key into Remeet's project.yml (Release config)
wrangler secret put REMEET_MODERATION_ADMIN_TOKEN
wrangler secret put REMEET_MODERATION_KEY_ID
pnpm moderation publish     # publishes an empty, signed manifest at revision 1

# Optional, and useful: rehearse the whole thing on the dev channel first. It
# signs with the dev key and lands at dev-manifest.json, which only Debug builds
# read — a shipped build neither trusts that key nor fetches that path.
REMEET_MODERATION_ENV=dev REMEET_MODERATION_KEY_ID=remeet-moderation-dev-2026-08 \
  pnpm moderation publish
```

Publishing the empty manifest before shipping the app build is worth doing: it
means no install ever meets a 404 on its first fetch. A 404 is handled — it
changes nothing and keeps every tombstone — but there is no reason to rely on
that when one command avoids it.
