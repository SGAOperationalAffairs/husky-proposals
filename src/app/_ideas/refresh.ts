import { updateTag } from "next/cache";
import { IDEAS_TAG, ideaTag } from "./tags";

// Call this from a server action after it changes what the public sees of an idea: an
// approval, a take-down, a status change, a posted update, or a board move (E4, E5), and
// support and participation changes (E6). Nothing calls it yet, because those writers do
// not exist. `updateTag` is for server actions only, and the next read sees fresh data.
export function refreshPublicIdea(number: number | null): void {
  updateTag(IDEAS_TAG);
  if (number !== null) updateTag(ideaTag(number));
}
