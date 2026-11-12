import { STATUS_LABELS, type IdeaStatus } from "@/core/statuses";

// The one status chip (#151). Colors follow the chip notes in design/tokens.css.
// "pending" is a queue post awaiting review, not an idea status, so it has its own
// look: outlined, so it does not read as any idea status.
export type ChipStatus = IdeaStatus | "pending";

const STYLES: Record<ChipStatus, string> = {
  collecting_support: "bg-grey text-grey-ink",
  in_progress: "bg-amber text-amber-ink",
  delivered: "bg-green text-green-ink",
  waiting: "bordered bg-transparent text-grey-ink",
  pending: "bordered bg-surface text-line",
};

const LABELS: Record<ChipStatus, string> = { ...STATUS_LABELS, pending: "Pending review" };

export function StatusLabel({ status }: { status: ChipStatus }) {
  return (
    <span
      className={`inline-block rounded-chip px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
