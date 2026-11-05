import { expect, it } from "vitest";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";
import type { Viewer } from "@/core/permissions";
import { describeWithDatabase } from "@/db/testing/database";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { leaderIdeaByNumber } from "./leaderIdea";

// The idea page's leader read (#59), inside the seed's rolled-back transaction.
const viewerFor = (id: string, positions: string[]): Viewer => ({
  user: { id },
  roles: rolesFromPositions(positions),
});
const dabChair = viewerFor(users.dabChair.id, [BOARD_POSITIONS.DAB.lead]);
const vp = viewerFor(users.vp.id, [VP_CAMPUS_AFFAIRS]);
const student = viewerFor(users.secondStudent.id, []);

describeWithDatabase("the leader read for an idea page (#59)", () => {
  it("gives the DAB chair the poster and a take-down on a DAB idea", async () => {
    await withSeed(async (tx) => {
      const result = await leaderIdeaByNumber(tx, dabChair, ideas.foodPantry.number!);
      expect(result?.mayTakeDown).toBe(true);
      expect(result?.idea.author?.id).toBe(users.student.id);
      // Supporter names stay with #100 and #129.
      expect(result?.idea.supporters).toBeNull();
    });
  });

  it("shows the DAB chair the author of an anonymous DAB idea", async () => {
    await withSeed(async (tx) => {
      const result = await leaderIdeaByNumber(tx, dabChair, ideas.lateNightDining.number!);
      expect(result?.idea.author?.id).toBe(users.anonymousAuthor.id);
      expect(result?.idea.authorHidden).toBe(false);
    });
  });

  it("gives the DAB chair nothing on another board's idea (D16 option A)", async () => {
    await withSeed(async (tx) => {
      expect(await leaderIdeaByNumber(tx, dabChair, ideas.walkSignal.number!)).toBeNull();
    });
  });

  it("gives the VP every board", async () => {
    await withSeed(async (tx) => {
      const result = await leaderIdeaByNumber(tx, vp, ideas.walkSignal.number!);
      expect(result?.mayTakeDown).toBe(true);
      expect(result?.idea.author?.id).toBe(users.secondStudent.id);
    });
  });

  it("gives a student and a visitor nothing", async () => {
    await withSeed(async (tx) => {
      expect(await leaderIdeaByNumber(tx, student, ideas.foodPantry.number!)).toBeNull();
      expect(await leaderIdeaByNumber(tx, null, ideas.foodPantry.number!)).toBeNull();
    });
  });

  it("finds nothing for a number no approved idea has", async () => {
    await withSeed(async (tx) => {
      // A pending post has no number, so no number can reach it.
      expect(await leaderIdeaByNumber(tx, vp, 99999)).toBeNull();
    });
  });
});
