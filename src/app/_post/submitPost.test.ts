import { describe, expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { BOARD_POSITIONS, rolesFromPositions } from "@/core/positions";
import { submitPost, type NewPost, type PostStore } from "./submitPost";

// Posting an idea (#54). The store is a fake here; the Prisma store has its own
// database test. Every rule that decides a post's shape is checked on what the store
// receives.

const STUDENT: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000a1", email: "maya@example.com", name: "Maya Test" },
  positions: [],
  roles: rolesFromPositions([]),
};

const DAB_CHAIR: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000a2", email: "dab.chair@example.com", name: "Dana Chair" },
  positions: [{ key: BOARD_POSITIONS.DAB.lead, name: "Chair" }],
  roles: rolesFromPositions([BOARD_POSITIONS.DAB.lead]),
};

const valid = {
  title: "Later dining hours on Sundays",
  summary: "The dining hall closes at 7 on Sundays, after most people finish class.",
  category: "dining",
  anonymous: false,
};

function fakeStore(pendingNow = 0) {
  const created: { author: { id: string }; post: NewPost }[] = [];
  const store: PostStore = {
    countPending: async () => pendingNow,
    create: async (author, post) => {
      created.push({ author, post });
      return { id: `idea-${created.length}` };
    },
  };
  return { store, created };
}

const NOW = new Date("2026-11-02T15:00:00Z");

describe("submitPost (#54)", () => {
  it("refuses a signed-out visitor and writes nothing", async () => {
    const { store, created } = fakeStore();
    const result = await submitPost(store, null, valid, NOW);
    expect(result).toEqual({ ok: false, error: { code: "signed_out" } });
    expect(created).toHaveLength(0);
  });

  it("refuses an invalid post and names the fields", async () => {
    const { store, created } = fakeStore();
    const result = await submitPost(store, STUDENT, { ...valid, title: "" }, NOW);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid", fields: expect.arrayContaining(["title"]) },
    });
    expect(created).toHaveLength(0);
  });

  it("stores a new post as pending, on the board for its category, with revision 1", async () => {
    const { store, created } = fakeStore();
    const result = await submitPost(store, STUDENT, valid, NOW);
    expect(result).toEqual({ ok: true, id: "idea-1" });
    const { post, author } = created[0]!;
    expect(author.id).toBe(STUDENT.user.id);
    expect(post).toMatchObject({
      title: valid.title,
      description: valid.summary,
      category: "dining",
      boardId: "DAB",
      reviewStatus: "pending",
      authorId: STUDENT.user.id,
      isAnonymous: false,
      submittedAt: NOW,
      revision: { version: 1, title: valid.title, description: valid.summary, isAnonymous: false },
    });
    expect(post).not.toHaveProperty("status");
  });

  it("keeps the long text, and leaves the Not sure fields null", async () => {
    const { store, created } = fakeStore();
    await submitPost(store, STUDENT, { ...valid, details: "More about the idea." }, NOW);
    expect(created[0]!.post).toMatchObject({ fullText: "More about the idea.", location: null, scale: null });
  });

  it("refuses a fourth pending post with a clear reason", async () => {
    const { store, created } = fakeStore(3);
    const result = await submitPost(store, STUDENT, valid, NOW);
    expect(result).toEqual({ ok: false, error: { code: "pending_limit", limit: 3 } });
    expect(created).toHaveLength(0);
  });

  it("allows a third pending post", async () => {
    const { store } = fakeStore(2);
    expect((await submitPost(store, STUDENT, valid, NOW)).ok).toBe(true);
  });

  it("an anonymous post carries the flag, and the result names no author", async () => {
    const { store, created } = fakeStore();
    const result = await submitPost(store, STUDENT, { ...valid, anonymous: true }, NOW);
    expect(created[0]!.post).toMatchObject({ isAnonymous: true, revision: { isAnonymous: true } });
    expect(JSON.stringify(result)).not.toContain(STUDENT.user.name);
    expect(JSON.stringify(result)).not.toContain(STUDENT.user.email);
  });

  it("sets From SGA for a board chair, and not for a student", async () => {
    const chair = fakeStore();
    await submitPost(chair.store, DAB_CHAIR, valid, NOW);
    expect(chair.created[0]!.post.fromSga).toBe(true);

    const student = fakeStore();
    await submitPost(student.store, STUDENT, valid, NOW);
    expect(student.created[0]!.post.fromSga).toBe(false);
  });
});
