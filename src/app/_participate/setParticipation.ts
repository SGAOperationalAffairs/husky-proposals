import { z } from "zod";
import type { Session } from "@/auth/contract";
import { checkActionCount } from "@/core/actionLimit";
import { can } from "@/core/permissions";
import type { ReviewStatus } from "@/core/review";
import type { IdeaStatus } from "@/core/statuses";
import { checkSupportable } from "@/core/support";
import { IDEAS_TAG, ideaTag } from "@/app/_ideas/tags";

// Setting a student's "I'll participate" on an idea (#95): the twin of setSupport (#94),
// with the storage behind an interface. It sets the state the student asked for and never
// toggles, so a retry or a double tap does no harm. Offering needs an open idea, as support
// does. Withdrawing is always allowed on a public idea: the student shared their name and
// email and can always take that back, as with unfollowing (#255). Every attempt past the
// idea checks counts toward the abuse limit, including repeats and attempts over it.

export const participateInputSchema = z.object({
  number: z.number().int().positive(),
  participating: z.boolean(),
});

export type ParticipableIdea = { id: string; number: number; reviewStatus: ReviewStatus; status: IdeaStatus };

export type ParticipationStore = {
  // Public ideas only, so a pending, declined, or withdrawn post is never revealed.
  find(number: number): Promise<ParticipableIdea | null>;
  // Copies the account from the session: the participation and the counter both reference users.
  // The name and email written here are what the People list shows leaders.
  ensureUser(user: { id: string; email: string; displayName: string }): Promise<void>;
  // Counts this change in the student's current minute and returns that minute's count.
  bump(userId: string, now: Date): Promise<number>;
  // Returns whether a row changed.
  set(userId: string, ideaId: string, participating: boolean): Promise<boolean>;
};

export type SetParticipationError =
  | { code: "invalid"; fields: string[] }
  | { code: "not_allowed" }
  | { code: "not_found" }
  | { code: "closed" }
  | { code: "rate_limited" };

export type SetParticipationResult =
  | { ok: true; number: number; participating: boolean; refresh: string[] }
  | { ok: false; error: SetParticipationError };

const fail = (error: SetParticipationError): SetParticipationResult => ({ ok: false, error });

export async function setParticipation(
  store: ParticipationStore,
  session: Session,
  raw: unknown,
  now: Date,
): Promise<SetParticipationResult> {
  const parsed = participateInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return fail({ code: "invalid", fields });
  }
  // "Support, follow, offer to help" is one row in the permissions table.
  if (!can(session, "support")) return fail({ code: "not_allowed" });

  const { number, participating } = parsed.data;
  const idea = await store.find(number);
  if (!idea) return fail({ code: "not_found" });

  if (participating && !checkSupportable(idea).ok) return fail({ code: "closed" });

  const { id, email, name } = session.user;
  await store.ensureUser({ id, email, displayName: name });
  const limit = checkActionCount(await store.bump(id, now));
  if (!limit.ok) return fail({ code: "rate_limited" });

  const changed = await store.set(id, idea.id, participating);
  return { ok: true, number, participating, refresh: changed ? [IDEAS_TAG, ideaTag(number)] : [] };
}
