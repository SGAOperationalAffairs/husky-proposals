import { createHmac, timingSafeEqual } from "node:crypto";
import { SETTABLE_EMAIL_TYPES, type SettableEmailType } from "@/core/emailSettings";

// The signed token in an email's unsubscribe link (#212). The link works with no sign-in, so
// the signature is the authorization: it names one student and one email type, and it can
// only ever turn that type off. Server only (node:crypto).
//
// No expiry: an unsubscribe link must keep working. Rotating the secret breaks every link
// already sent; those students can still use /me/notifications.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sign = (secret: string, type: SettableEmailType, userId: string): Buffer =>
  createHmac("sha256", secret).update(`unsubscribe:${type}:${userId}`).digest();

export function signUnsubscribeToken(secret: string, type: SettableEmailType, userId: string): string {
  return `${type}.${userId}.${sign(secret, type, userId).toString("base64url")}`;
}

const isSettableType = (value: string): value is SettableEmailType =>
  (SETTABLE_EMAIL_TYPES as readonly string[]).includes(value);

// Never throws: anything that is not a token this secret signed is null.
export function verifyUnsubscribeToken(
  secret: string,
  token: string,
): { userId: string; type: SettableEmailType } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [type, userId, signature] = parts as [string, string, string];
  if (!isSettableType(type) || !UUID.test(userId)) return null;

  const given = Buffer.from(signature, "base64url");
  const expected = sign(secret, type, userId);
  // timingSafeEqual throws on different lengths, so the length is checked first.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { userId, type };
}

export const unsubscribeUrl = (siteUrl: string, token: string): string =>
  `${siteUrl}/unsubscribe?t=${encodeURIComponent(token)}`;
