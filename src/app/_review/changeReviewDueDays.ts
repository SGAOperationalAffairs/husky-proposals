import type { Session } from "@/auth/contract";
import type { BoardCode } from "@/core/boards";
import { can } from "@/core/permissions";
import { reviewDueDaysInputSchema } from "@/core/review";

// Changing a board's review due time (#58): the rules, with the storage behind an
// interface. The VP may change every board, a chair or director their own
// (change_review_due). Nothing is cached around the setting, since it shows only on
// SGA pages, so there is nothing to refresh.

export type BoardSettingsStore = {
  setReviewDueDays(boardId: BoardCode, days: number): Promise<void>;
};

export type ChangeDueResult =
  | { ok: true; boardId: BoardCode; reviewDueDays: number }
  | { ok: false; error: { code: "invalid"; fields: string[] } | { code: "not_allowed" } };

export async function changeReviewDueDays(
  store: BoardSettingsStore,
  session: Session,
  raw: unknown,
): Promise<ChangeDueResult> {
  const parsed = reviewDueDaysInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return { ok: false, error: { code: "invalid", fields } };
  }
  const { boardId, days } = parsed.data;
  if (!can(session, "change_review_due", boardId)) return { ok: false, error: { code: "not_allowed" } };

  await store.setReviewDueDays(boardId, days);
  return { ok: true, boardId, reviewDueDays: days };
}
