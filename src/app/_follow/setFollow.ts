import { z } from "zod";
import type { Session } from "@/auth/contract";
import { checkActionCount } from "@/core/actionLimit";
import { can } from "@/core/permissions";
import type { ReviewStatus } from "@/core/review";
import type { IdeaStatus } from "@/core/statuses";
import { checkSupportable } from "@/core/support";

// Following an idea (#101): the rules, with the storage behind an interface, as in
// src/app/_review/decidePost.ts. The write sets the state ("following: yes or no")
// and never toggles, so a retry or a double tap does no harm. Following never queues
// email (data-model, "Changing support or follow never creates an email").
// Follow shares support's checks (#255): only an open idea can be followed, and every
// attempt past the idea check counts toward the abuse limit. Unfollowing is always allowed.

export const setFollowInputSchema = z.object({ ideaId: z.uuid(), following: z.boolean() });

export type FollowUser = { id: string; email: string; displayName: string };

export type FollowableIdea = { id: string; reviewStatus: ReviewStatus; status: IdeaStatus };

export type FollowStore = {
  // Null unless the idea passes `isPublic`: pending, declined, and withdrawn posts are not found.
  findPublicIdea(ideaId: string): Promise<FollowableIdea | null>;
  // Copies the account from the session: the follow and the counter both reference users.
  ensureUser(user: FollowUser): Promise<void>;
  // Counts this change in the student's current minute and returns that minute's count.
  bump(userId: string, now: Date): Promise<number>;
  follow(userId: string, ideaId: string): Promise<void>;
  unfollow(userId: string, ideaId: string): Promise<void>;
};

export type SetFollowError =
  | { code: "invalid"; fields: string[] }
  | { code: "not_allowed" }
  | { code: "not_found" }
  | { code: "closed" }
  | { code: "rate_limited" };

export type SetFollowResult = { ok: true; following: boolean } | { ok: false; error: SetFollowError };

const fail = (error: SetFollowError): SetFollowResult => ({ ok: false, error });

export async function setFollow(
  store: FollowStore,
  session: Session,
  raw: unknown,
  now: Date,
): Promise<SetFollowResult> {
  const parsed = setFollowInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return fail({ code: "invalid", fields });
  }
  // "Support, follow, offer to help" is one row in the permissions table.
  if (!can(session, "support")) return fail({ code: "not_allowed" });

  const { ideaId, following } = parsed.data;
  const idea = await store.findPublicIdea(ideaId);
  if (!idea) return fail({ code: "not_found" });

  // Following a closed or delivered idea is refused. Unfollowing stays open, so a
  // student can always take their follow back.
  if (following) {
    const open = checkSupportable(idea);
    if (!open.ok) return fail({ code: "closed" });
  }

  const { id, email, name } = session.user;
  await store.ensureUser({ id, email, displayName: name });
  const limit = checkActionCount(await store.bump(id, now));
  if (!limit.ok) return fail({ code: "rate_limited" });

  if (following) {
    await store.follow(id, idea.id);
  } else {
    await store.unfollow(id, idea.id);
  }
  return { ok: true, following };
}
