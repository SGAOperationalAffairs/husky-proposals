"use client";

import { useMemo, useState } from "react";
import { Tabs } from "@/components/Tabs";
import { SelectField } from "@/components/Field";
import { STATUS_LABELS, IDEA_STATUSES, type IdeaStatus } from "@/core/statuses";
import type { BoardCode } from "@/core/boards";
import { attentionCount, filterQueue, QUEUE_SORTS, type QueueItem, type QueueSort } from "@/core/queue";
import { QueueHeader, QueueRow, type Highlight, type RowStyle } from "./QueueRow";

// The queue's two tabs and its filters (#124). The "To review" tab carries the
// red count of pending posts; the Ideas tab has no count.
type Tab = "review" | "ideas";

const SORT_OPTIONS = Object.entries(QUEUE_SORTS).map(([value, label]) => ({ value, label }));

export function QueueView({
  items,
  boards,
  rowStyle = "tag",
  panel = true,
  highlight = "status",
  titleUnderline = false,
}: {
  items: QueueItem[];
  boards: { value: BoardCode; label: string }[];
  rowStyle?: RowStyle;
  panel?: boolean;
  highlight?: Highlight;
  titleUnderline?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("review");
  const [board, setBoard] = useState<BoardCode | undefined>(undefined);
  const [status, setStatus] = useState<IdeaStatus | undefined>(undefined);
  const [sort, setSort] = useState<QueueSort>("support");

  const counts = attentionCount(items);
  const shown = useMemo(() => {
    const ofTab = items.filter((i) => (tab === "review" ? i.kind === "post" : i.kind === "idea"));
    return filterQueue(ofTab, { board, status: tab === "ideas" ? status : undefined, sort });
  }, [items, tab, board, status, sort]);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        label="Queue"
        tabs={[
          // A zero count shows no badge at all (#124).
          { id: "review", label: "To review", count: counts > 0 ? counts : undefined },
          { id: "ideas", label: "Ideas" },
        ]}
        selected={tab}
        onSelect={(id) => setTab(id as Tab)}
      />
      <div className="grid grid-cols-2 gap-3 @3xl:flex @3xl:flex-wrap">
        <div className="min-w-0 @3xl:w-56">
          <SelectField
            label="Board"
            value={board ?? ""}
            onChange={(e) => setBoard((e.target.value || undefined) as BoardCode | undefined)}
          >
            <option value="">All boards</option>
            {boards.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </SelectField>
        </div>
        {tab === "ideas" && (
          <div className="min-w-0 @3xl:w-56">
            <SelectField
              label="Status"
              value={status ?? ""}
              onChange={(e) => setStatus((e.target.value || undefined) as IdeaStatus | undefined)}
            >
              <option value="">All statuses</option>
              {IDEA_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </SelectField>
          </div>
        )}
        <div className="min-w-0 @3xl:w-56">
          <SelectField label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as QueueSort)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="bordered bg-surface p-card">
          {tab === "review"
            ? "Nothing to review right now. New posts appear here."
            : "No ideas match these filters."}
        </p>
      ) : (
        // The rows sit in a white panel by default, as the old queue table did (#124).
        <div className={panel ? "overflow-hidden bordered bg-surface" : undefined}>
          {panel && <QueueHeader />}
          <ul className="flex flex-col divide-y divide-line">
            {shown.map((item) => (
              <QueueRow
                key={`${item.kind}-${item.number}`}
                item={item}
                style={rowStyle}
                highlight={highlight}
                titleUnderline={titleUnderline}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
