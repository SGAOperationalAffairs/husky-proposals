import { expect, it } from "vitest";
import { describeWithDatabase } from "@/db/testing/database";
import { withSeed } from "@/db/testing/seededTransaction";
import { prismaBoardSettingsStore } from "./boardSettingsStore";

describeWithDatabase("board settings (#58)", () => {
  it("setting DAB to 7 days reads back 7 and leaves the other boards at 3", async () => {
    await withSeed(async (tx) => {
      await prismaBoardSettingsStore(tx).setReviewDueDays("DAB", 7);
      const boards = await tx.board.findMany({ select: { id: true, reviewDueDays: true } });
      expect(Object.fromEntries(boards.map((b) => [b.id, b.reviewDueDays]))).toEqual({
        DAB: 7,
        CPAB: 3,
        CSC: 3,
        GIB: 3,
        SC: 3,
      });
    });
  });

  it("a direct write of 0 is refused by the check constraint", async () => {
    await expect(withSeed((tx) => prismaBoardSettingsStore(tx).setReviewDueDays("DAB", 0))).rejects.toThrow(
      /boards_review_due_days_range/,
    );
  });
});
