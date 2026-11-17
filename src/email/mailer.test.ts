import { describe, expect, it } from "vitest";
import { createFakeResendFetch } from "./fakeResendFetch";
import { mailerFromEnv } from "./mailer";
import { sendEmail } from "./sendEmail";

describe("mailerFromEnv (#209)", () => {
  it("returns the Resend mailer when the key and sender are set", async () => {
    const fake = createFakeResendFetch();
    const mailer = mailerFromEnv(
      { RESEND_API_KEY: "re_test_key", EMAIL_FROM: "updates@example.com" },
      fake.fetch,
    );
    await sendEmail(mailer, { to: "student@example.com", subject: "Hi", text: "Body" });
    expect(fake.requests[0]?.url).toBe("https://api.resend.com/emails");
    expect(fake.requests[0]?.body).toMatchObject({ from: "updates@example.com" });
  });

  it("throws when email is not configured", () => {
    expect(() => mailerFromEnv({ RESEND_API_KEY: undefined, EMAIL_FROM: undefined })).toThrow(
      "Email is not configured: set RESEND_API_KEY and EMAIL_FROM",
    );
  });
});
