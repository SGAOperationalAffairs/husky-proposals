"use client";

import { Select } from "@base-ui/react/select";
import { ChevronDown } from "lucide-react";
import { BOARDS, type BoardCode } from "@/core/boards";

// The board dropdown (#129). Each board shows its colour square, the same swatch as the board
// chips. Base UI handles the keyboard and the list.
export function BoardSelect({
  boards,
  value,
  onChange,
}: {
  boards: { value: BoardCode; label: string }[];
  value: BoardCode | "all";
  onChange: (v: BoardCode | "all") => void;
}) {
  const chosen = value === "all" ? null : BOARDS[value];
  return (
    <Select.Root value={value} onValueChange={(v) => onChange((v ?? "all") as BoardCode | "all")}>
      <Select.Trigger
        aria-label="Board"
        className="flex h-9 w-56 max-w-full items-center justify-between gap-2 bordered bg-surface px-3 text-sm"
      >
        <span className="flex min-w-0 items-center gap-2">
          {chosen && <span aria-hidden data-board={chosen.color} className="board-swatch size-3 shrink-0" />}
          <span className="truncate">{chosen ? chosen.name : "All boards"}</span>
        </span>
        <ChevronDown aria-hidden className="size-4 shrink-0" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4} className="z-20">
          <Select.Popup className="max-h-72 w-(--anchor-width) overflow-y-auto bordered bg-surface p-1">
            <Select.Item
              value="all"
              className="block cursor-pointer px-2 py-1.5 text-sm data-highlighted:bg-accent data-highlighted:text-on-accent"
            >
              <Select.ItemText>All boards</Select.ItemText>
            </Select.Item>
            {boards.map((b) => (
              <Select.Item
                key={b.value}
                value={b.value}
                className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm data-highlighted:bg-accent data-highlighted:text-on-accent"
              >
                <span
                  aria-hidden
                  data-board={BOARDS[b.value].color}
                  className="board-swatch size-3 shrink-0"
                />
                <Select.ItemText>{BOARDS[b.value].name}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
