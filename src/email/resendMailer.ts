import { z } from "zod";
import type { Mailer } from "./sendEmail";

// The only module that knows Resend's API (#209). It uses fetch directly: sending is one
// REST call, so there is no SDK to pin.
const SEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

const successSchema = z.object({ id: z.string().min(1) });
// Resend's error bodies carry a name and a message; read them loosely, they only feed a log line.
const errorBodySchema = z.object({ name: z.string().optional(), message: z.string().optional() });

// `status` is null when no reply came (network failure or timeout). The message never holds
// the API key or the recipient: the drain stores it in email_outbox.last_error.
export class ResendError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = "ResendError";
    this.status = status;
  }
}

export function createResendMailer({
  apiKey,
  from,
  fetch = globalThis.fetch,
}: {
  apiKey: string;
  from: string;
  fetch?: typeof globalThis.fetch;
}): Mailer {
  return {
    async send(message) {
      let response: Response;
      try {
        response = await fetch(SEND_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
            ...(message.html ? { html: message.html } : {}),
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new ResendError(`Resend request failed: ${reason}`, null);
      }

      const body: unknown = await response.json().catch(() => undefined);
      if (!response.ok) {
        const detail = errorBodySchema.safeParse(body);
        const name = detail.success ? detail.data.name : undefined;
        const text = detail.success ? detail.data.message : undefined;
        throw new ResendError(
          `Resend ${response.status}${name ? ` ${name}` : ""}${text ? `: ${text}` : ""}`,
          response.status,
        );
      }

      // A success without an id must never count as sent: the id is how a bounce finds its row.
      const parsed = successSchema.safeParse(body);
      if (!parsed.success) {
        throw new ResendError(`Resend ${response.status} reply had no message id`, response.status);
      }
      return { providerMessageId: parsed.data.id };
    },
  };
}
