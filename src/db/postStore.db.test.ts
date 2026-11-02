import { expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { submitPost } from "@/app/_post/submitPost";
import type { BoardCode } from "@/core/boards";
import { ideaForViewer } from "@/core/viewerShapes";
import { rolesFromPositions } from "@/core/positions";
import { describeWithDatabase } from "@/db/testing/database";
import { users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { prismaPostStore } from "./postStore";
import { studentIdeaSelect } from "./ideaSelects";

// Posting an idea against Postgres (#54), inside the seed's rolled-back transaction.
const NOW = new Date();
const student: Session = {
  user: { id: users.student.id, email: users.student.email, name: users.student.displayName },
  positions: [],
  roles: rolesFromPositions([]),
};
const post = (overrides: Record<string, unknown> = {}) => ({
  title: "Later dining hours on Sundays",
  summary: "The dining hall closes at 7 on Sundays, after most people finish class.",
  category: "dining",
  anonymous: false,
  ...overrides,
});

describeWithDatabase("posting an idea (#54)", () => {
  it("counts a student's pending posts, and refuses a fourth", async () => {
    // The second student has no pending post in the seed; the first has one.
    const fresh: Session = {
      user: {
        id: users.secondStudent.id,
        email: users.secondStudent.email,
        name: users.secondStudent.displayName,
      },
      positions: [],
      roles: rolesFromPositions([]),
    };
    await withSeed(async (tx) => {
      const store = prismaPostStore(tx);
      for (let i = 0; i < 3; i += 1) {
        expect(
          (await submitPost(store, fresh, post({ title: `Idea ${i} about dining hours` }), NOW)).ok,
        ).toBe(true);
      }
      expect(await store.countPending(fresh.user.id)).toBe(3);
      const fourth = await submitPost(store, fresh, post({ title: "A fourth idea" }), NOW);
      expect(fourth).toEqual({ ok: false, error: { code: "pending_limit", limit: 3 } });
    });
  });

  it("writes revision 1 with the submitted words, on the board for the category", async () => {
    await withSeed(async (tx) => {
      const result = await submitPost(prismaPostStore(tx), student, post({ details: "More about it." }), NOW);
      if (!result.ok) throw new Error("expected the post to be saved");
      const idea = await tx.idea.findUniqueOrThrow({
        where: { id: result.id },
        select: { reviewStatus: true, status: true, boardId: true, revisions: true },
      });
      expect(idea).toMatchObject({ reviewStatus: "pending", status: null, boardId: "DAB" });
      expect(idea.revisions).toEqual([
        expect.objectContaining({
          version: 1,
          title: "Later dining hours on Sundays",
          fullText: "More about it.",
        }),
      ]);
    });
  });

  it("an anonymous post shows no author name to a student once it is approved", async () => {
    await withSeed(async (tx) => {
      const result = await submitPost(prismaPostStore(tx), student, post({ anonymous: true }), NOW);
      if (!result.ok) throw new Error("expected the post to be saved");
      await tx.idea.update({
        where: { id: result.id },
        data: { reviewStatus: "approved", status: "collecting_support", approvedAt: NOW },
      });
      const row = await tx.idea.findUniqueOrThrow({ where: { id: result.id }, select: studentIdeaSelect });
      // Prisma types boardId as a string; the seed and the post rules only write board codes.
      const view = ideaForViewer(null, { ...row, boardId: row.boardId as BoardCode });
      expect(view?.shape).toBe("student");
      expect(JSON.stringify(view)).not.toContain(users.student.displayName);
      expect(JSON.stringify(view)).not.toContain(users.student.email);
    });
  });
});
