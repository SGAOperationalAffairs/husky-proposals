import { expect, it } from "vitest";
import { emailEventStore } from "./emailEventStore";
import { describeWithDatabase } from "./testing/database";
import { buildEmailPreference, buildOutboxRow, buildUser } from "./testing/factories";
import { withSeed } from "./testing/seededTransaction";

// The Resend bounce and complaint writes against Postgres (#209), in a rolled-back transaction.
const NOW = new Date("2026-11-17T15:00:00.000Z");
const LATER = new Date("2026-11-17T16:00:00.000Z");

describeWithDatabase("email event store (#209)", () => {
  async function sentRow(tx: Parameters<Parameters<typeof withSeed>[0]>[0]) {
    const user = buildUser();
    await tx.user.create({ data: user });
    const row = buildOutboxRow({ userId: user.id, sentAt: NOW, providerMessageId: "provider-1" });
    await tx.emailOutbox.create({ data: row });
    return { user, row };
  }

  it("a bounce marks the row, stops the user, and marks an existing preference", async () => {
    await withSeed(async (tx) => {
      const { user, row } = await sentRow(tx);
      await tx.emailPreference.create({ data: buildEmailPreference({ userId: user.id }) });

      const result = await emailEventStore(tx).recordBounce({
        providerMessageId: "provider-1",
        detail: "Mailbox does not exist",
        now: NOW,
      });

      expect(result).toEqual({ matched: true });
      expect(await tx.emailOutbox.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({
        bouncedAt: NOW,
        lastError: "bounced: Mailbox does not exist",
      });
      expect((await tx.user.findUniqueOrThrow({ where: { id: user.id } })).emailStoppedAt).toEqual(NOW);
      expect((await tx.emailPreference.findUniqueOrThrow({ where: { userId: user.id } })).bouncedAt).toEqual(
        NOW,
      );
    });
  });

  it("a bounce creates no preference row when there is none", async () => {
    await withSeed(async (tx) => {
      const { user } = await sentRow(tx);
      await emailEventStore(tx).recordBounce({
        providerMessageId: "provider-1",
        detail: undefined,
        now: NOW,
      });
      expect(await tx.emailPreference.count({ where: { userId: user.id } })).toBe(0);
      expect((await tx.user.findUniqueOrThrow({ where: { id: user.id } })).emailStoppedAt).toEqual(NOW);
    });
  });

  it("truncates a long detail to fit last_error", async () => {
    await withSeed(async (tx) => {
      const { row } = await sentRow(tx);
      await emailEventStore(tx).recordBounce({
        providerMessageId: "provider-1",
        detail: "x".repeat(2000),
        now: NOW,
      });
      const stored = await tx.emailOutbox.findUniqueOrThrow({ where: { id: row.id } });
      expect(stored.lastError).toHaveLength(500);
    });
  });

  it("a second identical bounce changes nothing, keeping the first time", async () => {
    await withSeed(async (tx) => {
      const { user, row } = await sentRow(tx);
      await tx.emailPreference.create({ data: buildEmailPreference({ userId: user.id }) });
      const store = emailEventStore(tx);
      await store.recordBounce({ providerMessageId: "provider-1", detail: "first", now: NOW });
      await store.recordBounce({ providerMessageId: "provider-1", detail: "second", now: LATER });

      expect(await tx.emailOutbox.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({
        bouncedAt: NOW,
        lastError: "bounced: first",
      });
      expect((await tx.user.findUniqueOrThrow({ where: { id: user.id } })).emailStoppedAt).toEqual(NOW);
      expect((await tx.emailPreference.findUniqueOrThrow({ where: { userId: user.id } })).bouncedAt).toEqual(
        NOW,
      );
    });
  });

  it("an unknown provider id writes nothing", async () => {
    await withSeed(async (tx) => {
      const { user, row } = await sentRow(tx);
      const result = await emailEventStore(tx).recordBounce({
        providerMessageId: "someone-elses-mail",
        detail: "x",
        now: NOW,
      });
      expect(result).toEqual({ matched: false });
      expect((await tx.emailOutbox.findUniqueOrThrow({ where: { id: row.id } })).bouncedAt).toBeNull();
      expect((await tx.user.findUniqueOrThrow({ where: { id: user.id } })).emailStoppedAt).toBeNull();
    });
  });

  it("a complaint stops the user and unsubscribes, leaving the row's bounced_at null", async () => {
    await withSeed(async (tx) => {
      const { user, row } = await sentRow(tx);
      await tx.emailPreference.create({ data: buildEmailPreference({ userId: user.id }) });

      const result = await emailEventStore(tx).recordComplaint({ providerMessageId: "provider-1", now: NOW });

      expect(result).toEqual({ matched: true });
      expect((await tx.emailOutbox.findUniqueOrThrow({ where: { id: row.id } })).bouncedAt).toBeNull();
      expect((await tx.user.findUniqueOrThrow({ where: { id: user.id } })).emailStoppedAt).toEqual(NOW);
      expect(
        (await tx.emailPreference.findUniqueOrThrow({ where: { userId: user.id } })).unsubscribedAt,
      ).toEqual(NOW);
    });
  });

  it("a complaint for an unknown id writes nothing", async () => {
    await withSeed(async (tx) => {
      const { user } = await sentRow(tx);
      expect(await emailEventStore(tx).recordComplaint({ providerMessageId: "nope", now: NOW })).toEqual({
        matched: false,
      });
      expect((await tx.user.findUniqueOrThrow({ where: { id: user.id } })).emailStoppedAt).toBeNull();
    });
  });
});
