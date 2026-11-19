import { describe, expect, it } from "vitest";
import { createFakeResendFetch } from "./fakeResendFetch";
import { createResendMailer, ResendError } from "./resendMailer";
import { sendEmail, throttledFor } from "./sendEmail";

describe("Resend mailer (#209)", () => {
  const message = { to: "student@example.com", subject: "Hello", text: "Plain body" };

  function setup() {
    const fake = createFakeResendFetch();
    const mailer = createResendMailer({
      apiKey: "re_secret_key",
      from: "Husky Proposals <updates@example.com>",
      fetch: fake.fetch,
    });
    return { fake, mailer };
  }

  it("posts the message to Resend with the key and returns the provider id", async () => {
    const { fake, mailer } = setup();
    expect(await sendEmail(mailer, message)).toEqual({ providerMessageId: "fake-resend-1" });
    expect(fake.requests).toHaveLength(1);
    const request = fake.requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("https://api.resend.com/emails");
    expect(request.headers.authorization).toBe("Bearer re_secret_key");
    expect(request.headers["content-type"]).toBe("application/json");
    expect(request.body).toEqual({
      from: "Husky Proposals <updates@example.com>",
      to: ["student@example.com"],
      subject: "Hello",
      text: "Plain body",
    });
  });

  it("sends html only when the message has it", async () => {
    const { fake, mailer } = setup();
    await sendEmail(mailer, { ...message, html: "<p>Hi</p>" });
    expect(fake.requests[0]?.body).toMatchObject({ html: "<p>Hi</p>" });
  });

  it.each([
    [
      422,
      { name: "validation_error", message: "Invalid `to` field." },
      /^Resend 422 validation_error: Invalid `to` field\.$/,
    ],
    [
      429,
      { name: "rate_limit_exceeded", message: "Too many requests." },
      /^Resend 429 rate_limit_exceeded: /,
    ],
  ])("turns a %i reply into a ResendError carrying the status", async (status, body, pattern) => {
    const { fake, mailer } = setup();
    fake.respondNext({ status, body });
    const error = await sendEmail(mailer, message).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ResendError);
    expect((error as ResendError).status).toBe(status);
    expect((error as ResendError).message).toMatch(pattern);
  });

  it.each([
    ["the retry-after header, in seconds", { name: "rate_limit_exceeded" }, { "retry-after": "2" }, 2000],
    ["a quota error, an hour", { name: "daily_quota_exceeded" }, { "retry-after": "2" }, 3_600_000],
    ["a monthly quota error, an hour", { name: "monthly_quota_exceeded" }, undefined, 3_600_000],
    ["a minute with no header", { name: "rate_limit_exceeded" }, undefined, 60_000],
    ["a minute for a header that is not a number", { name: "x" }, { "retry-after": "soon" }, 60_000],
    ["at least a second", { name: "x" }, { "retry-after": "0" }, 1000],
    ["at most fifteen minutes", { name: "x" }, { "retry-after": "86400" }, 900_000],
  ])("carries retryAfterMs on a 429: %s", async (_label, body, headers, expected) => {
    const { fake, mailer } = setup();
    fake.respondNext({ status: 429, body, headers });
    const error = (await sendEmail(mailer, message).catch((caught: unknown) => caught)) as ResendError;
    expect(error.retryAfterMs).toBe(expected);
    expect(throttledFor(error)).toBe(expected);
  });

  it("carries no retryAfterMs on any other failure", async () => {
    const { fake, mailer } = setup();
    fake.respondNext({ status: 422, body: { name: "validation_error" }, headers: { "retry-after": "5" } });
    const error = (await sendEmail(mailer, message).catch((caught: unknown) => caught)) as ResendError;
    expect(error.retryAfterMs).toBeNull();
    fake.failNext(new TypeError("fetch failed"));
    const network = (await sendEmail(mailer, message).catch((caught: unknown) => caught)) as ResendError;
    expect(network.retryAfterMs).toBeNull();
  });

  it("copes with an error body that is not Resend's shape", async () => {
    const { fake, mailer } = setup();
    fake.respondNext({ status: 502, body: "<html>bad gateway</html>" });
    await expect(sendEmail(mailer, message)).rejects.toThrow(/^Resend 502/);
  });

  it("never puts the key or the recipient in an error message", async () => {
    const { fake, mailer } = setup();
    fake.respondNext({ status: 403, body: { name: "restricted_api_key", message: "Key is restricted." } });
    const error = (await sendEmail(mailer, message).catch((caught: unknown) => caught)) as ResendError;
    expect(error.message).not.toContain("re_secret_key");
    expect(error.message).not.toContain("student@example.com");
  });

  it("turns a network failure into a ResendError with no status", async () => {
    const { fake, mailer } = setup();
    fake.failNext(new TypeError("fetch failed"));
    const error = (await sendEmail(mailer, message).catch((caught: unknown) => caught)) as ResendError;
    expect(error).toBeInstanceOf(ResendError);
    expect(error.status).toBeNull();
    expect(error.message).toBe("Resend request failed: fetch failed");
  });

  it("throws on a success reply with no id, never reporting it as sent", async () => {
    const { fake, mailer } = setup();
    fake.respondNext({ status: 200, body: {} });
    await expect(sendEmail(mailer, message)).rejects.toThrow(/Resend 200/);
    fake.respondNext({ status: 200, body: { id: "" } });
    await expect(sendEmail(mailer, message)).rejects.toThrow(/Resend 200/);
  });
});
