import type { IdeaCardData } from "@/components/IdeaCard";
import type { BoardCode } from "@/core/boards";
import type { EditFields } from "@/core/postEdit";
import { categoryForBoard, type CATEGORIES } from "@/core/postIdea";
import type { ReviewStatus } from "@/core/review";
import type { IdeaStatus } from "@/core/statuses";
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
  // A declined post a reviewer sent back, rather than declined at first review (#286).
  sentBack: boolean;
  // An edit to an approved post (#295): waiting for review, or declined with its reason.
  edit: { state: "pending" | "declined"; reason: string | null } | null;
  values: PostDraft;
};

// What the similar-ideas check needs from a public wall card (#55): the number, title,
// category, and status. Only these cross to the client, so a visitor gets nothing the wall
// does not already show, and no counts, description, or author.
export type SimilarIdeaData = {
  number: number;
  title: string;
  category: (typeof CATEGORIES)[number];
  status: IdeaStatus;
};

export function toSimilarIdeas(cards: IdeaCardData[]): SimilarIdeaData[] {
  return cards.flatMap((card) => {
    const category = categoryForBoard(card.board);
    return category ? [{ number: card.number, title: card.title, category, status: card.status }] : [];
  });
}

function draftOf(fields: EditFields): PostDraft {
  return {
    title: fields.title,
    summary: fields.description,
    details: fields.fullText ?? "",
    category: fields.category,
    location: fields.location ?? "",
    scale: fields.scale ?? "",
    costBand: fields.costBand ?? "",
    timeHorizon: fields.timeHorizon ?? "",
    anonymous: fields.isAnonymous,
  };
}

export function toEditPost(idea: AuthorIdea): EditPostData {
  const latest = idea.review;
  return {
    ideaId: idea.id,
    board: idea.boardId,
    number: idea.number,
    reviewStatus: idea.reviewStatus,
    // A resubmitted post still has its old decline as the latest review. Only a post
    // that is declined or taken down now shows a reason (#286).
    reason:
      (idea.reviewStatus === "declined" || idea.reviewStatus === "taken_down") &&
      latest?.decision === "declined"
        ? latest.reason
        : null,
    sentBack: idea.reviewStatus === "declined" && latest?.kind === "send_back",
    // An edit to an approved post: waiting, or declined with the reason the author sees (#295).
    edit: idea.edit ? { state: idea.edit.state, reason: idea.edit.reason } : null,
    // The form starts from the edit when there is one, so the author fixes rather than retypes.
    values: idea.edit
      ? draftOf(idea.edit.values)
      : draftOf({
          title: idea.title,
          description: idea.description,
          fullText: idea.fullText,
          category: idea.category as EditFields["category"],
          location: idea.location,
          scale: idea.scale as EditFields["scale"],
          costBand: idea.costBand as EditFields["costBand"],
          timeHorizon: idea.timeHorizon as EditFields["timeHorizon"],
          isAnonymous: idea.isAnonymous,
        }),
  };
}
