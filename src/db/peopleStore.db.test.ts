import { expect, it } from "vitest";
import { describeWithDatabase } from "@/db/testing/database";
import { buildParticipation, FIXTURE_TIME } from "@/db/testing/factories";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { listPeople, prismaContactStore } from "./peopleStore";

// The People list's data (#129, #238), inside the seed's rolled-back transaction. The seed has
// one participation, on the approved DAB idea.
describeWithDatabase("the People list (#129)", () => {
  it("lists only approved ideas on the boards it is given", async () => {
    await withSeed(async (tx) => {
      await tx.participation.createMany({
        data: [
          // A pending post has no number and is not public, so it must stay off the list.
          buildParticipation({ userId: users.student.id, ideaId: ideas.pending.id }),
          buildParticipation({ userId: users.student.id, ideaId: ideas.walkSignal.id }),
        ],
      });

      const dab = await listPeople(tx, ["DAB"]);
      expect(dab.map((r) => r.ideaId)).toEqual([ideas.foodPantry.id]);
      expect(dab.every((r) => r.board === "DAB")).toBe(true);

      const both = await listPeople(tx, ["DAB", "CPAB"]);
      expect(both.map((r) => r.ideaId).sort()).toEqual([ideas.foodPantry.id, ideas.walkSignal.id].sort());
    });
  });

  it("reads nothing when the viewer may see no board", async () => {
    await withSeed(async (tx) => {
      expect(await listPeople(tx, [])).toEqual([]);
    });
  });

  it("finds the board of a participation, and null for a pair that does not exist", async () => {
    await withSeed(async (tx) => {
      const store = prismaContactStore(tx);
      expect(await store.findParticipation(users.secondStudent.id, ideas.foodPantry.id)).toEqual({
        boardId: "DAB",
      });
      expect(await store.findParticipation(users.student.id, ideas.foodPantry.id)).toBeNull();
    });
  });

  it("clears the contact date only when a row goes back to To contact", async () => {
    await withSeed(async (tx) => {
      const store = prismaContactStore(tx);
      const where = {
        userId_ideaId: { userId: users.secondStudent.id, ideaId: ideas.foodPantry.id },
      };
      await tx.participation.update({
        where,
        data: { contactStatus: "contacted", contactedAt: FIXTURE_TIME },
      });

      await store.setStatus(users.secondStudent.id, ideas.foodPantry.id, "joined");
      expect((await tx.participation.findUniqueOrThrow({ where })).contactedAt).toEqual(FIXTURE_TIME);

      await store.setStatus(users.secondStudent.id, ideas.foodPantry.id, "new");
      const back = await tx.participation.findUniqueOrThrow({ where });
      expect(back.contactStatus).toBe("new");
      expect(back.contactedAt).toBeNull();
    });
  });
});
