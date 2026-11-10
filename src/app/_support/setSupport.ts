import type { Session } from "@/auth/contract";
import { checkActionCount } from "@/core/actionLimit";
import type { ReviewStatus } from "@/core/review";
import type { IdeaStatus } from "@/core/statuses";
import { checkSupportable, supportInputSchema } from "@/core/support";
import { IDEAS_TAG, ideaTag } from "@/app/_ideas/tags";

// Setting a student's support on an idea (#94): the rules, with the storage behind an
// interface. It sets the state the student asked for and never toggles, so a retry or
// a double tap does no harm. Order: input, the idea, whether it is open, the abuse
// limit, then the write. Every attempt past the idea checks counts toward the limit,
// including repeats and attempts already over it, so a script stays blocked.

export type SupportableIdea = { id: string; number: number; reviewStatus: ReviewStatus; status: IdeaStatus };

export type SupportStore = {
  // Public ideas only, so a pending, declined, or withdrawn post is never revealed.
  find(number: number): Promise<SupportableIdea | null>;
  // Copies the account from the session: the support and the counter both reference users.
  ensureUser(user: { id: string; email: string; displayName: string }): Promise<void>;
  // Counts this change in the student's current minute and returns that minute's count.
  bump(userId: string, now: Date): Promise<number>;
  // Returns whether a row changed.
  set(userId: string, ideaId: string, supported: boolean): Promise<boolean>;
};

export type SetSupportResult =
  | { ok: true; number: number; supported: boolean; refresh: string[] }
  | {
      ok: false;
      error:
        | { code: "invalid"; fields: string[] }
        | { code: "not_found" }
        | { code: "closed" }
        | { code: "rate_limited" };
    };

export async function setSupport(
  store: SupportStore,
  session: Session,
  raw: unknown,
  now: Date,
): Promise<SetSupportResult> {
  const parsed = supportInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return { ok: false, error: { code: "invalid", fields } };
  }
  const { number, supported } = parsed.data;

  const idea = await store.find(number);
  if (!idea) return { ok: false, error: { code: "not_found" } };

  const open = checkSupportable(idea);
  if (!open.ok) return open;

  const { id, email, name } = session.user;
  await store.ensureUser({ id, email, displayName: name });
  const limit = checkActionCount(await store.bump(id, now));
  if (!limit.ok) return limit;

  const changed = await store.set(id, idea.id, supported);
  return { ok: true, number, supported, refresh: changed ? [IDEAS_TAG, ideaTag(number)] : [] };
}
