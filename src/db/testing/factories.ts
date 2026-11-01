import type { BoardCode } from "@/core/boards";
import { BOARDS } from "@/core/boards";
import type { IdeaCategory, Prisma } from "@/generated/prisma/client";

// Plain builders, no database access (#43). Each returns a Prisma create input
// (`satisfies`), so a schema change breaks the build instead of a test at runtime.
// Insert helpers and their database tests arrive with T0.5, once tables exist.

// The fake clock's default start, so default timestamps agree with a default fake clock.
export const FIXTURE_TIME = new Date("2026-11-02T14:00:00.000Z");

// Each board's category, and its position keys from docs/sgauth-integration.md.
// T0.6 owns the real position mapping; replace this copy when it lands.
const BOARD_DETAILS: Record<BoardCode, { category: IdeaCategory; chair: string; member: string }> = {
  DAB: {
    category: "dining",
    chair: "chair-of-dining-advisory-board",
    member: "dining-advisory-board-member",
  },
  CPAB: {
    category: "campus_planning",
    chair: "chair-of-campus-planning-advisory-board",
    member: "campus-planning-advisory-board-member",
  },
  CSC: {
    category: "campus_services",
    chair: "director-of-campus-services",
    member: "campus-services-committee-member",
  },
  GIB: {
    category: "green_initiatives",
    chair: "director-of-green-initiatives",
    member: "green-initiatives-board-member",
  },
  SC: {
    category: "sustainability",
    chair: "director-of-sustainability",
    member: "sustainability-committee-member",
  },
};

let counter = 0;
let approvedNumber = 100; // public numbers start at 101, like the prototype's sample ideas

export function resetFactories(): void {
  counter = 0;
  approvedNumber = 100;
}

function next(): number {
  counter += 1;
  return counter;
}

// A deterministic, valid UUID, so a failure reads the same on every run.
export function testUuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export function buildBoard(
  code: BoardCode,
  overrides: Partial<Prisma.BoardUncheckedCreateInput> = {},
): Prisma.BoardUncheckedCreateInput {
  const details = BOARD_DETAILS[code];
  return {
    id: code,
    name: BOARDS[code].name,
    category: details.category,
    chairPositionKey: details.chair,
    memberPositionKey: details.member,
    ...overrides,
  } satisfies Prisma.BoardUncheckedCreateInput;
}

export function buildUser(
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
): Prisma.UserUncheckedCreateInput & { id: string } {
  const n = next();
  return {
    id: testUuid(n),
    email: `student${n}@example.com`, // example.com is reserved (RFC 2606), so no real address
    displayName: `Test Student ${n}`,
    createdAt: FIXTURE_TIME,
    lastSeenAt: FIXTURE_TIME,
    ...overrides,
  } satisfies Prisma.UserUncheckedCreateInput;
}

// A new post: pending, with no idea status, as the schema's rules require.
export function buildIdea(
  overrides: Partial<Prisma.IdeaUncheckedCreateInput> = {},
): Prisma.IdeaUncheckedCreateInput & { id: string } {
  const n = next();
  const boardId = overrides.boardId ?? "DAB";
  const idea = {
    id: testUuid(1000 + n),
    title: `Test idea ${n}`,
    description: `A short summary of test idea ${n}.`,
    category: BOARD_DETAILS[boardId as BoardCode]?.category ?? "dining",
    boardId,
    reviewStatus: "pending",
    status: null,
    createdAt: FIXTURE_TIME,
    submittedAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME, // @updatedAt columns are set explicitly (build-plan T0.5)
    ...overrides,
  } satisfies Prisma.IdeaUncheckedCreateInput;
  if (idea.status === "waiting" && !idea.waitingReason) {
    throw new Error("A waiting idea needs a waitingReason (schema rule)");
  }
  return idea;
}

export function buildApprovedIdea(
  overrides: Partial<Prisma.IdeaUncheckedCreateInput> = {},
): Prisma.IdeaUncheckedCreateInput & { id: string } {
  approvedNumber += 1;
  return buildIdea({
    reviewStatus: "approved",
    status: "collecting_support",
    number: approvedNumber,
    approvedAt: FIXTURE_TIME,
    statusChangedAt: FIXTURE_TIME,
    ...overrides,
  });
}

export function buildSupport(
  overrides: Pick<Prisma.SupportUncheckedCreateInput, "userId" | "ideaId"> &
    Partial<Prisma.SupportUncheckedCreateInput>,
): Prisma.SupportUncheckedCreateInput {
  return { createdAt: FIXTURE_TIME, ...overrides } satisfies Prisma.SupportUncheckedCreateInput;
}

export function buildUpdate(
  overrides: Pick<Prisma.UpdateUncheckedCreateInput, "ideaId"> & Partial<Prisma.UpdateUncheckedCreateInput>,
): Prisma.UpdateUncheckedCreateInput & { id: string } {
  const n = next();
  return {
    id: testUuid(2000 + n),
    kind: "board",
    body: `Test update ${n}.`,
    createdAt: FIXTURE_TIME,
    ...overrides,
  } satisfies Prisma.UpdateUncheckedCreateInput;
}
