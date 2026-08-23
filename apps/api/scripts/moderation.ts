#!/usr/bin/env node
/**
 * The operator's moderation tool. Runs on a Mac, never in CI.
 *
 * ## Why the signing key is here and nowhere else
 *
 * A Remeet install will delete somebody's content on the strength of this
 * manifest. That is a strong instruction, and the thing that makes it safe is
 * not the admin token — a Worker secret can be lost with the Worker — but the
 * fact that **the signing key exists only in the login Keychain of one Mac.**
 * Not in this repository, not in GitHub Secrets, not in Cloudflare Secrets, not
 * in D1, not in R2. An attacker who takes the API can serve a file; they cannot
 * make one that verifies, so nobody's app acts on it.
 *
 * Ed25519, and `crypto.sign(null, …)`: Node requires the algorithm argument to
 * be null for Ed25519 — passing a digest name fails. The app verifies the same
 * bytes with CryptoKit's `Curve25519.Signing`.
 *
 * ## Usage
 *
 *   pnpm moderation keygen --key-id remeet-moderation-2026-08
 *   pnpm moderation add --kind wish --id <uuid> --reason harassment [--report-id <uuid>]
 *   pnpm moderation add --kind reunionField --reunion <uuid> --field sharedGroupDisplayName \
 *                       --value "…" --reason harassment
 *   pnpm moderation revoke --action-id <uuid> --note "misjudged"
 *   pnpm moderation publish
 *
 * `keygen` prints the public key to paste into Remeet's `project.yml`; the
 * private half goes straight into the Keychain and is never written to disk.
 *
 * Environment:
 *   REMEET_API_BASE        default https://api.tmkch.io
 *   REMEET_MODERATION_TOKEN  the admin bearer token
 *   REMEET_MODERATION_KEY_ID which key to sign with
 *   REMEET_OPERATOR          who is issuing (recorded in D1, never published)
 */

import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Which Keychain item holds the signing key.
 *
 * Two of them, because Debug and Release carry different public keys — the
 * moderation equivalent of the Development/Production CloudKit split that
 * `docs/cloudkit-schema.md` exists to police. A manifest signed while testing
 * must not be honoured by a build in somebody's hands, and the cheapest way to
 * guarantee that is for the test key to be unable to produce one.
 *
 *   REMEET_MODERATION_ENV=dev   → remeet-moderation-dev
 *   (unset)                     → remeet-moderation
 */
const KEYCHAIN_SERVICE =
  process.env.REMEET_MODERATION_ENV === "dev" ? "remeet-moderation-dev" : "remeet-moderation";
const KEYCHAIN_ACCOUNT = "signing";
/** Which key id `keygen` last wrote, so `publish` needs no environment. */
const KEYCHAIN_KEY_ID_SERVICE =
  process.env.REMEET_MODERATION_ENV === "dev"
    ? "remeet-moderation-keyid-dev"
    : "remeet-moderation-keyid";

/**
 * Where the operator bearer token lives.
 *
 * **Not** channel-scoped, unlike the signing key: there is one Worker and one
 * `REMEET_MODERATION_ADMIN_TOKEN` on it. The channel decides which manifest row
 * a publish lands in and which key signs it; it has nothing to do with who is
 * allowed to talk to the API.
 */
const KEYCHAIN_ADMIN_SERVICE = "remeet-moderation-admin";

/** A Keychain value, or `null` if there is no such item. */
function readKeychain(service: string): string | null {
  try {
    return execFileSync(
      "security",
      ["find-generic-password", "-s", service, "-a", KEYCHAIN_ACCOUNT, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    return null;
  }
}

const API_BASE = process.env.REMEET_API_BASE ?? "https://api.tmkch.io";
/**
 * The admin bearer token, from the environment or — failing that — the
 * Keychain, so the ordinary case is `pnpm moderation add …` with nothing
 * exported. A token pasted into a shell is a token in shell history.
 */
const TOKEN = process.env.REMEET_MODERATION_TOKEN ?? readKeychain(KEYCHAIN_ADMIN_SERVICE) ?? "";
/**
 * Which key to sign with. Not a secret, but it belongs next to the key it names
 * — `keygen` writes both, so the ordinary case needs nothing exported and a
 * rotation cannot leave the two out of step.
 */
const KEY_ID = process.env.REMEET_MODERATION_KEY_ID ?? readKeychain(KEYCHAIN_KEY_ID_SERVICE) ?? "";
const OPERATOR = process.env.REMEET_OPERATOR ?? "operator";
/**
 * Which manifest a publish lands in.
 *
 * `REMEET_MODERATION_ENV=dev` also selects the dev Keychain item, so a
 * rehearsal signs with the dev key and is served at `dev-manifest.json`, which
 * only Debug builds read. Nothing about it can reach a shipped build: they do
 * not trust the key and do not fetch the path.
 */
const CHANNEL = process.env.REMEET_MODERATION_ENV === "dev" ? "dev" : "production";

function usage(): never {
  console.error(
    [
      "usage:",
      "  moderation keygen --key-id <id>",
      "  moderation add --kind wish|waitingMemory|anniversaryCard|statusNote --id <uuid> --reason <code> [--reunion <uuid>] [--report-id <id>] [--note <text>]",
      "  moderation add --kind reunionField --reunion <uuid> --field <field> --value <text> --reason <code>",
      "  moderation revoke --action-id <uuid> [--note <text>]",
      "  moderation publish",
      "  moderation sign-file --in <payload.json> --out <envelope.json>",
    ].join("\n"),
  );
  process.exit(2);
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireFlag(name: string): string {
  const value = flag(name);
  if (!value) usage();
  return value;
}

// MARK: Keychain

/**
 * Puts the private key in the login Keychain **through stdin**, not as an
 * argument.
 *
 * `security add-generic-password -w <value>` would put the key in this
 * process's argv, where anybody running `ps` on the machine can read it for as
 * long as the call takes. `security -i` reads its command line from stdin
 * instead, so the key never appears in any process listing. It is a small
 * window either way, but this is a signing key that can order deletions on
 * every Remeet install, and the fix costs one line.
 *
 * `-U` updates an existing item rather than failing, so re-running `keygen`
 * rotates the key rather than leaving two items with the same label.
 */
function writePrivateKey(base64: string): void {
  writeKeychain(KEYCHAIN_SERVICE, base64);
}

/** See `writePrivateKey` for why this goes through stdin. */
function writeKeychain(service: string, value: string): void {
  const result = spawnSync("security", ["-i"], {
    input: `add-generic-password -s ${service} -a ${KEYCHAIN_ACCOUNT} -w ${value} -U\n`,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(`Could not write to the Keychain: ${result.stderr || result.stdout}`);
    process.exit(1);
  }
}

function readPrivateKey(): crypto.KeyObject {
  let base64: string;
  try {
    base64 = execFileSync(
      "security",
      ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w"],
      { encoding: "utf8" },
    ).trim();
  } catch {
    console.error(
      `No signing key in the Keychain (service "${KEYCHAIN_SERVICE}"). Run: moderation keygen --key-id <id>`,
    );
    process.exit(1);
  }
  return crypto.createPrivateKey({
    key: Buffer.from(base64, "base64"),
    format: "der",
    type: "pkcs8",
  });
}

function keygen(): void {
  const keyID = requireFlag("key-id");
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const privateDER = privateKey.export({ format: "der", type: "pkcs8" }) as Buffer;
  writePrivateKey(privateDER.toString("base64"));
  // Recorded beside the key so `publish` signs with the one that was just
  // generated, rather than whatever an old shell export still says.
  writeKeychain(KEYCHAIN_KEY_ID_SERVICE, keyID);
  // Raw 32 bytes, which is what CryptoKit's
  // `Curve25519.Signing.PublicKey(rawRepresentation:)` takes. The DER wrapper
  // Node exports by default would not parse there.
  const raw = (publicKey.export({ format: "jwk" }) as { x: string }).x;
  const rawBytes = Buffer.from(raw, "base64url");
  console.log("Private key stored in the login Keychain. It is not on disk.");
  console.log("");
  console.log(`Keychain item: ${KEYCHAIN_SERVICE}`);
  console.log("");
  console.log("Add to Remeet's project.yml:");
  console.log(`  REMEET_MODERATION_KEYS: "${keyID}:${rawBytes.toString("base64")}"`);
  console.log("");
  console.log("And set on the Worker:");
  console.log(`  wrangler secret put REMEET_MODERATION_KEY_ID   # ${keyID}`);
}

// MARK: API

async function call(path: string, init: RequestInit = {}): Promise<unknown> {
  if (!TOKEN) {
    console.error(
      `No admin token. Set REMEET_MODERATION_TOKEN, or store it in the Keychain:\n` +
        `  security add-generic-password -s ${KEYCHAIN_ADMIN_SERVICE} -a ${KEYCHAIN_ACCOUNT} -w <token> -U`,
    );
    process.exit(1);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`${response.status} ${text}`);
    process.exit(1);
  }
  return text ? JSON.parse(text) : null;
}

async function add(): Promise<void> {
  const kind = requireFlag("kind");
  const reason = requireFlag("reason");
  const body: Record<string, unknown> = {
    targetKind: kind,
    reasonCode: reason,
    issuedBy: OPERATOR,
    reportId: flag("report-id"),
    note: flag("note"),
  };
  if (kind === "reunionField") {
    body.reunionId = requireFlag("reunion");
    body.rootField = requireFlag("field");
    body.value = requireFlag("value");
  } else {
    body.contentId = requireFlag("id");
    body.reunionId = flag("reunion");
  }
  const result = (await call("/remeet/v1/moderation/actions", {
    method: "POST",
    body: JSON.stringify(body),
  })) as { actionId: string; target: string };
  console.log(`recorded ${result.actionId}`);
  console.log(`target   ${result.target}`);
  console.log("");
  console.log("Not live yet — run `moderation publish` to sign and serve it.");
}

async function revoke(): Promise<void> {
  const actionId = requireFlag("action-id");
  await call(`/remeet/v1/moderation/actions/${actionId}/revoke`, {
    method: "POST",
    body: JSON.stringify({ revokedBy: OPERATOR, note: flag("note") }),
  });
  console.log(`revoked ${actionId}`);
  console.log("");
  console.log("Run `moderation publish` for it to take effect on devices.");
  console.log("Note: content already deleted does not come back — Remeet holds no copy.");
}

async function publish(): Promise<void> {
  if (!KEY_ID) {
    console.error("No key id. Run `moderation keygen --key-id <id>`, or set REMEET_MODERATION_KEY_ID.");
    process.exit(1);
  }
  const payload = await call(
    `/remeet/v1/moderation/actions/pending?channel=${CHANNEL}&keyID=${encodeURIComponent(KEY_ID)}`,
  );
  // Signed as bytes, and the *same* bytes are what gets stored and served.
  // Re-serialising anywhere in between would reintroduce the canonicalisation
  // problem this format exists to avoid.
  const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
  const signature = crypto.sign(null, payloadBytes, readPrivateKey());
  const envelope = JSON.stringify({
    keyID: KEY_ID,
    payload: payloadBytes.toString("base64url"),
    signature: signature.toString("base64url"),
  });
  const result = (await call("/remeet/v1/moderation/manifest", {
    method: "PUT",
    body: JSON.stringify({ envelope, channel: CHANNEL }),
  })) as { revision: number };
  const actionCount = (payload as { actions: unknown[] }).actions.length;
  console.log(`published revision ${result.revision} to ${CHANNEL} (${actionCount} action(s))`);
}

/**
 * Signs a payload read from a file and writes the envelope to another, without
 * touching the network.
 *
 * Exists so the chain that actually matters — Keychain key → Ed25519 signature
 * → CryptoKit verification in the app — can be exercised end to end before
 * anything is deployed, and re-checked after a key rotation. `publish` is the
 * same code path with the payload fetched and the envelope uploaded.
 */
function signFile(): void {
  if (!KEY_ID) {
    console.error("No key id. Run `moderation keygen --key-id <id>`, or set REMEET_MODERATION_KEY_ID.");
    process.exit(1);
  }
  const inPath = requireFlag("in");
  const outPath = requireFlag("out");
  const payloadBytes = readFileSync(inPath);
  const signature = crypto.sign(null, payloadBytes, readPrivateKey());
  const envelope = JSON.stringify({
    keyID: KEY_ID,
    payload: payloadBytes.toString("base64url"),
    signature: signature.toString("base64url"),
  });
  writeFileSync(outPath, envelope);
  console.log(`signed ${inPath} -> ${outPath} with ${KEY_ID}`);
}

const command = process.argv[2];
switch (command) {
  case "keygen":
    keygen();
    break;
  case "add":
    await add();
    break;
  case "revoke":
    await revoke();
    break;
  case "publish":
    await publish();
    break;
  case "sign-file":
    signFile();
    break;
  default:
    usage();
}
