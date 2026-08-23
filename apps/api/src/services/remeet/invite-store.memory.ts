import type { InviteRecord, InviteStore } from "./invite-store";

/**
 * The store the tests drive. Kept beside the D1 one rather than inside a test
 * file because both implementations answer the same four questions, and it is
 * worth being able to read them next to each other.
 */
export class InMemoryInviteStore implements InviteStore {
  readonly records = new Map<string, InviteRecord>();
  readonly outcomes = new Map<string, number>();

  async countOutcome(day: string, outcome: string): Promise<void> {
    const key = `${day}/${outcome}`;
    this.outcomes.set(key, (this.outcomes.get(key) ?? 0) + 1);
  }

  async insert(record: InviteRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  async findByURLTokenHash(hash: string): Promise<InviteRecord | null> {
    for (const record of this.records.values()) {
      if (record.urlTokenHash === hash) return { ...record };
    }
    return null;
  }

  async findByInviteCodeHash(hash: string): Promise<InviteRecord | null> {
    for (const record of this.records.values()) {
      if (record.inviteCodeHash === hash) return { ...record };
    }
    return null;
  }

  async markConsumed(id: string, consumedAt: string, attemptID: string | null): Promise<void> {
    const record = this.records.get(id);
    if (record) this.records.set(id, { ...record, consumedAt, consumedByAttempt: attemptID });
  }

  async revoke(id: string, revokedAt: string): Promise<void> {
    const record = this.records.get(id);
    if (record) this.records.set(id, { ...record, status: "revoked", revokedAt });
  }

  async deleteExpiredBefore(cutoff: string): Promise<void> {
    for (const [id, record] of this.records) {
      if (record.expiresAt < cutoff) this.records.delete(id);
    }
  }

  async revokeActiveForShare(shareURLHash: string, revokedAt: string): Promise<void> {
    for (const [id, record] of this.records) {
      if (record.shareURLHash === shareURLHash && record.status === "active") {
        this.records.set(id, { ...record, status: "revoked", revokedAt });
      }
    }
  }
}
