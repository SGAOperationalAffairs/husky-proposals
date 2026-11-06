"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BoardChip } from "@/components/BoardChip";
import { Button } from "@/components/Button";
import { DecisionSheet } from "@/components/DecisionSheet";
import { PAGE } from "@/components/pageTransition";
import { TakeDownDialog } from "@/components/TakeDownDialog";
import { BOARDS } from "@/core/boards";
import type { ApprovedRowData, ReviewRowData } from "@/app/_review/present";
import { useReviewActions } from "@/app/_review/useReviewActions";

// The To review tab (#59): pending posts oldest first, then what was approved in the
// last 14 days so a leader can take one down. It owns which drawer or dialog is open
// and where focus lands afterwards. The lists arrive already filtered by board.
type Props = { pending: ReviewRowData[]; approved: ApprovedRowData[] };

const PANEL = "overflow-hidden bordered bg-surface";

// The latest non-null value. A drawer or dialog keeps rendering its row while it
// animates out, after the row is gone from state, so it must not fall back to blanks
// like "Take down #0?" in the wrong board's color (#59).
function useLastRow<T>(row: T | null): T | null {
  const [last, setLast] = useState(row);
  if (row !== null && row !== last) setLast(row);
  return row ?? last;
}

export function ReviewList({ pending, approved }: Props) {
  const actions = useReviewActions();
  const [openId, setOpenId] = useState<string | null>(null);
  const [takeDownId, setTakeDownId] = useState<string | null>(null);
  // What Base UI focuses when a drawer or dialog closes: the opener, or after a
  // decision, the next row (or the tab when nothing is left).
  const returnFocus = useRef<HTMLElement | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const open = pending.find((row) => row.id === openId) ?? null;
  const takeDownRow = approved.find((row) => row.id === takeDownId) ?? null;
  const shownOpen = useLastRow(open);
  const shownTakeDown = useLastRow(takeDownRow);

  // The element after `id` in `ids` that has the given attribute, else the one before.
  function neighbour(attribute: string, ids: string[], id: string): HTMLElement | null {
    const at = ids.indexOf(id);
    const next = ids[at + 1] ?? ids[at - 1];
    return next === undefined ? null : (root.current?.querySelector(`[${attribute}="${next}"]`) ?? null);
  }
  const tab = () => document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');

  const close = () => {
    setOpenId(null);
    actions.clearError();
  };

  const decided = (id: string) => {
    returnFocus.current =
      neighbour(
        "data-review-row",
        pending.map((row) => row.id),
        id,
      ) ?? tab();
    close();
  };

  return (
    <div ref={root} className="flex flex-col gap-8">
      {pending.length === 0 ? (
        <p className="bordered bg-surface p-card">Nothing to review right now. New posts appear here.</p>
      ) : (
        <div className={PANEL}>
          <ul className="flex flex-col divide-y divide-line">
            {pending.map((row) => (
              <li
                key={row.id}
                data-board={BOARDS[row.boardId].color}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3"
              >
                <button
                  type="button"
                  data-review-row={row.id}
                  aria-label={`Review: ${row.title}`}
                  onClick={(e) => {
                    returnFocus.current = e.currentTarget;
                    actions.clearError();
                    setOpenId(row.id);
                  }}
                  className="min-w-0 flex-1 text-left font-bold underline-offset-4 hover:underline"
                >
                  {row.title}
                </button>
                <BoardChip board={row.boardId} />
                <span className="text-sm text-muted">{row.sentText}</span>
                <span
                  className={row.due.overdue ? "text-sm font-bold text-accent-text" : "text-sm text-muted"}
                >
                  {row.due.text}
                </span>
                {row.isAnonymous && (
                  <span className="bordered px-1.5 text-xs font-bold">Anonymous to students</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="heading text-3xl">Recently approved</h2>
        <p className="text-sm text-muted">
          Approved in the last 14 days on your boards. Take one down if it should not be public.
        </p>
        {approved.length === 0 ? (
          <p className="bordered bg-surface p-card">Nothing approved in the last 14 days.</p>
        ) : (
          <div className={PANEL}>
            <ul className="flex flex-col divide-y divide-line">
              {approved.map((row) => (
                <li
                  key={row.id}
                  data-board={BOARDS[row.boardId].color}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3"
                >
                  <Link
                    href={`/ideas/${row.number}`}
                    transitionTypes={PAGE}
                    className="min-w-0 flex-1 font-bold underline-offset-4 hover:underline"
                  >
                    {row.title}
                  </Link>
                  <span className="text-sm text-muted tabular-nums">#{row.number}</span>
                  <BoardChip board={row.boardId} />
                  <span className="text-sm text-muted">{row.approvedText}</span>
                  <Button
                    variant="line"
                    size="sm"
                    data-take-down-row={row.id}
                    aria-label={`Take down #${row.number}`}
                    onClick={(e) => {
                      returnFocus.current = e.currentTarget;
                      actions.clearError();
                      setTakeDownId(row.id);
                    }}
                  >
                    Take down
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <DecisionSheet
        row={shownOpen}
        open={open !== null}
        busy={actions.busy === "approve" || actions.busy === "decline" ? actions.busy : null}
        error={actions.error}
        returnFocus={returnFocus}
        onClose={close}
        onApprove={async () => {
          if (open && (await actions.approve(open))) decided(open.id);
        }}
        onDecline={async (reason) => {
          if (open && (await actions.decline(open, reason))) decided(open.id);
        }}
      />
      <TakeDownDialog
        number={shownTakeDown?.number ?? 0}
        board={shownTakeDown?.boardId ?? "DAB"}
        open={takeDownRow !== null}
        busy={actions.busy === "take_down"}
        error={actions.error}
        returnFocus={returnFocus}
        onCancel={() => {
          setTakeDownId(null);
          actions.clearError();
        }}
        onConfirm={async (reason) => {
          if (!takeDownRow) return;
          if (
            await actions.takeDown(
              { id: takeDownRow.id, boardId: takeDownRow.boardId, number: takeDownRow.number },
              reason,
            )
          ) {
            returnFocus.current =
              neighbour(
                "data-take-down-row",
                approved.map((row) => row.id),
                takeDownRow.id,
              ) ?? tab();
            setTakeDownId(null);
          }
        }}
      />
    </div>
  );
}
