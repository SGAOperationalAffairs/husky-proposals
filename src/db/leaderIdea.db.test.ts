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
// Neither is the author of any fixture idea, so only roles decide what they see (#100).
const execBoard = viewerFor(users.dabChair.id, ["executive-vice-president"]);
const execDabChair = viewerFor(users.dabChair.id, ["speaker-of-the-senate", BOARD_POSITIONS.DAB.lead]);

// Sorted, since the fixture's supports share one timestamp. The select's order is
// pinned in ideaSelects.test.ts.
const supporterIds = (result: Awaited<ReturnType<typeof leaderIdeaByNumber>>) =>
  result?.idea.supporters?.map((s) => s.id).sort();

describeWithDatabase("the leader read for an idea page (#59)", () => {
  it("gives the DAB chair the poster and a take-down on a DAB idea", async () => {
    await withSeed(async (tx) => {
      const result = await leaderIdeaByNumber(tx, dabChair, ideas.foodPantry.number!);
      expect(result?.mayTakeDown).toBe(true);
      expect(result?.idea.author?.id).toBe(users.student.id);
      expect(supporterIds(result)).toEqual([users.secondStudent.id, users.anonymousAuthor.id].sort());
    });
  });

  it("gives the VP the one supporter of a CPAB idea (#100)", async () => {
    await withSeed(async (tx) => {
      const result = await leaderIdeaByNumber(tx, vp, ideas.walkSignal.number!);
      expect(supporterIds(result)).toEqual([users.student.id]);
    });
  });

  it("gives an Executive Board viewer the names, with no actions (#100)", async () => {
    await withSeed(async (tx) => {
      const result = await leaderIdeaByNumber(tx, execBoard, ideas.foodPantry.number!);
      expect(result?.idea.author?.id).toBe(users.student.id);
      expect(supporterIds(result)).toEqual([users.secondStudent.id, users.anonymousAuthor.id].sort());
      expect(result?.mayTakeDown).toBe(false);
      expect(result?.mayManageStatus).toBe(false);
    });
  });

  it("hides an anonymous author from the Executive Board and gives an empty supporter list (#100)", async () => {
    await withSeed(async (tx) => {
      const result = await leaderIdeaByNumber(tx, execBoard, ideas.lateNightDining.number!);
      expect(result?.idea.authorHidden).toBe(true);
      expect(result?.idea.author).toBeNull();
      expect(result?.idea.supporters).toEqual([]);
    });
  });

  it("gives an Executive Board member who chairs DAB the union (#100)", async () => {
    await withSeed(async (tx) => {
      // Not DAB: names only, where a plain DAB chair gets nothing.
      const cpab = await leaderIdeaByNumber(tx, execDabChair, ideas.walkSignal.number!);
      expect(supporterIds(cpab)).toEqual([users.student.id]);
      expect(cpab?.mayTakeDown).toBe(false);
      expect(cpab?.mayManageStatus).toBe(false);

      const dab = await leaderIdeaByNumber(tx, execDabChair, ideas.foodPantry.number!);
      expect(supporterIds(dab)).toEqual([users.secondStudent.id, users.anonymousAuthor.id].sort());
      expect(dab?.mayTakeDown).toBe(true);
      expect(dab?.mayManageStatus).toBe(true);

      const anonymous = await leaderIdeaByNumber(tx, execDabChair, ideas.lateNightDining.number!);
      expect(anonymous?.idea.author?.id).toBe(users.anonymousAuthor.id);
    });
  });

  it("gives a student no supporters (#100)", async () => {
    await withSeed(async (tx) => {
      expect(await leaderIdeaByNumber(tx, student, ideas.foodPantry.number!)).toBeNull();
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

  it("lets the DAB chair manage status on a DAB idea only, and the VP on any board (#98)", async () => {
    await withSeed(async (tx) => {
      expect((await leaderIdeaByNumber(tx, dabChair, ideas.foodPantry.number!))?.mayManageStatus).toBe(true);
      // Another board's idea gives the chair no leader view at all (D16 option A).
      expect(await leaderIdeaByNumber(tx, dabChair, ideas.printCredits.number!)).toBeNull();
      for (const idea of [ideas.foodPantry, ideas.walkSignal, ideas.printCredits]) {
        expect((await leaderIdeaByNumber(tx, vp, idea.number!))?.mayManageStatus, idea.title).toBe(true);
      }
    });
  });

  it("returns the idea's board update schedule (#131)", async () => {
    await withSeed(async (tx) => {
      const result = await leaderIdeaByNumber(tx, dabChair, ideas.foodPantry.number!);
      expect(result?.cadenceDays).toBeGreaterThan(0);
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
