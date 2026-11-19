import { expect, it } from "vitest";
import { queueDecisionEmail } from "@/db/outbox";
import { describeWithDatabase } from "@/db/testing/database";
import { ideas } from "@/db/testing/fixtures";
import { testUuid } from "@/db/testing/factories";
import { withSeed } from "@/db/testing/seededTransaction";
import { createCapturingMailer } from "@/email/capturingMailer";
import { handleJobRequest } from "./jobRequest";
import { runSendEmailJob } from "./sendEmailJob";

// The scheduled send against Postgres (#210), inside the seed's rolled-back transaction.
// The mailer is the capturing mailer and sleep is a no-op: nothing is sent and nothing waits.
const SECRET = "s".repeat(40);
const NOW = new Date("2026-11-06T15:00:00.000Z");

describeWithDatabase("send-email job (#210)", () => {
  async function setup(tx: Parameters<typeof queueDecisionEmail>[0]) {
    await queueDecisionEmail(tx, {
      ideaId: ideas.pending.id,
      reviewId: testUuid(7001),
      decision: "declined",
      reason: "This repeats an open idea. Support that one instead.",
      decidedAt: NOW,
    });
    return createCapturingMailer();
  }

  const request = (
    tx: Parameters<typeof runSendEmailJob>[0]["db"],
    mailer: ReturnType<typeof createCapturingMailer>,
    authorization: string | null,
  ) =>
    handleJobRequest({
      authorization,
      secret: SECRET,
      run: () =>
        runSendEmailJob({
          db: tx,
          mailer,
          now: NOW,
          siteUrl: "https://proposals.example.com",
          sleep: async () => {},
        }),
    });

  it("sends a queued decision email when the secret is right", async () => {
    await withSeed(async (tx) => {
      const mailer = await setup(tx);
      expect(await request(tx, mailer, `Bearer ${SECRET}`)).toEqual({
        status: 200,
        body: { ok: true, sent: 1, failed: 0, deferred: 0 },
      });
      expect(mailer.sent).toHaveLength(1);
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { type: "post_decided" } });
      expect(row.sentAt).toEqual(NOW);
      expect(row.providerMessageId).toBe("captured-1");
    });
  });

  it("answers 401 without the secret and claims nothing", async () => {
    await withSeed(async (tx) => {
      const mailer = await setup(tx);
      expect(await request(tx, mailer, null)).toEqual({ status: 401, body: { ok: false } });
      expect(mailer.sent).toHaveLength(0);
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { type: "post_decided" } });
      expect(row).toMatchObject({ attempts: 0, lockedUntil: null, sentAt: null });
    });
  });
});
