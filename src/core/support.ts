import { z } from "zod";
import type { ReviewStatus } from "./review";
import { takesSupport, type IdeaStatus } from "./statuses";

// Support rules (#94). Support is set, never toggled: the input says the state the
// student wants. The number is the public number the cards and pages already hold.
export const supportInputSchema = z.object({
  number: z.number().int().positive(),
  supported: z.boolean(),
});

export type SupportClosed = { ok: false; error: { code: "closed" } };

// Only an approved idea that takes support (not delivered, not closed, #237) gets
// it. Feedback on a delivered idea is a separate feature. The future participate and
// follow writes (E6) share this check.
export function checkSupportable(idea: {
  reviewStatus: ReviewStatus;
  status: IdeaStatus;
}): { ok: true } | SupportClosed {
  return idea.reviewStatus === "approved" && takesSupport(idea.status)
    ? { ok: true }
    : { ok: false, error: { code: "closed" } };
}
