import { expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { setSupport } from "@/app/_support/setSupport";
import { ACTION_LIMIT } from "@/core/actionLimit";
import { rolesFromPositions } from "@/core/positions";
import { describeWithDatabase } from "@/db/testing/database";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { publicIdeaQueries } from "./publicIdeas";
import { prismaSupportStore } from "./supportStore";

// Setting a support against Postgres (#94), inside the seed's rolled-back transaction.
const NOW = new Date("2026-11-06T15:04:10.000Z");
const NEXT_MINUTE = new Date("2026-11-06T15:05:01.000Z");
const sessionFor = (user: { id: string; email: string; displayName: string }): Session => ({
  user: { id: user.id, email: user.email, name: user.displayName },
  positions: [],
  roles: rolesFromPositions([]),
});
const maya = sessionFor(users.student);

// An open idea Maya has not supported in the seed.
const idea = ideas.refillStations;
const input = (supported: boolean, number = idea.number!) => ({ number, supported });

describeWithDatabase("support store (#94)", () => {
  it("supporting twice leaves one row, and unsupporting twice leaves none", async () => {
    await withSeed(async (tx) => {
      const store = prismaSupportStore(tx);
      const where = { userId: maya.user.id, ideaId: idea.id };
      expect(await setSupport(store, maya, input(true), NOW)).toMatchObject({
        ok: true,
        refresh: ["ideas", `idea:${idea.number}`],
      });
      expect(await setSupport(store, maya, input(true), NOW)).toMatchObject({ ok: true, refresh: [] });
      expect(await tx.support.count({ where })).toBe(1);

      expect(await setSupport(store, maya, input(false), NOW)).toMatchObject({
        ok: true,
        refresh: ["ideas", `idea:${idea.number}`],
      });
      expect(await setSupport(store, maya, input(false), NOW)).toMatchObject({ ok: true, refresh: [] });
      expect(await tx.support.count({ where })).toBe(0);
    });
  });

  it("refuses a pending, declined, or delivered idea and writes nothing", async () => {
    await withSeed(async (tx) => {
      const store = prismaSupportStore(tx);
      const before = await tx.support.count();
      // Pending and declined posts have no public number, so they are not found at all.
      expect(await setSupport(store, maya, input(true, 9999), NOW)).toEqual({
        ok: false,
        error: { code: "not_found" },
      });
      expect(await setSupport(store, maya, input(true, ideas.compostBins.number!), NOW)).toEqual({
        ok: false,
        error: { code: "closed" },
      });
      expect(await tx.support.count()).toBe(before);
    });
  });

  it("a withdrawn post is not found", async () => {
    await withSeed(async (tx) => {
      // status is only allowed on approved posts (ideas_status_only_when_approved), so clear it too (#94).
      await tx.idea.update({
        where: { id: ideas.walkSignal.id },
        data: { reviewStatus: "withdrawn", status: null },
      });
      const result = await setSupport(
        prismaSupportStore(tx),
        maya,
        input(true, ideas.walkSignal.number!),
        NOW,
      );
      expect(result).toEqual({ ok: false, error: { code: "not_found" } });
    });
  });

  it("raises the public count by one and shows the student shape no supporter", async () => {
    await withSeed(async (tx) => {
      const queries = publicIdeaQueries(tx);
      const before = await queries.byNumber(idea.number!);
      await setSupport(prismaSupportStore(tx), maya, input(true), NOW);
      const after = await queries.byNumber(idea.number!);
      expect(after?.stats.supportCount).toBe((before?.stats.supportCount ?? 0) + 1);
      const text = JSON.stringify(after);
      expect(text).not.toContain(maya.user.id);
      expect(text).not.toContain(maya.user.email);
    });
  });

  it("the 61st change in a minute is rate_limited and writes no support, and the next minute succeeds", async () => {
    await withSeed(async (tx) => {
      const store = prismaSupportStore(tx);
      for (let i = 0; i < ACTION_LIMIT; i++) {
        expect((await setSupport(store, maya, input(i % 2 === 0), NOW)).ok).toBe(true);
      }
      // The 60th change was an unsupport (i = 59), so a support now would add a row.
      const over = await setSupport(store, maya, input(true), NOW);
      expect(over).toEqual({ ok: false, error: { code: "rate_limited" } });
      expect(await tx.support.count({ where: { userId: maya.user.id, ideaId: idea.id } })).toBe(0);

      expect(await setSupport(store, maya, input(true), NEXT_MINUTE)).toMatchObject({ ok: true });
      expect(await tx.support.count({ where: { userId: maya.user.id, ideaId: idea.id } })).toBe(1);
    });
  });
});
