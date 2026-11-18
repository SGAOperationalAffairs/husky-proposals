import { parseEnv } from "../src/env";
import { mailerFromEnv } from "../src/email/mailer";
import { sendEmail } from "../src/email/sendEmail";

// The manual check for the Resend mailer (#209). Sends one plain message through
// mailerFromEnv, so it exercises the same path the app will use:
//   npx tsx --env-file=.env.local scripts/send-test-email.ts <to>
async function main(): Promise<void> {
  const env = parseEnv(process.env);
  if (env.APP_ENV === "production") throw new Error("Refusing to send a test email from production (#209).");
  const to = process.argv[2];
  if (!to) throw new Error("Usage: send-test-email.ts <to>");

  const { providerMessageId } = await sendEmail(mailerFromEnv(env), {
    to,
    subject: "Test email from Husky Proposals (#209)",
    text: "Test email from Husky Proposals (#209). If you can read this, sending works.",
  });
  console.log(`Sent. Provider id: ${providerMessageId}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
