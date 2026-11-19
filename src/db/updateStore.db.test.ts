import { expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { postUpdate } from "@/app/_updates/postUpdate";
import { CHECK_IN_BODY } from "@/core/updates";
import { BOARD_POSITIONS, rolesFromPositions } from "@/core/positions";
import type { Prisma } from "@/generated/prisma/client";
import { describeWithDatabase } from "@/db/testing/database";
import { buildFollow, buildUser } from "@/db/testing/factories";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { prismaUpdateStore } from "./updateStore";

// Board updates and check-ins against Postgres (#130), inside the seed's rolled-back
// transaction. foodPantry (DAB, #103) is the seed's one in-progress idea.
const DAY = 24 * 60 * 60 * 1000;
const dabChair: Session = {
  user: { id: users.dabChair.id, email: users.dabChair.email, name: users.dabChair.displayName },
  positions: [{ key: BOARD_POSITIONS.DAB.lead, name: "Chair" }],
  roles: rolesFromPositions([BOARD_POSITIONS.DAB.lead]),
};

async function addFollowers(tx: Prisma.TransactionClient, ideaId: string, count: number) {
  const followers = Array.from({ length: count }, () => buildUser());
  await tx.user.createMany({ data: followers });
  await tx.follow.createMany({ data: followers.map((user) => buildFollow({ userId: user.id, ideaId })) });
}

// Makes the idea stale: started 40 days ago, with no board or check-in update.
async function makeStale(tx: Prisma.TransactionClient, ideaId: string) {
  await tx.update.deleteMany({ where: { ideaId } });
  await tx.idea.update({ where: { id: ideaId }, data: { statusChangedAt: new Date(Date.now() - 40 * DAY) } });
}

const staleFlag = async (tx: Prisma.TransactionClient, ideaId: string) =>
  (await tx.ideaStats.findUniqueOrThrow({ where: { ideaId } })).isStale;

describeWithDatabase("posting an update (#130)", () => {
  it("a board update writes the row with the leader as author, and one outbox row per follower", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, ideas.foodPantry.id, 2);
      const followers = await tx.follow.count({ where: { ideaId: ideas.foodPantry.id } });
      const outboxBefore = await tx.emailOutbox.count({ where: { type: "idea_event" } });

      const now = new Date();
      const result = await postUpdate(
        prismaUpdateStore(tx),
        dabChair,
        { ideaId: ideas.foodPantry.id, kind: "board", body: "The committee met on Tuesday." },
        now,
      );
      expect(result).toEqual({ ok: true, number: 103, kind: "board" });

      const row = await tx.update.findFirstOrThrow({
        where: { ideaId: ideas.foodPantry.id },
        orderBy: { createdAt: "desc" },
      });
      expect(row).toMatchObject({
        kind: "board",
        body: "The committee met on Tuesday.",
        authorId: users.dabChair.id,
        createdAt: now,
      });
      expect(await tx.emailOutbox.count({ where: { type: "idea_event" } })).toBe(outboxBefore + followers);
    });
  });

  it("a check-in writes the fixed words and queues no email", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, ideas.foodPantry.id, 2);
      const outboxBefore = await tx.emailOutbox.count();
      const result = await postUpdate(
        prismaUpdateStore(tx),
        dabChair,
        { ideaId: ideas.foodPantry.id, kind: "check_in" },
        new Date(),
      );
      expect(result).toMatchObject({ ok: true, kind: "check_in" });
      const row = await tx.update.findFirstOrThrow({
        where: { ideaId: ideas.foodPantry.id, kind: "check_in" },
        orderBy: { createdAt: "desc" },
      });
      expect(row.body).toBe(CHECK_IN_BODY);
      expect(await tx.emailOutbox.count()).toBe(outboxBefore);
    });
  });

  it("a check-in clears an idea's stale flag", async () => {
    await withSeed(async (tx) => {
      await makeStale(tx, ideas.foodPantry.id);
      expect(await staleFlag(tx, ideas.foodPantry.id)).toBe(true);
      await postUpdate(
        prismaUpdateStore(tx),
        dabChair,
        { ideaId: ideas.foodPantry.id, kind: "check_in" },
        new Date(),
      );
      expect(await staleFlag(tx, ideas.foodPantry.id)).toBe(false);
    });
  });

  it("a board update clears it too", async () => {
    await withSeed(async (tx) => {
      await makeStale(tx, ideas.foodPantry.id);
      await postUpdate(
        prismaUpdateStore(tx),
        dabChair,
        { ideaId: ideas.foodPantry.id, kind: "board", body: "Quote came back from the vendor." },
        new Date(),
      );
      expect(await staleFlag(tx, ideas.foodPantry.id)).toBe(false);
    });
  });

  it("an idea that is not public is not found, and an idea on hold takes no update", async () => {
    await withSeed(async (tx) => {
      const store = prismaUpdateStore(tx);
      expect(await store.find(ideas.pending.id)).toBeNull();
      expect(await store.find("00000000-0000-4000-8000-00000000ffff")).toBeNull();
      expect(await store.find(ideas.refillStations.id)).toMatchObject({ number: 140, status: "waiting" });
      const scDirector: Session = {
        ...dabChair,
        positions: [{ key: BOARD_POSITIONS.SC.lead, name: "Director" }],
        roles: rolesFromPositions([BOARD_POSITIONS.SC.lead]),
      };
      const result = await postUpdate(
        store,
        scDirector,
        { ideaId: ideas.refillStations.id, kind: "check_in" },
        new Date(),
      );
      expect(result).toEqual({ ok: false, error: { code: "not_in_progress" } });
    });
  });

  it("the leader's user row is copied from the session when it is missing", async () => {
    await withSeed(async (tx) => {
      const stranger: Session = {
        ...dabChair,
        user: { id: "00000000-0000-4000-8000-0000000000c9", email: "new.chair@example.com", name: "Nia" },
      };
      await postUpdate(
        prismaUpdateStore(tx),
        stranger,
        { ideaId: ideas.foodPantry.id, kind: "check_in" },
        new Date(),
      );
      expect(await tx.user.findUniqueOrThrow({ where: { id: stranger.user.id } })).toMatchObject({
        email: "new.chair@example.com",
        displayName: "Nia",
      });
    });
  });
});
