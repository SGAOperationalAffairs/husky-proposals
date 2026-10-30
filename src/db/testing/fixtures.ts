import { BOARD_CODES } from "@/core/boards";
import {
  buildApprovedIdea,
  buildBoard,
  buildIdea,
  buildSupport,
  buildUpdate,
  buildUser,
  FIXTURE_TIME,
  testUuid,
} from "./factories";

// Invented people and the prototype's sample ideas (#43). No real student data:
// every address is @example.com and every name is made up. T0.5's seed reads this.
// Built once at import, so ids are the same on every run.

export const boards = BOARD_CODES.map((code) => buildBoard(code));

export const users = {
  student: buildUser({ id: testUuid(1), email: "maya.test@example.com", displayName: "Maya Test" }),
  secondStudent: buildUser({ id: testUuid(2), email: "priya.test@example.com", displayName: "Priya Test" }),
  anonymousAuthor: buildUser({ id: testUuid(3), email: "chris.test@example.com", displayName: "Chris Test" }),
  dabChair: buildUser({
    id: testUuid(4),
    email: "dab.chair@example.com",
    displayName: "Dana Dining-Chair",
    positionsSeen: ["chair-of-dining-advisory-board"],
    positionsSeenAt: FIXTURE_TIME,
  }),
  vp: buildUser({
    id: testUuid(5),
    email: "campus.affairs.vp@example.com",
    displayName: "Vic Campus-Affairs",
    positionsSeen: ["vice-president-of-campus-affairs"],
    positionsSeenAt: FIXTURE_TIME,
  }),
};

const daysBefore = (days: number) => new Date(FIXTURE_TIME.getTime() - days * 24 * 60 * 60 * 1000);

export const ideas = {
  foodPantry: buildApprovedIdea({
    id: testUuid(101),
    number: 103,
    title: "A student-hosted food pantry",
    description:
      "A free, stigma-free place to pick up groceries and essentials, hosted by an existing campus office.",
    boardId: "DAB",
    authorId: users.student.id,
    scale: "large",
    costBand: "over_5k",
    timeHorizon: "within_a_year",
    status: "in_progress",
    approvedAt: daysBefore(62),
    statusChangedAt: daysBefore(14),
  }),
  lateNightDining: buildApprovedIdea({
    id: testUuid(102),
    number: 131,
    title: "A late-night dining option on weeknights",
    description: "Keep one dining location open later for students coming out of labs and libraries.",
    boardId: "DAB",
    authorId: users.anonymousAuthor.id,
    isAnonymous: true,
    scale: "medium",
    approvedAt: daysBefore(40),
  }),
  walkSignal: buildApprovedIdea({
    id: testUuid(103),
    number: 151,
    title: "A longer walk signal at the Huntington crossing",
    description: "Give people on foot enough time to cross when the street is busy.",
    boardId: "CPAB",
    authorId: users.secondStudent.id,
    scale: "small",
    approvedAt: daysBefore(22),
  }),
  compostBins: buildApprovedIdea({
    id: testUuid(104),
    number: 118,
    title: "Compost bins in every residence hall",
    description: "A labeled compost bin on each floor with a simple pickup schedule.",
    boardId: "GIB",
    authorId: users.student.id,
    scale: "medium",
    status: "delivered",
    approvedAt: daysBefore(120),
    statusChangedAt: daysBefore(14),
    deliveredAt: daysBefore(14),
  }),
  refillStations: buildApprovedIdea({
    id: testUuid(105),
    number: 140,
    title: "More refill stations in academic buildings",
    description: "Bottle refill stations on every floor of the busiest classroom buildings.",
    boardId: "SC",
    fromSga: true,
    scale: "small",
    status: "waiting",
    waitingReason: "Waiting on the university's facilities survey before we pick buildings.",
    approvedAt: daysBefore(30),
    statusChangedAt: daysBefore(5),
  }),
  printCredits: buildApprovedIdea({
    id: testUuid(106),
    number: 156,
    title: "More free print credits each semester",
    description: "Raise the free print allowance so course readings do not cost students extra.",
    boardId: "CSC",
    authorId: users.secondStudent.id,
    status: "under_review",
    approvedAt: daysBefore(10),
  }),
  pending: buildIdea({
    id: testUuid(107),
    title: "A quiet study room in every dining hall",
    description: "Set aside one corner for students who need silence while they eat and study.",
    boardId: "DAB",
    authorId: users.student.id,
  }),
  declined: buildIdea({
    id: testUuid(108),
    title: "Free parking for everyone",
    description: "Open all campus lots to students at no cost.",
    boardId: "CPAB",
    authorId: users.secondStudent.id,
    reviewStatus: "declined",
  }),
};

export const supports = [
  buildSupport({ userId: users.secondStudent.id, ideaId: ideas.foodPantry.id }),
  buildSupport({ userId: users.anonymousAuthor.id, ideaId: ideas.foodPantry.id }),
  buildSupport({ userId: users.student.id, ideaId: ideas.walkSignal.id }),
];

export const updates = {
  boardUpdate: buildUpdate({
    id: testUuid(201),
    ideaId: ideas.foodPantry.id,
    authorId: users.dabChair.id,
    kind: "board",
    body: "Began drafting the pilot plan with the host office.",
    createdAt: daysBefore(2),
  }),
  checkIn: buildUpdate({
    id: testUuid(202),
    ideaId: ideas.foodPantry.id,
    authorId: users.dabChair.id,
    kind: "check_in",
    body: "Still working, no news.",
    createdAt: daysBefore(9),
  }),
};
