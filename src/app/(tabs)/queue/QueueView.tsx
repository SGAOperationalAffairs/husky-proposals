"use client";

import { useState } from "react";
import { BadgeCheck, ClipboardCheck, type LucideIcon } from "lucide-react";
import { SelectField } from "@/components/Field";
import type { BoardCode } from "@/core/boards";
import type { ApprovedRowData, ReviewRowData } from "@/app/_review/present";
import { ReviewList } from "./ReviewList";

// The queue is the review list and a board filter (#221). The Ideas tab, its status
// filter, sort, and list/cards view are gone: approved ideas are on the public wall, and
// the red count of posts waiting for review is on the Queue tab in the top navigation.
type Section = "review" | "approved";
const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "review", label: "To review", icon: ClipboardCheck },
  { id: "approved", label: "Recently approved", icon: BadgeCheck },
];

export function QueueView({
  review,
  boards,
}: {
  review: { pending: ReviewRowData[]; approved: ApprovedRowData[] };
  boards: { value: BoardCode; label: string }[];
}) {
  const [board, setBoard] = useState<BoardCode | undefined>(undefined);
  // One list at a time, picked with chips like My ideas' (#221).
  const [section, setSection] = useState<Section>("review");
  const pending = review.pending.filter((row) => !board || row.boardId === board);
  const approved = review.approved.filter((row) => !board || row.boardId === board);

  return (
    <div className="flex flex-col gap-6">
      {/* The chips pick the list, the same look as My ideas' chips (#221), and the board
          filter sits on the same row, at the right (#221). Buttons, not tabs. */}
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Queue lists" className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={section === s.id}
              onClick={() => setSection(s.id)}
              className="poster-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold"
            >
              <s.icon aria-hidden className="size-4" />
              {s.label}
            </button>
          ))}
        </nav>
        <div className="w-44 min-w-0">
          <SelectField
            label="Board"
            hideLabel
            compact
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
      </div>
      <ReviewList pending={pending} approved={approved} show={section} />
    </div>
  );
}
