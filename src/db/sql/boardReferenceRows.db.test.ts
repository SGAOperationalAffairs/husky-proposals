import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { BOARDS, BOARD_CODES } from "@/core/boards";
import { BOARD_POSITIONS } from "@/core/positions";
import { categoryForBoard } from "@/core/postIdea";
import { Prisma } from "@/generated/prisma/client";
import { describeWithDatabase, getTestClient, withRollback } from "@/db/testing/database";

// The board rows are reference data every environment needs (#219). The migration
// inserts them idempotently; the seed stays local and test only.

const IDENTITY = {
  id: true,
  name: true,
  category: true,
  chairPositionKey: true,
  memberPositionKey: true,
} satisfies Prisma.BoardSelect;

const expectedRows = BOARD_CODES.map((code) => ({
  id: code,
  name: BOARDS[code].name,
  category: categoryForBoard(code),
  chairPositionKey: BOARD_POSITIONS[code].lead,
  memberPositionKey: BOARD_POSITIONS[code].member,
})).sort((a, b) => a.id.localeCompare(b.id));

function migrationSql(): string {
  const dir = readdirSync(join(process.cwd(), "prisma/migrations")).find((name) =>
    name.endsWith("_board_reference_rows"),
  );
  if (!dir) throw new Error("The board_reference_rows migration does not exist");
  return readFileSync(join(process.cwd(), "prisma/migrations", dir, "migration.sql"), "utf8");
}

describeWithDatabase("board reference rows migration (#219)", () => {
  // globalSetup creates each run database empty and runs `prisma migrate deploy`, so the
  // committed state is the migration run on an empty table. It is read here instead of
  // deleting rows, because a DELETE FROM boards in a transaction would lock rows that other
  // database tests reference.
  it("an empty database ends up with the five boards and the schema defaults", async () => {
    const db = getTestClient();
    expect(await db.board.findMany({ select: IDENTITY, orderBy: { id: "asc" } })).toEqual(expectedRows);
    const defaults = await db.board.findMany({
      select: {
        reviewDueDays: true,
        updateCadenceDays: true,
        inProgressGuideline: true,
        joinMeets: true,
        joinCommitment: true,
        joinHowToApply: true,
      },
    });
    for (const row of defaults) {
      expect(row).toEqual({
        reviewDueDays: 3,
        updateCadenceDays: 30,
        inProgressGuideline: 2,
        joinMeets: null,
        joinCommitment: null,
        joinHowToApply: null,
      });
    }
  });

  it("a second run changes nothing", async () => {
    await withRollback(async (tx) => {
      await tx.$executeRaw`${Prisma.raw(migrationSql())}`;
      expect(await tx.board.count()).toBe(5);
      expect(await tx.board.findMany({ select: IDENTITY, orderBy: { id: "asc" } })).toEqual(expectedRows);
    });
  });

  it("rows a board has edited are left alone (the production case)", async () => {
    await withRollback(async (tx) => {
      await tx.board.update({ where: { id: "DAB" }, data: { name: "Edited", reviewDueDays: 7 } });
      await tx.$executeRaw`${Prisma.raw(migrationSql())}`;
      const dab = await tx.board.findUniqueOrThrow({
        where: { id: "DAB" },
        select: { name: true, reviewDueDays: true },
      });
      expect(dab).toEqual({ name: "Edited", reviewDueDays: 7 });
    });
  });
});
