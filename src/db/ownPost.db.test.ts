import { expect, it } from "vitest";
import type { Viewer } from "@/core/permissions";
import { VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";
import { describeWithDatabase } from "@/db/testing/database";
import { withCountedSeed } from "@/db/testing/countQueries";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { ownPostById } from "./ownPost";

// The edit page's read of the author's own post (#128), inside the seed's rolled-back
// transaction. The seed's declined post is by the second student.
const viewerFor = (id: string, positions: string[] = []): Viewer => ({
  user: { id },
  roles: rolesFromPositions(positions),
});
const author = viewerFor(users.secondStudent.id);
const otherStudent = viewerFor(users.student.id);
const vp = viewerFor(users.vp.id, [VP_CAMPUS_AFFAIRS]);

describeWithDatabase("the author's read of their own post (#128)", () => {
  it("gives the author the author shape with the decline reason", async () => {
    await withSeed(async (tx) => {
      const idea = await ownPostById(tx, author, ideas.declined.id);
      expect(idea?.id).toBe(ideas.declined.id);
      expect(idea?.reviewStatus).toBe("declined");
      expect(idea?.review).toEqual({
        kind: "review",
        decision: "declined",
        reason: "This repeats an open idea. Support that one instead.",
      });
    });
  });

  it("does not carry the reviewer's identity", async () => {
    await withSeed(async (tx) => {
      const json = JSON.stringify(await ownPostById(tx, author, ideas.declined.id));
      expect(json).not.toContain(users.vp.id);
      expect(json).not.toContain(users.vp.email);
    });
  });

  it("gives another student nothing, and the VP nothing on someone else's post", async () => {
    await withSeed(async (tx) => {
      expect(await ownPostById(tx, otherStudent, ideas.declined.id)).toBeNull();
      expect(await ownPostById(tx, vp, ideas.declined.id)).toBeNull();
      expect(await ownPostById(tx, null, ideas.declined.id)).toBeNull();
    });
  });

  it("gives nothing for a missing id, and runs no query for a malformed one", async () => {
    await withCountedSeed(async (tx, queries) => {
      expect(await ownPostById(tx, author, "not-a-uuid")).toBeNull();
      expect(queries.count).toBe(0);
      expect(await ownPostById(tx, author, "00000000-0000-4000-8000-000000000000")).toBeNull();
    });
  });

  it("is one query", async () => {
    await withCountedSeed(async (tx, queries) => {
      await ownPostById(tx, author, ideas.declined.id);
      expect(queries.count).toBe(1);
    });
  });
});
