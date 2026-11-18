import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Resend's webhooks are signed with Svix's scheme. It is one HMAC, so it is checked here
// with node:crypto instead of adding the svix package (#209).
const SECRET_PREFIX = "whsec_";
const TOLERANCE_SECONDS = 5 * 60;
const MAX_DETAIL_LENGTH = 500;

function hmac(secret: string, id: string, timestamp: string, rawBody: string): Buffer {
  const key = Buffer.from(secret.slice(SECRET_PREFIX.length), "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
}

// For tests, to build a fresh signed payload.
export function signResendWebhook(secret: string, id: string, timestamp: string, rawBody: string): string {
  return `v1,${hmac(secret, id, timestamp, rawBody).toString("base64")}`;
}

export type SignatureResult =
  { ok: true } | { ok: false; reason: "missing_headers" | "stale" | "bad_signature" };

// Never throws: a malformed header is just a signature that does not match.
export function verifyResendSignature({
  secret,
  id,
  timestamp,
  signature,
  rawBody,
  now,
}: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  now: Date;
}): SignatureResult {
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing_headers" };

  const seconds = /^\d+$/.test(timestamp) ? Number(timestamp) : Number.NaN;
  if (!Number.isFinite(seconds) || Math.abs(now.getTime() / 1000 - seconds) > TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale" };
  }

  const expected = hmac(secret, id, timestamp, rawBody);
  // The header is a space-separated list, so a rotated secret can sign with two keys at once.
  const matches = signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) return false;
    const candidate = Buffer.from(value, "base64");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
  return matches ? { ok: true } : { ok: false, reason: "bad_signature" };
}

// What the handler needs from the database. The Prisma version is src/db/emailEventStore.ts;
// src/email never imports @/db.
export type EmailEventStore = {
  recordBounce(input: {
    providerMessageId: string;
    detail: string | undefined;
    now: Date;
  }): Promise<{ matched: boolean }>;
  recordComplaint(input: { providerMessageId: string; now: Date }): Promise<{ matched: boolean }>;
};

const bouncedSchema = z.object({
  type: z.literal("email.bounced"),
  data: z.looseObject({
    email_id: z.string().min(1),
    bounce: z.looseObject({ message: z.string().optional() }).optional(),
  }),
});
const complainedSchema = z.object({
  type: z.literal("email.complained"),
  data: z.looseObject({ email_id: z.string().min(1) }),
});
const typeSchema = z.object({ type: z.string() });

export type WebhookResult = { status: number; body: { ok: boolean; ignored?: true } };

export async function handleResendWebhook({
  rawBody,
  headers,
  secret,
  now,
  store,
}: {
  rawBody: string;
  headers: { id: string | null; timestamp: string | null; signature: string | null };
  secret: string | undefined;
  now: Date;
  store: EmailEventStore;
}): Promise<WebhookResult> {
  // Misconfigured, not a bad request: 503 makes Resend retry once the secret is set.
  if (!secret) return { status: 503, body: { ok: false } };

  const signature = verifyResendSignature({ secret, ...headers, rawBody, now });
  if (!signature.ok) return { status: 401, body: { ok: false } };

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { ok: false } };
  }
  const type = typeSchema.safeParse(json);
  if (!type.success) return { status: 400, body: { ok: false } };

  if (type.data.type === "email.bounced") {
    const event = bouncedSchema.safeParse(json);
    if (!event.success) return { status: 400, body: { ok: false } };
    await store.recordBounce({
      providerMessageId: event.data.data.email_id,
      detail: event.data.data.bounce?.message?.slice(0, MAX_DETAIL_LENGTH),
      now,
    });
    return { status: 200, body: { ok: true } };
  }
  if (type.data.type === "email.complained") {
    const event = complainedSchema.safeParse(json);
    if (!event.success) return { status: 400, body: { ok: false } };
    await store.recordComplaint({ providerMessageId: event.data.data.email_id, now });
    return { status: 200, body: { ok: true } };
  }
  return { status: 200, body: { ok: true, ignored: true } };
}
