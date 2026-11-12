import type { BoardCode } from "./boards";
import { can, canSeeWhoPosted, isAuthor, type Viewer } from "./permissions";
import { appStatus, type IdeaStatus, type StoredIdeaStatus } from "./statuses";
import type { ReviewDecision, ReviewStatus } from "./review";

// Viewer shapes (#53). One function decides what a viewer may see of an idea, and
// each shape is built field by field, never by spreading a row. So a field added to
// a select cannot reach a viewer by accident; it has to be named here.
//
// The row is what the selects in src/db/ideaSelects.ts return. Leader fields are
// optional because the student select does not read them; a missing one fails
// closed (no identity), never open.

export type IdeaRow = {
  id: string;
  number: number | null;
  title: string;
  description: string;
  fullText: string | null;
  category: string;
  boardId: BoardCode;
  location: string | null;
  scale: string | null;
  costBand: string | null;
  timeHorizon: string | null;
  status: StoredIdeaStatus | null;
  waitingReason: string | null;
  fromSga: boolean;
  isAnonymous: boolean;
  reviewStatus: ReviewStatus;
  submittedAt: Date;
  approvedAt: Date | null;
  statusChangedAt: Date | null;
  deliveredAt: Date | null;
  updatedAt: Date;
  // Read by every select. Only `displayName` is in the student shape.
  author: { id?: string; displayName: string; email?: string } | null;
  // Leader and author selects only.
  authorId?: string | null;
  supports?: { user: { id: string; displayName: string; email: string } }[];
  reviews?: { decision: ReviewDecision; reason: string | null }[];
};

// The fields every viewer gets. Nothing identifying the author or supporters.
export type StudentIdea = {
  id: string;
  number: number | null;
  title: string;
  description: string;
  fullText: string | null;
  category: string;
  boardId: BoardCode;
  location: string | null;
  scale: string | null;
  costBand: string | null;
  timeHorizon: string | null;
  status: IdeaStatus | null;
  waitingReason: string | null;
  fromSga: boolean;
  // Null for an anonymous post, always. The form says so (#53, data model).
  authorName: string | null;
  submittedAt: Date;
  approvedAt: Date | null;
  statusChangedAt: Date | null;
  deliveredAt: Date | null;
};

// The author's own post: the student fields, plus its review state and reason.
export type AuthorIdea = StudentIdea & {
  reviewStatus: ReviewStatus;
  isAnonymous: boolean;
  review: { decision: ReviewDecision; reason: string | null } | null;
};

export type Identity = { id: string; displayName: string; email: string };

// Leaders: the student fields, plus identity where the viewer's role allows it.
export type LeaderIdea = StudentIdea & {
  reviewStatus: ReviewStatus;
  isAnonymous: boolean;
  // Null when the viewer may not see who posted (an anonymous post, outside their role).
  author: Identity | null;
  // True when the post is anonymous and the viewer may not see who posted it.
  authorHidden: boolean;
  // Null when the viewer may not see supporters, or the row was read without them.
  supporters: Identity[] | null;
};

export type ViewerIdea =
  | { shape: "student"; idea: StudentIdea }
  | { shape: "author"; idea: AuthorIdea }
  | { shape: "leader"; idea: LeaderIdea };

// Returns null when the viewer may not see the idea at all. Never throws.
export function ideaForViewer(viewer: Viewer, row: IdeaRow): ViewerIdea | null {
  // A row read without authorId is never "my post": fails closed.
  if (isAuthor(viewer, { authorId: row.authorId ?? null })) {
    return { shape: "author", idea: authorShape(row) };
  }
  if (row.reviewStatus !== "approved") {
    // Pending, declined, and withdrawn posts are for reviewers only (#49, #53).
    return can(viewer, "review", row.boardId) ? { shape: "leader", idea: leaderShape(viewer, row) } : null;
  }
  if (can(viewer, "see_names", row.boardId)) {
    return { shape: "leader", idea: leaderShape(viewer, row) };
  }
  return { shape: "student", idea: studentShape(row) };
}

function studentShape(row: IdeaRow): StudentIdea {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    description: row.description,
    fullText: row.fullText,
    category: row.category,
    boardId: row.boardId,
    location: row.location,
    scale: row.scale,
    costBand: row.costBand,
    timeHorizon: row.timeHorizon,
    status: row.status === null ? null : appStatus(row.status),
    waitingReason: row.waitingReason,
    fromSga: row.fromSga,
    authorName: publicAuthorName(row),
    submittedAt: row.submittedAt,
    approvedAt: row.approvedAt,
    statusChangedAt: row.statusChangedAt,
    deliveredAt: row.deliveredAt,
  };
}

// Anonymous posts never show a name to students, including the author's own
// student-facing copy (#53).
function publicAuthorName(row: IdeaRow): string | null {
  return row.isAnonymous ? null : (row.author?.displayName ?? null);
}

function authorShape(row: IdeaRow): AuthorIdea {
  const latest = row.reviews?.[0];
  return {
    ...studentShape(row),
    reviewStatus: row.reviewStatus,
    isAnonymous: row.isAnonymous,
    review: latest ? { decision: latest.decision, reason: latest.reason } : null,
  };
}

function leaderShape(viewer: Viewer, row: IdeaRow): LeaderIdea {
  const mayPostId = canSeeWhoPosted(viewer, { boardId: row.boardId, isAnonymous: row.isAnonymous });
  const mayNames = can(viewer, "see_names", row.boardId);
  return {
    ...studentShape(row),
    reviewStatus: row.reviewStatus,
    isAnonymous: row.isAnonymous,
    author: mayPostId ? identityOf(row.author) : null,
    authorHidden: row.isAnonymous && !mayPostId,
    supporters:
      mayNames && row.supports
        ? allIdentities(row.supports.map((support) => identityOf(support.user)))
        : null,
  };
}

// A partial list is worse than none: a leader would read it as the full count. So
// one incomplete supporter drops the whole list.
function allIdentities(people: (Identity | null)[]): Identity[] | null {
  return people.every((person): person is Identity => person !== null) ? people : null;
}

// An identity needs all three fields. A partial row gives none, rather than a guess.
function identityOf(
  person:
    | { id?: string; displayName: string; email?: string }
    | { id: string; displayName: string; email: string }
    | null,
): Identity | null {
  if (!person || person.id === undefined || person.email === undefined) return null;
  return { id: person.id, displayName: person.displayName, email: person.email };
}
