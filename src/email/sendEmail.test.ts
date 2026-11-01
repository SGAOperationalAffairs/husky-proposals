import { describe, expect, it } from "vitest";
import { createCapturingMailer } from "./capturingMailer";
import { sendEmail } from "./sendEmail";

const message = {
  to: "student@example.com",
  subject: "Your idea was approved",
  text: "Your idea is now public.",
};

describe("sendEmail (#43)", () => {
  it("delegates a valid message to the mailer and returns the provider id", async () => {
    const mailer = createCapturingMailer();
    await expect(sendEmail(mailer, message)).resolves.toEqual({ providerMessageId: "captured-1" });
    await sendEmail(mailer, { ...message, html: "<p>Your idea is now public.</p>" });
    expect(mailer.sent).toHaveLength(2);
    expect(mailer.last()?.html).toBe("<p>Your idea is now public.</p>");
  });

  it("throws on an invalid message and sends nothing", async () => {
    const mailer = createCapturingMailer();
    await expect(sendEmail(mailer, { ...message, to: "not-an-email" })).rejects.toThrow();
    await expect(sendEmail(mailer, { ...message, subject: "" })).rejects.toThrow();
    await expect(sendEmail(mailer, { ...message, text: "" })).rejects.toThrow();
    expect(mailer.sent).toHaveLength(0);
  });

  it("fails the next send only, and records nothing for it", async () => {
    const mailer = createCapturingMailer();
    mailer.failNext(new Error("provider down"));
    await expect(sendEmail(mailer, message)).rejects.toThrow("provider down");
    expect(mailer.sent).toHaveLength(0);
    await expect(sendEmail(mailer, message)).resolves.toEqual({ providerMessageId: "captured-1" });
  });

  it("clears what was captured", async () => {
    const mailer = createCapturingMailer();
    await sendEmail(mailer, message);
    mailer.clear();
    expect(mailer.sent).toHaveLength(0);
    expect(mailer.last()).toBeUndefined();
  });
});
