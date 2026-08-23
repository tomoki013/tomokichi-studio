/**
 * The digest a moderation manifest carries, and the string folding it rests on.
 *
 * **This file has a twin.** `Remeet/Services/Moderation/ModerationTarget.swift`
 * computes the same values, and if the two ever disagree by a single byte the
 * result is not an error anywhere — it is a manifest that silently matches
 * nothing, forever. `moderation-vectors.json` is shared by both test suites for
 * exactly that reason; change either implementation and both must still agree
 * on every vector.
 *
 * Why digests rather than ids: the manifest is a public file. Publishing
 * content ids would make it a catalogue of who has been moderated, readable by
 * anybody who fetches it. A digest can only be matched by somebody who already
 * holds the content — which is the two people in the reunion, and nobody else.
 * The inputs are 122-bit UUIDs, so the digests cannot be enumerated back.
 *
 * There is no secret salt, and there could not be: the client has to compute
 * the same value, so any salt would ship inside the app. `NAMESPACE` does the
 * one job a public salt can — keeping these digests distinct from any other use
 * of SHA-256 over a UUID.
 */

export const NAMESPACE = "remeet.moderation.v1";

/** ASCII UNIT SEPARATOR: cannot occur in a UUID, an enum value or a hex digest,
 *  so no two different inputs can join to the same bytes. */
const SEP = "\u001F";

export type ModerationTargetKind =
  | "wish"
  | "waitingMemory"
  | "anniversaryCard"
  | "statusNote"
  | "reunionField";

export type ModerationRootField =
  | "ownerDisplayName"
  | "partnerDisplayName"
  | "sharedGroupDisplayName"
  | "initialMemo";

export const CHILD_KINDS: ModerationTargetKind[] = [
  "wish",
  "waitingMemory",
  "anniversaryCard",
  "statusNote",
];

export const ROOT_FIELDS: ModerationRootField[] = [
  "ownerDisplayName",
  "partnerDisplayName",
  "sharedGroupDisplayName",
  "initialMemo",
];

/**
 * Characters folded to a single space.
 *
 * Written out rather than using `\s`. JavaScript's `\s` and Foundation's
 * `CharacterSet.whitespacesAndNewlines` are not the same set — they disagree
 * about U+0085 and U+FEFF — and "nearly the same" is a digest that never
 * matches.
 */
const WHITESPACE = new Set([
  0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x0020, 0x0085, 0x00a0, 0x1680, 0x2000, 0x2001, 0x2002,
  0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f,
  0x3000,
]);

/**
 * Invisible characters removed outright — the cheap way to break a word up so a
 * search misses it while a reader sees nothing.
 *
 * **U+200D (zero-width joiner) is deliberately absent.** It is what holds emoji
 * families together, and removing it would fold 👨‍👩‍👧 into 👨👩👧 — a real
 * change of meaning for something people type into a reunion name. The evasion
 * it permits is not worth that.
 */
const INVISIBLE = new Set([
  0x00ad, 0x180e, 0x200b, 0x200c, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0xfeff,
]);

function isVariationSelector(code: number): boolean {
  return (code >= 0xfe00 && code <= 0xfe0f) || (code >= 0xe0100 && code <= 0xe01ef);
}

/**
 * The one way Remeet folds a string before comparing it to anything.
 *
 * Order matters: NFKC first (so full-width Latin and half-width kana land in one
 * place and combining marks compose), then invisibles and variation selectors
 * out, then lower-cased without a locale, then whitespace collapsed and
 * trimmed.
 */
export function normalize(value: string): string {
  const folded = value.normalize("NFKC");
  let out = "";
  for (const character of folded) {
    const code = character.codePointAt(0) ?? 0;
    if (INVISIBLE.has(code) || isVariationSelector(code)) continue;
    out += WHITESPACE.has(code) ? " " : character;
  }
  return out
    .toLowerCase()
    .split(" ")
    .filter((part) => part.length > 0)
    .join(" ");
}

/** RFC 4122, lower-case. The Swift side upper-cases by default, which is
 *  exactly the sort of difference that produces a silently dead manifest. */
export function canonicalUUID(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(trimmed)) {
    throw new Error(`not a UUID: ${value}`);
  }
  return trimmed;
}

function base64url(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
}

/** The digest for a piece of content living under a reunion. */
export async function childDigest(kind: ModerationTargetKind, id: string): Promise<string> {
  if (kind === "reunionField") throw new Error("use rootFieldDigest for reunionField");
  return base64url(await sha256([NAMESPACE, kind, canonicalUUID(id)].join(SEP)));
}

/**
 * The digest for one string on a reunion, including the string itself.
 *
 * Binding the value in is what keeps a sanitize from becoming a permanent gag:
 * the action names "this field, while it reads this", so a corrected value stops
 * matching and comes back, and the offending value typed again matches once
 * more. Keying on `(reunion, field)` alone blanked the field for the life of the
 * reunion, including every innocent value tried afterwards.
 *
 * The value is hashed to a fixed-length hex string before being joined, so the
 * concatenation cannot be made ambiguous by a value of an awkward length.
 */
export async function rootFieldDigest(
  reunionID: string,
  field: ModerationRootField,
  value: string,
): Promise<string> {
  const valueDigest = hex(await sha256(normalize(value)));
  return base64url(
    await sha256([NAMESPACE, "reunionField", canonicalUUID(reunionID), field, valueDigest].join(SEP)),
  );
}
