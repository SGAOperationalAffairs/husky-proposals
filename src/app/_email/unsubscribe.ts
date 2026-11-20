import { z } from "zod";
import type { SettableEmailType } from "@/core/emailSettings";
import { verifyUnsubscribeToken } from "@/email/unsubscribeToken";

// Stopping one email type from the link in an email (#212): the rule, with the storage
// behind an interface, as in setEmailSetting.ts. There is no session. The signature on the
// token is the authorization, and it names one student and one type, so the link can only
// ever turn that type off for that student. Turning it off twice is fine.

export type UnsubscribeStore = {
  turnOff(userId: string, type: SettableEmailType): Promise<void>;
};

export type UnsubscribeResult =
  { ok: true; type: SettableEmailType } | { ok: false; error: { code: "invalid" } };

const inputSchema = z.object({ token: z.string().min(1).max(200) });

const invalid: UnsubscribeResult = { ok: false, error: { code: "invalid" } };

// `secret` is undefined when the site has no link secret: nothing can verify, so every
// link is invalid rather than trusted.
export async function unsubscribe(
  store: UnsubscribeStore,
  secret: string | undefined,
  raw: unknown,
): Promise<UnsubscribeResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success || !secret) return invalid;
  const verified = verifyUnsubscribeToken(secret, parsed.data.token);
  if (!verified) return invalid;

  await store.turnOff(verified.userId, verified.type);
  return { ok: true, type: verified.type };
}
