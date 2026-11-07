import { expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { setFollow } from "@/app/_follow/setFollow";
import { rolesFromPositions } from "@/core/positions";
import { prismaFollowStore } from "./followStore";
import { describeWithDatabase } from "./testing/database";
import { ideas, users } from "./testing/fixtures";
import { withSeed } from "./testing/seededTransaction";

// Following against Postgres (#101), inside the seed's rolled-back transaction.
const priya: Session = {
  user: {
    id: users.secondStudent.id,
    email: users.secondStudent.email,
    name: users.secondStudent.displayName,
  },
  positions: [],
  roles: rolesFromPositions([]),
};
const where = { userId: priya.user.id, ideaId: ideas.foodPantry.id };

describeWithDatabase("follow store (#101)", () => {
  it("following twice leaves one follow row", async () => {
    await withSeed(async (tx) => {
      const store = prismaFollowStore(tx);
      const input = { ideaId: ideas.foodPantry.id, following: true };
      expect(await setFollow(store, priya, input)).toEqual({ ok: true, following: true });
      expect(await setFollow(store, priya, input)).toEqual({ ok: true, following: true });
      expect(await tx.follow.count({ where })).toBe(1);
    });
  });

  it("unfollow removes the row, and unfollowing again is fine", async () => {
    await withSeed(async (tx) => {
      const store = prismaFollowStore(tx);
      await setFollow(store, priya, { ideaId: ideas.foodPantry.id, following: true });
      const off = { ideaId: ideas.foodPantry.id, following: false };
      expect(await setFollow(store, priya, off)).toEqual({ ok: true, following: false });
      expect(await tx.follow.count({ where })).toBe(0);
      expect(await setFollow(store, priya, off)).toEqual({ ok: true, following: false });
    });
  });

  it("a pending idea gives not_found and writes nothing", async () => {
    await withSeed(async (tx) => {
      const result = await setFollow(prismaFollowStore(tx), priya, {
        ideaId: ideas.pending.id,
        following: true,
      });
      expect(result).toEqual({ ok: false, error: { code: "not_found" } });
      expect(await tx.follow.count({ where: { userId: priya.user.id, ideaId: ideas.pending.id } })).toBe(0);
    });
  });

  it("copies a user who has never been seen from the session", async () => {
    await withSeed(async (tx) => {
      const stranger: Session = {
        ...priya,
        user: {
          id: "00000000-0000-4000-8000-0000000000f1",
          email: "new.student@example.com",
          name: "New Student",
        },
      };
      await setFollow(prismaFollowStore(tx), stranger, { ideaId: ideas.foodPantry.id, following: true });
      expect(await tx.user.findUniqueOrThrow({ where: { id: stranger.user.id } })).toMatchObject({
        email: "new.student@example.com",
      });
    });
  });
});
