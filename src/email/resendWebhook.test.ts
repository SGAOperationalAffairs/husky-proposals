import { describe, expect, it } from "vitest";
import {
  handleResendWebhook,
  signResendWebhook,
  verifyResendSignature,
  type EmailEventStore,
} from "./resendWebhook";

// Svix's published manual-verification example. If this stops verifying, the algorithm is
// wrong, not the vector (#209).
const SVIX = {
  secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
  id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
  timestamp: "1614265330",
  rawBody: '{"test": 2432232314}',
  signature: "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
};
const SVIX_NOW = new Date(1614265330 * 1000);

describe("Resend webhook signature (#209)", () => {
  const verify = (overrides: Partial<Parameters<typeof verifyResendSignature>[0]> = {}) =>
    verifyResendSignature({
      secret: SVIX.secret,
      id: SVIX.id,
      timestamp: SVIX.timestamp,
      signature: SVIX.signature,
      rawBody: SVIX.rawBody,
      now: SVIX_NOW,
      ...overrides,
    });

  it("verifies Svix's published example", () => {
    expect(verify()).toEqual({ ok: true });
  });

  it("signResendWebhook reproduces the published signature", () => {
    expect(signResendWebhook(SVIX.secret, SVIX.id, SVIX.timestamp, SVIX.rawBody)).toBe(SVIX.signature);
  });

  it("rejects a tampered body and a wrong secret", () => {
    expect(verify({ rawBody: '{"test": 2432232315}' })).toEqual({ ok: false, reason: "bad_signature" });
    expect(verify({ secret: "whsec_" + Buffer.from("another secret").toString("base64") })).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects missing headers", () => {
    for (const field of ["id", "timestamp", "signature"] as const) {
      expect(verify({ [field]: null }), field).toEqual({ ok: false, reason: "missing_headers" });
    }
  });

  it("rejects a timestamp more than 5 minutes either side of now", () => {
    const at = (offsetSeconds: number) => new Date((1614265330 + offsetSeconds) * 1000);
    expect(verify({ now: at(299) })).toEqual({ ok: true });
    expect(verify({ now: at(301) })).toEqual({ ok: false, reason: "stale" });
    expect(verify({ now: at(-299) })).toEqual({ ok: true });
    expect(verify({ now: at(-301) })).toEqual({ ok: false, reason: "stale" });
    expect(verify({ timestamp: "soon" })).toEqual({ ok: false, reason: "stale" });
  });

  it("passes when one entry in the list is good, and fails on a v2 entry alone", () => {
    expect(verify({ signature: `v1,${Buffer.from("wrong").toString("base64")} ${SVIX.signature}` })).toEqual({
      ok: true,
    });
    expect(verify({ signature: SVIX.signature.replace("v1,", "v2,") })).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("never throws on a malformed secret or signature", () => {
    expect(verify({ signature: "v1,!!!not base64!!!" })).toEqual({ ok: false, reason: "bad_signature" });
    expect(verify({ signature: "garbage" })).toEqual({ ok: false, reason: "bad_signature" });
  });
});

type Call = { kind: "bounce" | "complaint"; providerMessageId: string; detail?: string | undefined };

function memoryStore(matched = true) {
  const calls: Call[] = [];
  const store: EmailEventStore = {
    async recordBounce({ providerMessageId, detail }) {
      calls.push({ kind: "bounce", providerMessageId, detail });
      return { matched };
    },
    async recordComplaint({ providerMessageId }) {
      calls.push({ kind: "complaint", providerMessageId });
      return { matched };
    },
  };
  return { calls, store };
}

describe("Resend webhook handling (#209)", () => {
  const secret = "whsec_" + Buffer.from("test secret").toString("base64");
  const now = new Date("2026-11-17T15:00:00.000Z");
  const timestamp = String(Math.floor(now.getTime() / 1000));

  function request(body: unknown, { signed = true, id = "msg_1" } = {}) {
    const rawBody = typeof body === "string" ? body : JSON.stringify(body);
    return {
      rawBody,
      headers: {
        id,
        timestamp,
        signature: signed ? signResendWebhook(secret, id, timestamp, rawBody) : "v1,AAAA",
      },
    };
  }

  const bounced = {
    type: "email.bounced",
    data: { email_id: "provider-1", bounce: { message: "Mailbox does not exist" } },
  };

  it("answers 503 when the secret is not set, and writes nothing", async () => {
    const { calls, store } = memoryStore();
    const result = await handleResendWebhook({ ...request(bounced), secret: undefined, now, store });
    expect(result.status).toBe(503);
    expect(calls).toEqual([]);
  });

  it("answers 401 for a bad signature and never touches the store", async () => {
    const { calls, store } = memoryStore();
    const result = await handleResendWebhook({ ...request(bounced, { signed: false }), secret, now, store });
    expect(result).toEqual({ status: 401, body: { ok: false } });
    expect(calls).toEqual([]);
  });

  it("answers 401 for an empty body with no headers", async () => {
    const { calls, store } = memoryStore();
    const result = await handleResendWebhook({
      rawBody: "{}",
      headers: { id: null, timestamp: null, signature: null },
      secret,
      now,
      store,
    });
    expect(result.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("answers 400 for a signed body that is not JSON, or fails its schema", async () => {
    const { calls, store } = memoryStore();
    expect((await handleResendWebhook({ ...request("not json"), secret, now, store })).status).toBe(400);
    expect(
      (await handleResendWebhook({ ...request({ type: "email.bounced", data: {} }), secret, now, store }))
        .status,
    ).toBe(400);
    expect(calls).toEqual([]);
  });

  it("records a bounce by provider id, with the provider's detail", async () => {
    const { calls, store } = memoryStore();
    const result = await handleResendWebhook({ ...request(bounced), secret, now, store });
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(calls).toEqual([
      { kind: "bounce", providerMessageId: "provider-1", detail: "Mailbox does not exist" },
    ]);
  });

  it("records a bounce that has no detail", async () => {
    const { calls, store } = memoryStore();
    await handleResendWebhook({
      ...request({ type: "email.bounced", data: { email_id: "provider-2" } }),
      secret,
      now,
      store,
    });
    expect(calls).toEqual([{ kind: "bounce", providerMessageId: "provider-2", detail: undefined }]);
  });

  it("records a complaint", async () => {
    const { calls, store } = memoryStore();
    const result = await handleResendWebhook({
      ...request({ type: "email.complained", data: { email_id: "provider-3" } }),
      secret,
      now,
      store,
    });
    expect(result.status).toBe(200);
    expect(calls).toEqual([{ kind: "complaint", providerMessageId: "provider-3" }]);
  });

  it("ignores other event types with a 200", async () => {
    const { calls, store } = memoryStore();
    const result = await handleResendWebhook({
      ...request({ type: "email.delivered", data: { email_id: "provider-4" } }),
      secret,
      now,
      store,
    });
    expect(result).toEqual({ status: 200, body: { ok: true, ignored: true } });
    expect(calls).toEqual([]);
  });

  it("answers 200 when no row matches the id", async () => {
    const { store } = memoryStore(false);
    const result = await handleResendWebhook({ ...request(bounced), secret, now, store });
    expect(result.status).toBe(200);
  });
});
