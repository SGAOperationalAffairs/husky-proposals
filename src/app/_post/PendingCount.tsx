import { PENDING_LIMIT, pendingPostsText } from "@/core/review";

// The "You have N pending posts" line on the post form (#96). Null means the viewer is
// signed out, so there is no count to show. Its own file keeps it apart from the form's
// layout work (#55).
export function PendingCount({ id, count }: { id: string; count: number | null }) {
  if (count === null) return null;
  return (
    <p id={id} className={count >= PENDING_LIMIT ? "font-semibold" : "text-muted"}>
      {pendingPostsText(count)}
    </p>
  );
}
