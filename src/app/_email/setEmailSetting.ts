import type { Session } from "@/auth/contract";
import { emailSettingInputSchema, type SettableEmailType } from "@/core/emailSettings";

// Turning one email type on or off (#211): the rule, with the storage behind an interface,
// as in src/app/_follow/setFollow.ts. It sets the state ("on: yes or no") and never
// toggles, so a retry or a double tap does no harm. It writes only the signed-in student's
// own rows: the user comes from the session, and a user id in the request is ignored.

export type SettingUser = { id: string; email: string; displayName: string };

export type EmailSettingsStore = {
  set(user: SettingUser, type: SettableEmailType, on: boolean): Promise<void>;
};

export type SetEmailSettingResult =
  { ok: true; type: SettableEmailType; on: boolean } | { ok: false; error: { code: "invalid" } };

export async function setEmailSetting(
  store: EmailSettingsStore,
  session: Session,
  raw: unknown,
): Promise<SetEmailSettingResult> {
  const parsed = emailSettingInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "invalid" } };

  const { type, on } = parsed.data;
  await store.set(
    { id: session.user.id, email: session.user.email, displayName: session.user.name },
    type,
    on,
  );
  return { ok: true, type, on };
}
