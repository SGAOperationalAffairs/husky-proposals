// An idea's status, as students see it (CLAUDE.md, "Statuses"). Colors follow
// the status chip notes in design/tokens.css.
export type IdeaStatus = "collecting_support" | "under_review" | "in_progress" | "delivered" | "waiting";

export const STATUS_LABELS: Record<IdeaStatus, string> = {
  collecting_support: "Collecting support",
  under_review: "Under review",
  in_progress: "In progress",
  delivered: "Delivered",
  waiting: "Waiting",
};

const STYLES: Record<IdeaStatus, string> = {
  collecting_support: "bg-grey text-grey-ink",
  under_review: "bg-sky text-sky-ink",
  in_progress: "bg-amber text-amber-ink",
  delivered: "bg-green text-green-ink",
  waiting: "bordered bg-transparent text-grey-ink",
};

export function StatusLabel({ status }: { status: IdeaStatus }) {
  return (
    <span
      className={`inline-block rounded-chip px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
