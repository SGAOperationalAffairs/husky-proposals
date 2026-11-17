import type { EmailEventStore } from "@/email/resendWebhook";
import type { Prisma } from "@/generated/prisma/client";

// The Prisma side of the Resend webhook (#209). It acts only on a provider id we stored,
// never on an email address, so an event for mail this app never sent stops nobody.
type Db = Pick<Prisma.TransactionClient, "user" | "emailOutbox" | "emailPreference">;
type InTransaction = <T>(work: (tx: Db) => Promise<T>) => Promise<T>;

const MAX_ERROR_LENGTH = 500;

// `inTransaction` runs the writes together. The app passes `(work) => db().$transaction(work)`;
// a test already inside a rolled-back transaction leaves the default, which runs them in place.
export function emailEventStore(db: Db, inTransaction: InTransaction = (work) => work(db)): EmailEventStore {
  const find = (providerMessageId: string) =>
    db.emailOutbox.findFirst({ where: { providerMessageId }, select: { id: true, userId: true } });

  return {
    async recordBounce({ providerMessageId, detail, now }) {
      const row = await find(providerMessageId);
      if (!row) return { matched: false };
      await inTransaction(async (tx) => {
        // Each update is guarded on "not yet set", so a replayed event changes nothing.
        await tx.emailOutbox.updateMany({
          where: { id: row.id, bouncedAt: null },
          data: { bouncedAt: now, lastError: `bounced: ${detail ?? "no detail"}`.slice(0, MAX_ERROR_LENGTH) },
        });
        await tx.user.updateMany({
          where: { id: row.userId, emailStoppedAt: null },
          data: { emailStoppedAt: now },
        });
        // No row is created here: the preference row and its weekday belong to the digest ticket (#212).
        await tx.emailPreference.updateMany({
          where: { userId: row.userId, bouncedAt: null },
          data: { bouncedAt: now },
        });
      });
      return { matched: true };
    },

    async recordComplaint({ providerMessageId, now }) {
      const row = await find(providerMessageId);
      if (!row) return { matched: false };
      await inTransaction(async (tx) => {
        await tx.user.updateMany({
          where: { id: row.userId, emailStoppedAt: null },
          data: { emailStoppedAt: now },
        });
        await tx.emailPreference.updateMany({
          where: { userId: row.userId, unsubscribedAt: null },
          data: { unsubscribedAt: now },
        });
      });
      return { matched: true };
    },
  };
}
