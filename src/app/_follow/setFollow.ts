import { z } from "zod";
import type { Session } from "@/auth/contract";
import { can } from "@/core/permissions";

// Following an idea (#101): the rules, with the storage behind an interface, as in
// src/app/_review/decidePost.ts. The write sets the state ("following: yes or no")
// and never toggles, so a retry or a double tap does no harm. Following never queues
// email (data-model, "Changing support or follow never creates an email").

export const setFollowInputSchema = z.object({ ideaId: z.uuid(), following: z.boolean() });

export type FollowUser = { id: string; email: string; displayName: string };

export type FollowStore = {
  // Null unless the idea passes `isPublic`: pending, declined, and withdrawn posts are not found.
  findPublicIdea(ideaId: string): Promise<{ id: string } | null>;
  follow(user: FollowUser, ideaId: string): Promise<void>;
  unfollow(userId: string, ideaId: string): Promise<void>;
};

export type SetFollowError =
  { code: "invalid"; fields: string[] } | { code: "not_allowed" } | { code: "not_found" };

export type SetFollowResult = { ok: true; following: boolean } | { ok: false; error: SetFollowError };

const fail = (error: SetFollowError): SetFollowResult => ({ ok: false, error });

export async function setFollow(
  store: FollowStore,
  session: Session,
  raw: unknown,
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

  if (following) {
    await store.follow(
      { id: session.user.id, email: session.user.email, displayName: session.user.name },
      idea.id,
    );
  } else {
    await store.unfollow(session.user.id, idea.id);
  }
  return { ok: true, following };
}
