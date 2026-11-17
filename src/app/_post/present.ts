import type { BoardCode } from "@/core/boards";
import type { ReviewStatus } from "@/core/review";
import type { AuthorIdea } from "@/core/viewerShapes";
import type { PostDraft } from "./draft";

// The author's post as plain data for the edit page (#128): the form's values, the
// board, and the reviewer's reason. No Dates and no reviewer, so it crosses to the
// client as is and carries nothing the author did not write beyond the reason.
export type EditPostData = {
  ideaId: string;
  board: BoardCode;
  number: number | null;
  reviewStatus: ReviewStatus;
  reason: string | null;
  values: PostDraft;
};

export function toEditPost(idea: AuthorIdea): EditPostData {
  const latest = idea.review;
  return {
    ideaId: idea.id,
    board: idea.boardId,
    number: idea.number,
    reviewStatus: idea.reviewStatus,
    // A resubmitted post still has its old decline as the latest review. Only a post
    // that is declined now shows a reason.
    reason: idea.reviewStatus === "declined" && latest?.decision === "declined" ? latest.reason : null,
    values: {
      title: idea.title,
      summary: idea.description,
      details: idea.fullText ?? "",
      category: idea.category,
      location: idea.location ?? "",
      scale: idea.scale ?? "",
      costBand: idea.costBand ?? "",
      timeHorizon: idea.timeHorizon ?? "",
      anonymous: idea.isAnonymous,
    },
  };
}
