import { expect, it } from "vitest";
import { SETTABLE_EMAIL_TYPES } from "@/core/emailSettings";
import { prismaEmailSettingsStore } from "./emailSettingsStore";
import { describeWithDatabase } from "./testing/database";
import { FIXTURE_TIME } from "./testing/factories";
import { users } from "./testing/fixtures";
import { withSeed } from "./testing/seededTransaction";

// The notification settings against Postgres (#211), inside the seed's rolled-back
// transaction.
const maya = { id: users.student.id, email: users.student.email, displayName: users.student.displayName };
const priya = {
  id: users.secondStudent.id,
  email: users.secondStudent.email,
  displayName: users.secondStudent.displayName,
};
const stranger = {
  id: "00000000-0000-4000-8000-0000000000e1",
  email: "new.student@example.com",
  displayName: "New",
};

describeWithDatabase("notification settings store (#211)", () => {
  it("reads every type on, and not stopped, for a student with no user row yet", async () => {
    await withSeed(async (tx) => {
      const { settings, stopped } = await prismaEmailSettingsStore(tx).read(stranger.id);
      expect(stopped).toBe(false);
      expect(Object.keys(settings)).toEqual([...SETTABLE_EMAIL_TYPES]);
      expect(Object.values(settings).every(Boolean)).toBe(true);
    });
  });

  it("turns each type off and back on", async () => {
    await withSeed(async (tx) => {
      const store = prismaEmailSettingsStore(tx);
      for (const type of SETTABLE_EMAIL_TYPES) {
        await store.set(maya, type, false);
        const off = await store.read(maya.id);
        expect(off.settings[type], `${type} off`).toBe(false);
        expect(Object.entries(off.settings).filter(([, on]) => !on)).toHaveLength(1);
        await store.set(maya, type, true);
        expect((await store.read(maya.id)).settings[type], `${type} on`).toBe(true);
      }
      expect(await tx.emailOptOut.count({ where: { userId: maya.id } })).toBe(0);
    });
  });

  it("a second off is a no-op, and turning on a type that was never off is fine", async () => {
    await withSeed(async (tx) => {
      const store = prismaEmailSettingsStore(tx);
      await store.set(maya, "digest", false);
      await store.set(maya, "digest", false);
      expect(await tx.emailOptOut.count({ where: { userId: maya.id, type: "digest" } })).toBe(1);
      await store.set(maya, "idea_event", true);
      expect((await store.read(maya.id)).settings.idea_event).toBe(true);
    });
  });

  it("creates the user row for a student seen for the first time", async () => {
    await withSeed(async (tx) => {
      await prismaEmailSettingsStore(tx).set(stranger, "post_status", false);
      expect(await tx.user.count({ where: { id: stranger.id } })).toBe(1);
      expect((await prismaEmailSettingsStore(tx).read(stranger.id)).settings.post_status).toBe(false);
    });
  });

  it("turnOff writes one row, twice is fine, and it touches no other type or student (#212)", async () => {
    await withSeed(async (tx) => {
      const store = prismaEmailSettingsStore(tx);
      await store.turnOff(maya.id, "digest");
      await store.turnOff(maya.id, "digest");
      expect(await tx.emailOptOut.count({ where: { userId: maya.id } })).toBe(1);
      expect(await tx.emailOptOut.count({ where: { userId: maya.id, type: "digest" } })).toBe(1);
      expect((await store.read(priya.id)).settings.digest).toBe(true);
    });
  });

  it("turnOff for a student with no user row is a no-op and creates nothing (#212)", async () => {
    await withSeed(async (tx) => {
      await prismaEmailSettingsStore(tx).turnOff(stranger.id, "digest");
      expect(await tx.user.count({ where: { id: stranger.id } })).toBe(0);
      expect(await tx.emailOptOut.count({ where: { userId: stranger.id } })).toBe(0);
    });
  });

  it("reports stopped from email_stopped_at", async () => {
    await withSeed(async (tx) => {
      const store = prismaEmailSettingsStore(tx);
      await tx.user.update({ where: { id: maya.id }, data: { emailStoppedAt: FIXTURE_TIME } });
      expect((await store.read(maya.id)).stopped).toBe(true);
      expect((await store.read(priya.id)).stopped).toBe(false);
    });
  });

  it("a write never touches another user's rows", async () => {
    await withSeed(async (tx) => {
      const store = prismaEmailSettingsStore(tx);
      await store.set(priya, "post_decided", false);
      await store.set(maya, "post_decided", false);
      await store.set(maya, "post_decided", true);
      expect((await store.read(priya.id)).settings.post_decided).toBe(false);
    });
  });
});
