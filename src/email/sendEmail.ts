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

export type Mailer = {
  send(message: EmailMessage): Promise<{ providerMessageId: string }>;
};

// An invalid message is a programming error, never shown to a student, so it throws.
// The id is what the outbox stores to match bounce webhooks (E9).
export async function sendEmail(
  mailer: Mailer,
  message: EmailMessage,
): Promise<{ providerMessageId: string }> {
  return mailer.send(emailMessageSchema.parse(message));
}
