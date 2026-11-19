import type { Session } from "@/auth/contract";
import type { PostStore } from "./submitPost";

// The count the post form shows (#96). A visitor has no posts, so they get null and the
// store is never read. It takes the store's own countPending, so the page and the submit
// check count the same way. The page count is only a hint; submitPost is the authority.
export async function pendingCountFor(
  session: Session | null,
  countPending: PostStore["countPending"],
): Promise<number | null> {
  if (!session) return null;
  return countPending(session.user.id);
}
