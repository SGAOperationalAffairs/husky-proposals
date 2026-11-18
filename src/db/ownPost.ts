import { z } from "zod";
import type { BoardCode } from "@/core/boards";
import type { Viewer } from "@/core/permissions";
import { ideaForViewer, type AuthorIdea } from "@/core/viewerShapes";
import type { Prisma } from "@/generated/prisma/client";
import { authorIdeaSelect } from "./ideaSelects";

// The author's read of their own post for the edit page (#128): the post, its review
// state, and the latest review's reason. Never the reviewer. Never cached: it depends
// on who is signed in.
type Db = Pick<Prisma.TransactionClient, "idea">;

const ideaId = z.uuid();

// Null for a bad id, a missing post, and someone else's post alike, so a stranger learns
// nothing. The where clause and the shape check both enforce authorship, so a VP or a
// chair, who would get the leader shape on another student's post, gets null here:
// reviewers use the queue, not this page.
export async function ownPostById(db: Db, viewer: Viewer, id: string): Promise<AuthorIdea | null> {
  if (!viewer) return null;
  // A malformed id would make Prisma throw on the uuid column, so it is checked first.
  if (!ideaId.safeParse(id).success) return null;

  // Prisma loads each selected relation (author, reviews) with its own query by default,
  // which made this read three. "join" folds them into one statement (#128).
  const row = await db.idea.findFirst({
    relationLoadStrategy: "join",
    where: { id, authorId: viewer.user.id },
    select: authorIdeaSelect,
  });
  if (!row) return null;
  const view = ideaForViewer(viewer, { ...row, boardId: row.boardId as BoardCode });
  return view?.shape === "author" ? view.idea : null;
}
