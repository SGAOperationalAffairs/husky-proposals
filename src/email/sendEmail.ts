import { z } from "zod";

// The provider-neutral email contract (#43). Resend is one Mailer, chosen from
// the environment with E9; tests use the capturing mailer. No provider code here.
export const emailMessageSchema = z.object({
  to: z.email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().min(1).optional(),
});

export type EmailMessage = z.infer<typeof emailMessageSchema>;

// A rate-limited Mailer rejects with an Error carrying `retryAfterMs`, which tells the drain
// to try later without counting the attempt (throttledFor, #210). Any other rejection is a
// failed attempt.
export type Mailer = {
  send(message: EmailMessage): Promise<{ providerMessageId: string }>;
};

// The provider-neutral throttle signal: how long to wait, or null when the error is not one.
export function throttledFor(error: unknown): number | null {
  if (!(error instanceof Error)) return null;
  const { retryAfterMs } = error as Error & { retryAfterMs?: unknown };
  return typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs) && retryAfterMs > 0
    ? retryAfterMs
    : null;
}

// An invalid message is a programming error, never shown to a student, so it throws.
// The id is what the outbox stores to match bounce webhooks (E9).
export async function sendEmail(
  mailer: Mailer,
  message: EmailMessage,
): Promise<{ providerMessageId: string }> {
  return mailer.send(emailMessageSchema.parse(message));
}
