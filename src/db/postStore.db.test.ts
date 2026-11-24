import { expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { submitPost } from "@/app/_post/submitPost";
import type { BoardCode } from "@/core/boards";
import { ideaForViewer } from "@/core/viewerShapes";
import { rolesFromPositions } from "@/core/positions";
import { resubmitPost } from "@/app/_post/ownPost";
import { withCommittedRows } from "@/db/testing/committed";
import { describeWithDatabase, getTestClient } from "@/db/testing/database";
import { buildIdea, buildRevision, buildUser, testUuid } from "@/db/testing/factories";
import { users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { prismaOwnPostStore } from "./ownPostStore";
import { prismaPostStore } from "./postStore";
import { studentIdeaSelect } from "./ideaSelects";
import { advisoryLockWaiters } from "./sql/advisoryLockWaiters";

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
  details:
    "Students who study on weekends want dinner until 8, and most of the dining hall is closed by 7 on Sundays.",
  category: "dining",
  anonymous: false,
  ...overrides,
});

// Two real transactions at once (#257), so these rows commit and are removed afterwards.
const RACER = testUuid(9300);
const racerSession: Session = {
  user: { id: RACER, email: "racer@example.com", name: "Race Test" },
  positions: [],
  roles: rolesFromPositions([]),
};
const TRANSACTION = { timeout: 30_000, maxWait: 30_000 };

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { opened, open };
}

// Waits until `other` has either finished or is blocked on an advisory lock, so the test
// lets the first transaction go only once the second has reached its decision point.
async function untilBlockedOrDone(other: Promise<unknown>) {
  let done = false;
  void other.then(
    () => (done = true),
    () => (done = true),
  );
  const deadline = Date.now() + 15_000;
  while (!done && (await advisoryLockWaiters(getTestClient())) === 0) {
    if (Date.now() > deadline) throw new Error("The second transaction neither finished nor waited");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// An author with two pending posts and one declined post, all committed.
function racerRows() {
  const pending = [
    buildIdea({ id: testUuid(9310), authorId: RACER }),
    buildIdea({ id: testUuid(9311), authorId: RACER }),
  ];
  const declined = buildIdea({ id: testUuid(9312), authorId: RACER, reviewStatus: "declined" });
  return { pending, declined };
}

describeWithDatabase("two posts at the pending limit (#257)", () => {
  it("lets one of two simultaneous posts through and refuses the other", async () => {
    const { pending } = racerRows();
    await withCommittedRows(
      { users: [buildUser({ id: RACER, email: racerSession.user.email })], ideas: pending },
      async (client) => {
        const atCreate = gate();
        const release = gate();
        const first = client.$transaction(async (tx) => {
          const store = prismaPostStore(tx);
          // Stops after the lock and the count, with the insert still to come.
          return submitPost(
            {
              ...store,
              create: async (author, newPost) => {
                atCreate.open();
                await release.opened;
                return store.create(author, newPost);
              },
            },
            racerSession,
            post({ title: "First of two posts at once" }),
            NOW,
          );
        }, TRANSACTION);
        await atCreate.opened;
        const second = client.$transaction(
          (tx) => submitPost(prismaPostStore(tx), racerSession, post({ title: "Second of two" }), NOW),
          TRANSACTION,
        );
        await untilBlockedOrDone(second);
        release.open();

        const results = await Promise.all([first, second]);
        expect(results.filter((result) => result.ok)).toHaveLength(1);
        expect(results.find((result) => !result.ok)).toEqual({
          ok: false,
          error: { code: "pending_limit", limit: 3 },
        });
        expect(await prismaPostStore(client).countPending(RACER)).toBe(3);
      },
    );
  });

  it("a post and a resubmit at once leave three pending, not four", async () => {
    const { pending, declined } = racerRows();
    await withCommittedRows(
      { users: [buildUser({ id: RACER, email: racerSession.user.email })], ideas: [...pending, declined] },
      async (client) => {
        await client.ideaRevision.create({ data: buildRevision(declined, { id: testUuid(9320) }) });
        const atCreate = gate();
        const release = gate();
        const posting = client.$transaction(async (tx) => {
          const store = prismaPostStore(tx);
          return submitPost(
            {
              ...store,
              create: async (author, newPost) => {
                atCreate.open();
                await release.opened;
                return store.create(author, newPost);
              },
            },
            racerSession,
            post({ title: "A new post at the same time" }),
            NOW,
          );
        }, TRANSACTION);
        await atCreate.opened;
        const resubmitting = client.$transaction(
          (tx) =>
            resubmitPost(
              prismaOwnPostStore(tx),
              racerSession,
              {
                ideaId: declined.id,
                title: "The declined post, edited",
                summary: "Open the campus lots to students at no cost in the evening.",
                details:
                  "The lots behind the library are full by 6 pm, so students who work late drive or walk farther. Open them to students in the evening.",
                category: "campus_planning",
              },
              NOW,
            ),
          TRANSACTION,
        );
        await untilBlockedOrDone(resubmitting);
        release.open();

        const [posted, resubmitted] = await Promise.all([posting, resubmitting]);
        expect([posted.ok, resubmitted.ok].filter(Boolean)).toHaveLength(1);
        expect(await prismaPostStore(client).countPending(RACER)).toBe(3);
      },
    );
  });
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

  // The post form shows this count (#96). Only the author's own pending posts count.
  it("counts only this author's pending posts: 0, then 2, then 3", async () => {
    const author = users.secondStudent.id;
    await withSeed(async (tx) => {
      const store = prismaPostStore(tx);
      // The seed gives this student an approved post; add one in every other state, and
      // pending posts for another student.
      await tx.idea.createMany({
        data: [
          buildIdea({ authorId: author, reviewStatus: "declined" }),
          buildIdea({ authorId: author, reviewStatus: "withdrawn" }),
          buildIdea({ authorId: users.student.id }),
          buildIdea({ authorId: users.student.id }),
        ],
      });
      expect(await store.countPending(author)).toBe(0);

      await tx.idea.createMany({
        data: [buildIdea({ authorId: author }), buildIdea({ authorId: author })],
      });
      expect(await store.countPending(author)).toBe(2);

      await tx.idea.create({ data: buildIdea({ authorId: author }) });
      expect(await store.countPending(author)).toBe(3);
    });
  });

  it("writes revision 1 with the submitted words, on the board for the category", async () => {
    await withSeed(async (tx) => {
      const result = await submitPost(
        prismaPostStore(tx),
        student,
        post({
          details:
            "More about it, with enough detail for a reviewer to judge the idea. Who it helps and what was tried before.",
        }),
        NOW,
      );
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
          fullText:
            "More about it, with enough detail for a reviewer to judge the idea. Who it helps and what was tried before.",
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
      // The student select reads no author, so the row has no name to drop (#257).
      const view = ideaForViewer(null, { ...row, boardId: row.boardId as BoardCode, author: null });
      expect(view?.shape).toBe("student");
      expect(JSON.stringify(view)).not.toContain(users.student.displayName);
      expect(JSON.stringify(view)).not.toContain(users.student.email);
    });
  });
});
