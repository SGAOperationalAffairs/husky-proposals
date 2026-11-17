import { expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { changeIdeaStatus } from "@/app/_status/changeIdeaStatus";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";
import type { Prisma } from "@/generated/prisma/client";
import { describeWithDatabase } from "@/db/testing/database";
import { withCountedSeed } from "@/db/testing/countQueries";
import { buildFollow, buildUser } from "@/db/testing/factories";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { isPublic } from "./ideaSelects";
import { prismaStatusStore } from "./statusStore";

// Start, hold, and deliver against Postgres (#98), inside the seed's rolled-back
// transaction.
const NOW = new Date("2026-11-30T15:00:00.000Z");
const dabChair: Session = {
  user: { id: users.dabChair.id, email: users.dabChair.email, name: users.dabChair.displayName },
  positions: [{ key: BOARD_POSITIONS.DAB.lead, name: "Chair" }],
  roles: rolesFromPositions([BOARD_POSITIONS.DAB.lead]),
};
const vp: Session = {
  user: { id: users.vp.id, email: users.vp.email, name: users.vp.displayName },
  positions: [{ key: VP_CAMPUS_AFFAIRS, name: "VP of Campus Affairs" }],
  roles: rolesFromPositions([VP_CAMPUS_AFFAIRS]),
};

async function addFollowers(tx: Prisma.TransactionClient, ideaId: string, count: number) {
  const followers = Array.from({ length: count }, () => buildUser());
  await tx.user.createMany({ data: followers });
  await tx.follow.createMany({ data: followers.map((user) => buildFollow({ userId: user.id, ideaId })) });
}

describeWithDatabase("status changes (#98)", () => {
  it("holding writes the reason, one system update, and one outbox row per follower", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, ideas.lateNightDining.id, 2);
      const outboxBefore = await tx.emailOutbox.count();
      const updatesBefore = await tx.update.count({ where: { ideaId: ideas.lateNightDining.id } });

      const result = await changeIdeaStatus(
        prismaStatusStore(tx),
        dabChair,
        "hold",
        { ideaId: ideas.lateNightDining.id, reason: "It needs more information first." },
        NOW,
      );
      expect(result).toEqual({ ok: true, status: "waiting", number: 131 });

      const idea = await tx.idea.findUniqueOrThrow({ where: { id: ideas.lateNightDining.id } });
      expect(idea).toMatchObject({
        status: "waiting",
        waitingReason: "It needs more information first",
        statusChangedAt: NOW,
      });
      const updates = await tx.update.findMany({
        where: { ideaId: ideas.lateNightDining.id },
        orderBy: { createdAt: "desc" },
      });
      expect(updates).toHaveLength(updatesBefore + 1);
      expect(updates[0]).toMatchObject({
        kind: "system",
        authorId: null,
        body: "The Dining Advisory Board put this idea on hold: It needs more information first.",
      });
      // The seed already follows this idea once, so the new rows are the two added.
      expect(await tx.emailOutbox.count()).toBeGreaterThanOrEqual(outboxBefore + 2);
    });
  });

  it("starting sets in progress, resets the stale clock, and clears a held reason", async () => {
    await withSeed(async (tx) => {
      const result = await changeIdeaStatus(
        prismaStatusStore(tx),
        vp,
        "start",
        { ideaId: ideas.refillStations.id, confirmed: true },
        NOW,
      );
      expect(result).toMatchObject({ ok: true, status: "in_progress" });
      const idea = await tx.idea.findUniqueOrThrow({ where: { id: ideas.refillStations.id } });
      expect(idea).toMatchObject({ status: "in_progress", waitingReason: null, statusChangedAt: NOW });
    });
  });

  it("delivering sets deliveredAt and writes the update", async () => {
    await withSeed(async (tx) => {
      const result = await changeIdeaStatus(
        prismaStatusStore(tx),
        dabChair,
        "deliver",
        { ideaId: ideas.foodPantry.id },
        NOW,
      );
      expect(result).toMatchObject({ ok: true, status: "delivered" });
      const idea = await tx.idea.findUniqueOrThrow({ where: { id: ideas.foodPantry.id } });
      expect(idea).toMatchObject({ status: "delivered", deliveredAt: NOW });
      const latest = await tx.update.findFirstOrThrow({
        where: { ideaId: ideas.foodPantry.id, kind: "system" },
        orderBy: { createdAt: "desc" },
      });
      expect(latest.body).toBe("The Dining Advisory Board marked this idea delivered.");
    });
  });

  it("the guarded write returns null when the status already moved", async () => {
    await withSeed(async (tx) => {
      const store = prismaStatusStore(tx);
      const write = {
        ideaId: ideas.lateNightDining.id,
        from: "collecting_support" as const,
        patch: { status: "in_progress" as const, waitingReason: null, statusChangedAt: NOW },
        update: { kind: "system" as const, body: "The Dining Advisory Board started work on this idea." },
        event: {
          kind: "status" as const,
          ideaId: ideas.lateNightDining.id,
          status: "in_progress" as const,
          waitingReason: null,
          changedAt: NOW,
        },
      };
      expect(await store.record(write)).not.toBeNull();
      const updates = await tx.update.count({ where: { ideaId: ideas.lateNightDining.id } });
      expect(await store.record(write)).toBeNull();
      // The lost write leaves no second update row.
      expect(await tx.update.count({ where: { ideaId: ideas.lateNightDining.id } })).toBe(updates);
    });
  });

  it("find reads the board's guideline and the load counts only its public in-progress ideas", async () => {
    await withSeed(async (tx) => {
      const store = prismaStatusStore(tx);
      const found = await store.find(ideas.foodPantry.id);
      expect(found).toMatchObject({ id: ideas.foodPantry.id, boardId: "DAB", number: 103, scale: "large" });
      expect(found?.guideline).toBeGreaterThan(0);
      expect(found).not.toHaveProperty("board");
      const load = await store.boardLoad("DAB");
      const expected = await tx.idea.count({ where: { ...isPublic, boardId: "DAB", status: "in_progress" } });
      expect(load).toHaveLength(expected);
      expect(await store.find("00000000-0000-4000-8000-00000000ffff")).toBeNull();
    });
  });

  it("a start sends a fixed number of queries however many followers there are", async () => {
    await withCountedSeed(async (tx, queries) => {
      await addFollowers(tx, ideas.lateNightDining.id, 1);
      queries.reset();
      await changeIdeaStatus(
        prismaStatusStore(tx),
        dabChair,
        "start",
        { ideaId: ideas.lateNightDining.id, confirmed: true },
        NOW,
      );
      const few = queries.count;

      await addFollowers(tx, ideas.walkSignal.id, 20);
      queries.reset();
      await changeIdeaStatus(
        prismaStatusStore(tx),
        vp,
        "start",
        { ideaId: ideas.walkSignal.id, confirmed: true },
        NOW,
      );
      expect(queries.count).toBe(few);
    });
  });
});
