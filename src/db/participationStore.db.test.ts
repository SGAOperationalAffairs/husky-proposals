import { expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { setParticipation } from "@/app/_participate/setParticipation";
import { ACTION_LIMIT, windowStart } from "@/core/actionLimit";
import { rolesFromPositions } from "@/core/positions";
import { describeWithDatabase } from "@/db/testing/database";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { prismaParticipationStore } from "./participationStore";
import { listPeople } from "./peopleStore";
import { publicIdeaQueries } from "./publicIdeas";

// Setting "I'll participate" against Postgres (#95), inside the seed's rolled-back transaction.
const NOW = new Date("2026-11-06T15:04:10.000Z");
const NEXT_MINUTE = new Date("2026-11-06T15:05:01.000Z");
const sessionFor = (user: { id: string; email: string; displayName: string }): Session => ({
  user: { id: user.id, email: user.email, name: user.displayName },
  positions: [],
  roles: rolesFromPositions([]),
});
const maya = sessionFor(users.student);
const priya = sessionFor(users.secondStudent);

// An open idea (SC) with no seeded participations.
const idea = ideas.refillStations;
const input = (participating: boolean, number = idea.number!) => ({ number, participating });
const changed = ["ideas", `idea:${idea.number}`];

describeWithDatabase("participation store (#95)", () => {
  it("participating twice leaves one row, and withdrawing twice leaves none", async () => {
    await withSeed(async (tx) => {
      const store = prismaParticipationStore(tx);
      const where = { userId: maya.user.id, ideaId: idea.id };
      expect(await setParticipation(store, maya, input(true), NOW)).toMatchObject({
        ok: true,
        refresh: changed,
      });
      expect(await setParticipation(store, maya, input(true), NOW)).toMatchObject({ ok: true, refresh: [] });
      expect(await tx.participation.count({ where })).toBe(1);

      expect(await setParticipation(store, maya, input(false), NOW)).toMatchObject({
        ok: true,
        refresh: changed,
      });
      expect(await setParticipation(store, maya, input(false), NOW)).toMatchObject({ ok: true, refresh: [] });
      expect(await tx.participation.count({ where })).toBe(0);
    });
  });

  it("a repeat tap keeps the contact status a leader set", async () => {
    await withSeed(async (tx) => {
      const where = { userId_ideaId: { userId: priya.user.id, ideaId: ideas.foodPantry.id } };
      await tx.participation.update({
        where,
        data: { contactStatus: "contacted", contactedAt: NOW },
      });
      const result = await setParticipation(
        prismaParticipationStore(tx),
        priya,
        input(true, ideas.foodPantry.number!),
        NOW,
      );
      expect(result).toMatchObject({ ok: true, refresh: [] });
      const row = await tx.participation.findUniqueOrThrow({ where });
      expect(row.contactStatus).toBe("contacted");
      expect(row.contactedAt).toEqual(NOW);
    });
  });

  it("refuses an unknown or delivered idea and writes nothing", async () => {
    await withSeed(async (tx) => {
      const store = prismaParticipationStore(tx);
      const before = await tx.participation.count();
      expect(await setParticipation(store, maya, input(true, 9999), NOW)).toEqual({
        ok: false,
        error: { code: "not_found" },
      });
      expect(await setParticipation(store, maya, input(true, ideas.compostBins.number!), NOW)).toEqual({
        ok: false,
        error: { code: "closed" },
      });
      expect(await tx.participation.count()).toBe(before);
    });
  });

  it("refuses to offer on a closed idea, but withdrawing there removes the row", async () => {
    await withSeed(async (tx) => {
      await tx.idea.update({
        where: { id: ideas.foodPantry.id },
        data: { status: "closed", closedReason: "Not funded this year" },
      });
      const store = prismaParticipationStore(tx);
      const where = { userId: priya.user.id, ideaId: ideas.foodPantry.id };
      expect(await setParticipation(store, maya, input(true, ideas.foodPantry.number!), NOW)).toEqual({
        ok: false,
        error: { code: "closed" },
      });
      expect(await tx.participation.count({ where: { ideaId: ideas.foodPantry.id } })).toBe(1);

      expect(await setParticipation(store, priya, input(false, ideas.foodPantry.number!), NOW)).toMatchObject(
        {
          ok: true,
        },
      );
      expect(await tx.participation.count({ where })).toBe(0);
    });
  });

  it("a withdrawn post is not found", async () => {
    await withSeed(async (tx) => {
      // status is only allowed on approved posts (ideas_status_only_when_approved), so clear it too.
      await tx.idea.update({
        where: { id: ideas.walkSignal.id },
        data: { reviewStatus: "withdrawn", status: null },
      });
      const result = await setParticipation(
        prismaParticipationStore(tx),
        maya,
        input(true, ideas.walkSignal.number!),
        NOW,
      );
      expect(result).toEqual({ ok: false, error: { code: "not_found" } });
    });
  });

  it("students see only the count: it rises by one and the student shape holds no name or email", async () => {
    await withSeed(async (tx) => {
      const queries = publicIdeaQueries(tx);
      const before = await queries.byNumber(idea.number!);
      await setParticipation(prismaParticipationStore(tx), maya, input(true), NOW);
      const after = await queries.byNumber(idea.number!);
      expect(after?.stats.willingCount).toBe((before?.stats.willingCount ?? 0) + 1);
      const text = JSON.stringify(after);
      expect(text).not.toContain(maya.user.id);
      expect(text).not.toContain(maya.user.email);
    });
  });

  it("leaders of the idea's board see the name on the People list, and other boards do not", async () => {
    await withSeed(async (tx) => {
      await setParticipation(prismaParticipationStore(tx), maya, input(true), NOW);
      const forIdea = (rows: Awaited<ReturnType<typeof listPeople>>) =>
        rows.filter((row) => row.ideaNumber === idea.number);

      expect(forIdea(await listPeople(tx, ["SC"]))).toEqual([
        expect.objectContaining({ name: users.student.displayName, email: users.student.email }),
      ]);
      expect(forIdea(await listPeople(tx, ["DAB", "CPAB", "CSC", "GIB"]))).toEqual([]);
    });
  });

  it("the limit: at the cap the call is rate_limited and writes no row, and the next minute succeeds", async () => {
    await withSeed(async (tx) => {
      const store = prismaParticipationStore(tx);
      // One write puts the minute at the limit; the 60 versus 61 boundary is covered by
      // checkActionCount in src/core/actionLimit.test.ts.
      await tx.actionCount.create({
        data: { userId: maya.user.id, windowStart: windowStart(NOW), count: ACTION_LIMIT },
      });
      const where = { userId: maya.user.id, ideaId: idea.id };
      expect(await setParticipation(store, maya, input(true), NOW)).toEqual({
        ok: false,
        error: { code: "rate_limited" },
      });
      expect(await tx.participation.count({ where })).toBe(0);

      expect(await setParticipation(store, maya, input(true), NEXT_MINUTE)).toMatchObject({ ok: true });
      expect(await tx.participation.count({ where })).toBe(1);
    });
  });
});
