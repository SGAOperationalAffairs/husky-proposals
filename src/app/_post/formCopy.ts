import { postMessage, RESUBMIT_SIGNED_OUT } from "./messages";

// The post form's words for each way it is used (#295): a new post, a declined post sent
// again, and an edit to an approved post. One table, so the form holds no inline
// `editing ? ... : ...` copy. Short sentences, nothing that promises action.
export type FormMode = "post" | "resubmit" | "edit";

export const FORM_COPY: Record<
  FormMode,
  {
    savedTitle: string;
    savedText: string;
    reviewNote: string;
    submit: string;
    submitting: string;
    signedOut: string;
  }
> = {
  post: {
    savedTitle: "Sent for review",
    savedText:
      "Your idea is not public yet. The board's chair or director, or the VP of Campus Affairs, usually reviews it within 2 to 3 days. If it is declined, you will see why, and you can edit it and send it again.",
    reviewNote:
      "Every post is reviewed before it shows. The board's chair or director, or the VP of Campus Affairs, reviews it, usually within 2 to 3 days. If it is declined, you will see why, and you can edit it and send it again.",
    submit: "Post idea",
    submitting: "Posting",
    signedOut: postMessage("signed_out"),
  },
  resubmit: {
    savedTitle: "Sent for review again",
    savedText:
      "Your post is not public yet. The board's chair or director, or the VP of Campus Affairs, usually reviews it within 2 to 3 days.",
    reviewNote:
      "Every post is reviewed before it shows. The board's chair or director, or the VP of Campus Affairs, reviews it, usually within 2 to 3 days. If it is declined, you will see why, and you can edit it and send it again.",
    submit: "Send for review again",
    submitting: "Sending",
    signedOut: RESUBMIT_SIGNED_OUT,
  },
  edit: {
    savedTitle: "Changes sent for review",
    savedText:
      "Students still see the approved version. A reviewer usually checks changes within 2 to 3 days.",
    reviewNote:
      "Every change is reviewed before it shows. The board's chair or director, or the VP of Campus Affairs, reviews it, usually within 2 to 3 days.",
    submit: "Send changes for review",
    submitting: "Sending",
    signedOut: RESUBMIT_SIGNED_OUT,
  },
};

// Shown under the form when the category changes in an edit: a board move needs the VP.
export function boardMoveNote(category: string): string {
  return `This moves your idea to another board: ${category}. Only the VP of Campus Affairs can approve a move.`;
}
