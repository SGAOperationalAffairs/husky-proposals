import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { FIXTURE_TIME } from "./testing/factories";
import {
  boards,
  follows,
  ideas,
  participations,
  reviews,
  revisions,
  supports,
  updates,
  users,
} from "./testing/fixtures";

// The development seed (#44): invented ideas, people, and activity, written with the
// fixtures #43 built. Idempotent: a rerun adds nothing. Only local and test may run it,
// so invented data never reaches a deployed site.

const SEEDABLE_ENVS = ["local", "test"] as const;

export function assertSeedable(appEnv: string | undefined): void {
  if (!appEnv || !(SEEDABLE_ENVS as readonly string[]).includes(appEnv)) {
    throw new Error(
      `The seed runs only when APP_ENV is local or test, not ${appEnv ?? "unset"}. It writes invented data (#44).`,
    );
  }
}

type Row = Record<string, unknown>;

// Every Date moves by the same offset, so "two days ago" stays two days ago on any run.
function shift<T extends Row>(row: T, offsetMs: number): T {
  const moved: Row = { ...row };
  for (const [key, value] of Object.entries(moved)) {
    if (value instanceof Date) moved[key] = new Date(value.getTime() + offsetMs);
  }
  return moved as T;
}

// The rows to write, in foreign-key order, with dates relative to `now`.
export function seedRows(now: Date) {
  const offset = now.getTime() - FIXTURE_TIME.getTime();
  const all = <T extends Row>(rows: readonly T[]) => rows.map((row) => shift(row, offset));
  return {
    boards: all(boards),
    users: all(Object.values(users)),
    ideas: all(Object.values(ideas)),
    revisions: all(revisions),
    reviews: all(reviews),
    supports: all(supports),
    participations: all(participations),
    follows: all(follows),
    updates: all(Object.values(updates)),
  };
}

type Db = Pick<
  PrismaClient,
  "board" | "user" | "idea" | "ideaRevision" | "review" | "support" | "participation" | "follow" | "update"
>;

// One query per table. createMany with skipDuplicates makes a rerun a no-op.
export async function seed(db: Db, options: { now: Date }): Promise<void> {
  const rows = seedRows(options.now);
  const skip = { skipDuplicates: true } as const;
  await db.board.createMany({ data: rows.boards as Prisma.BoardCreateManyInput[], ...skip });
  await db.user.createMany({ data: rows.users as Prisma.UserCreateManyInput[], ...skip });
  await db.idea.createMany({ data: rows.ideas as Prisma.IdeaCreateManyInput[], ...skip });
  await db.ideaRevision.createMany({ data: rows.revisions as Prisma.IdeaRevisionCreateManyInput[], ...skip });
  await db.review.createMany({ data: rows.reviews as Prisma.ReviewCreateManyInput[], ...skip });
  await db.support.createMany({ data: rows.supports as Prisma.SupportCreateManyInput[], ...skip });
  await db.participation.createMany({
    data: rows.participations as Prisma.ParticipationCreateManyInput[],
    ...skip,
  });
  await db.follow.createMany({ data: rows.follows as Prisma.FollowCreateManyInput[], ...skip });
  await db.update.createMany({ data: rows.updates as Prisma.UpdateCreateManyInput[], ...skip });
}
