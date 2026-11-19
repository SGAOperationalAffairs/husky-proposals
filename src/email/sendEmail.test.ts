import { describe, expect, it } from "vitest";
import { createCapturingMailer } from "./capturingMailer";
import { sendEmail, throttledFor } from "./sendEmail";

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

describe("throttledFor (#210)", () => {
  it("gives null for an error that is not a throttle", () => {
    expect(throttledFor(new Error("provider down"))).toBeNull();
  });

  it("gives the wait of an error that carries one", () => {
    expect(throttledFor(Object.assign(new Error("slow down"), { retryAfterMs: 60_000 }))).toBe(60_000);
  });

  it("gives null for something that is not an error", () => {
    expect(throttledFor({ retryAfterMs: 60_000 })).toBeNull();
    expect(throttledFor("nope")).toBeNull();
    expect(throttledFor(undefined)).toBeNull();
  });

  it("gives null for a wait that is zero, negative, or not a number", () => {
    for (const retryAfterMs of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, "60"]) {
      expect(throttledFor(Object.assign(new Error("x"), { retryAfterMs })), String(retryAfterMs)).toBeNull();
    }
  });
});
