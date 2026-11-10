import { expect, it } from "vitest";
import { describeWithDatabase } from "@/db/testing/database";
import { users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { bumpActionCount } from "./actionLimit";

// The abuse limit's counter against Postgres (#94), inside the seed's rolled-back transaction.
const MINUTE = new Date("2026-11-06T15:04:10.000Z");
const LATER_SAME_MINUTE = new Date("2026-11-06T15:04:50.000Z");
const NEXT_MINUTE = new Date("2026-11-06T15:05:01.000Z");

describeWithDatabase("action counter (#94)", () => {
  it("counts each change in the minute", async () => {
    await withSeed(async (tx) => {
      expect(await bumpActionCount(tx, users.student.id, MINUTE)).toBe(1);
      expect(await bumpActionCount(tx, users.student.id, LATER_SAME_MINUTE)).toBe(2);
      expect(await bumpActionCount(tx, users.secondStudent.id, MINUTE)).toBe(1);
    });
  });

  it("a new minute starts at 1 and trims the student's older rows", async () => {
    await withSeed(async (tx) => {
      await bumpActionCount(tx, users.student.id, MINUTE);
      await bumpActionCount(tx, users.secondStudent.id, MINUTE);
      expect(await bumpActionCount(tx, users.student.id, NEXT_MINUTE)).toBe(1);

      const mine = await tx.actionCount.findMany({ where: { userId: users.student.id } });
      expect(mine.map((row) => row.windowStart)).toEqual([new Date("2026-11-06T15:05:00.000Z")]);
      // Another student's rows are not touched by this student's trim.
      expect(await tx.actionCount.count({ where: { userId: users.secondStudent.id } })).toBe(1);
    });
  });
});
