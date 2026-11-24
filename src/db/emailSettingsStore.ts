import type { EmailSettingsStore } from "@/app/_email/setEmailSetting";
import type { UnsubscribeStore } from "@/app/_email/unsubscribe";
import { SETTABLE_EMAIL_TYPES, type SettableEmailType } from "@/core/emailSettings";
import type { Prisma } from "@/generated/prisma/client";

// The Prisma store for the notification settings (#211): one row per type a student turned
// off in email_opt_outs, and no row means on.
type Db = Pick<Prisma.TransactionClient, "user" | "emailOptOut">;

export type EmailSettings = { settings: Record<SettableEmailType, boolean>; stopped: boolean };

export function prismaEmailSettingsStore(db: Db): EmailSettingsStore &
  UnsubscribeStore & {
    read(userId: string): Promise<EmailSettings>;
  } {
  return {
    // The signed unsubscribe link (#212) names a user id and no session. A student with no
    // user row has nothing to stop, and creating a row from a link would write someone's
    // id on the strength of a signature alone, so this only ever turns off, for a known id.
    turnOff: async (userId, type) => {
      const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) return;
      await db.emailOptOut.createMany({ data: [{ userId: user.id, type }], skipDuplicates: true });
    },

    // One query. A student with no user row yet has changed nothing: every type is on.
    read: async (userId) => {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { emailStoppedAt: true, emailOptOuts: { select: { type: true } } },
      });
      const off = new Set(user?.emailOptOuts.map((optOut) => optOut.type));
      return {
        settings: Object.fromEntries(SETTABLE_EMAIL_TYPES.map((type) => [type, !off.has(type)])) as Record<
          SettableEmailType,
          boolean
        >,
        stopped: user?.emailStoppedAt != null,
      };
    },

    set: async (user, type, on) => {
      // Copied from the session so the row has a user to point at, as followStore does.
      await db.user.upsert({
        where: { id: user.id },
        create: { id: user.id, email: user.email, displayName: user.displayName },
        update: { email: user.email, displayName: user.displayName },
      });
      if (on) {
        // deleteMany, so turning on a type that was never off is fine.
        await db.emailOptOut.deleteMany({ where: { userId: user.id, type } });
      } else {
        // skipDuplicates: turning off twice writes one row, never an error.
        await db.emailOptOut.createMany({ data: [{ userId: user.id, type }], skipDuplicates: true });
      }
    },
  };
}
