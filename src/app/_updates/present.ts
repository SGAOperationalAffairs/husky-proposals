import type { BoardCode } from "@/core/boards";
import { daysAgo } from "@/core/days";
import { cadenceDueAt, cadenceFlag } from "@/core/updates";
import type { UpdatableIdea } from "@/db/updatesList";

// Turns a leader's updatable idea (src/db/updatesList.ts) into what the Updates tab draws
// (#130). Plain functions: `now` comes from the caller, never read here. Nothing here names
// who wrote an update; the tab shows what students read.

export type UpdateRowData = {
  id: string;
  number: number;
  title: string;
  board: BoardCode;
  cadenceDays: number;
  followerCount: number;
  supportCount: number;
  // The next update's due date, and the chip's words. `due` is the view's flag.
  dueAt: string | null;
  due: boolean;
  dueText: string;
  // The newest update of any kind, or null.
  last: { text: string; daysAgo: number } | null;
  // Every update, newest first, as the idea page lists them.
  past: { id: string; daysAgo: number; text: string }[];
};

export function toUpdateRow(record: UpdatableIdea, now: Date): UpdateRowData {
  const dueAt = cadenceDueAt({
    statusChangedAt: record.statusChangedAt ? new Date(record.statusChangedAt) : null,
    updates: record.updates.map((u) => ({ kind: u.kind, createdAt: new Date(u.createdAt) })),
    cadenceDays: record.cadenceDays,
  });
  const flag = cadenceFlag(dueAt, record.isStale, now);
  const past = record.updates.map((u) => ({
    id: u.id,
    daysAgo: daysAgo(new Date(u.createdAt), now),
    text: u.body,
  }));
  const [newest] = past;
  return {
    id: record.id,
    number: record.number,
    title: record.title,
    board: record.boardId,
    cadenceDays: record.cadenceDays,
    followerCount: record.followerCount,
    supportCount: record.supportCount,
    dueAt: dueAt?.toISOString() ?? null,
    due: flag.due,
    dueText: flag.text,
    last: newest ? { text: newest.text, daysAgo: newest.daysAgo } : null,
    past,
  };
}
