import type { Env } from "@/env";
import { createResendMailer } from "./resendMailer";
import type { Mailer } from "./sendEmail";

// The one place that picks the mailer (#209). Routes and scripts call this; only
// resendMailer.ts knows the provider.
export function mailerFromEnv(
  env: Pick<Env, "RESEND_API_KEY" | "EMAIL_FROM">,
  fetch?: typeof globalThis.fetch,
): Mailer {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    // No issue number in the text: the style guard reads "(#209" in a string as a hex color.
    throw new Error("Email is not configured: set RESEND_API_KEY and EMAIL_FROM");
  }
  return createResendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, fetch });
}
