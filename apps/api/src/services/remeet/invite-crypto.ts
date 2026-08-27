import { base64URLDecode, base64URLEncode } from "./invite-tokens";

/**
 * Two separate protections, for two separate problems — and both built so the
 * key behind them can be replaced without invalidating the invitations
 * already out in the world.
 *
 * `lookupHash` is what the database holds instead of a token: a leaked copy of
 * the table reveals no working invitation, because the HMAC key lives in a
 * Worker secret and not in D1. It is keyed rather than a plain digest for the
 * usual reason — a bare SHA-256 of a token is guessable by anybody who can
 * generate candidate tokens.
 *
 * `encryptSecret` covers the two fields that are genuinely sensitive: the
 * CKShare URL, which is the entrance to somebody's private CloudKit share, and
 * the invite code, which opens the same door. D1 encrypts at rest; this
 * encrypts again above it with a key D1 has never seen.
 */
export interface InviteKeys {
  /** Everything written from now on uses these. */
  tokenSecret: string;
  urlKey: string;
  /**
   * The keys being retired, if a rotation is in progress. Reads try the
   * current pair first and fall back to these, so a rotation costs nothing to
   * invitations that are already out: they keep resolving until they expire,
   * and by then the previous keys can be dropped.
   */
  previousTokenSecret?: string;
  previousURLKey?: string;
}

/** Which key a stored value was written with, so reads know what to try. */
const CURRENT_VERSION = "v1";

export async function lookupHash(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Both hashes a value could have been stored under during a rotation: the one
 * it would get today, and the one it would have had before. Callers look the
 * value up under each in turn.
 */
export async function lookupHashes(keys: InviteKeys, value: string): Promise<string[]> {
  const hashes = [await lookupHash(keys.tokenSecret, value)];
  if (keys.previousTokenSecret) hashes.push(await lookupHash(keys.previousTokenSecret, value));
  return hashes;
}

/** Constant time, so a comparison cannot be turned into a character oracle. */
export function hashesMatch(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * `v1.<iv>.<ciphertext>`, with the invite id as additional authenticated data
 * so a ciphertext cannot be lifted from one row into another. The version
 * prefix is what lets the format itself change later without a migration that
 * has to read every row.
 */
export async function encryptSecret(
  keyMaterial: string,
  id: string,
  plaintext: string,
): Promise<string> {
  const key = await importEncryptionKey(keyMaterial, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(id) },
    key,
    new TextEncoder().encode(plaintext),
  );
  return [CURRENT_VERSION, base64URLEncode(iv), base64URLEncode(new Uint8Array(ciphertext))].join(
    ".",
  );
}

/**
 * Reads a value written with either the current key or the one being retired.
 *
 * Throws only when neither works — which, for a value that came out of our own
 * database, means the ciphertext is damaged or the rotation dropped a key too
 * early. Both are reported to the caller as the same "this invitation is
 * unavailable" as everything else.
 */
export async function decryptSecret(keys: InviteKeys, id: string, stored: string): Promise<string> {
  const candidates = [keys.urlKey, keys.previousURLKey].filter((key): key is string => !!key);
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await decryptWith(candidate, id, stored);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("no key could read this value");
}

async function decryptWith(keyMaterial: string, id: string, stored: string): Promise<string> {
  const parts = stored.split(".");
  // Values written before the version prefix existed are `<iv>.<ciphertext>`.
  const [ivPart, ciphertextPart] = parts.length === 3 ? parts.slice(1) : parts;
  if (!ivPart || !ciphertextPart) throw new Error("malformed ciphertext");
  const key = await importEncryptionKey(keyMaterial, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64URLDecode(ivPart),
      additionalData: new TextEncoder().encode(id),
    },
    key,
    base64URLDecode(ciphertextPart),
  );
  return new TextDecoder().decode(plaintext);
}

async function importEncryptionKey(
  keyMaterial: string,
  usages: ("encrypt" | "decrypt")[],
): Promise<CryptoKey> {
  const raw = base64URLDecode(keyMaterial.replace(/\+/g, "-").replace(/\//g, "_"));
  if (raw.length !== 32) throw new Error("invite URL key must be 32 bytes");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, usages);
}
