import { z } from "zod";
import type { ReviewStatus } from "./review";
import type { IdeaStatus } from "./statuses";

// Support rules (#94). Support is set, never toggled: the input says the state the
// student wants. The number is the public number the cards and pages already hold.
export const supportInputSchema = z.object({
  number: z.number().int().positive(),
  supported: z.boolean(),
});

export type SupportClosed = { ok: false; error: { code: "closed" } };

// Only an approved idea that is not delivered takes support. Feedback on a delivered
// idea is a separate feature.
export function checkSupportable(idea: {
  reviewStatus: ReviewStatus;
  status: IdeaStatus;
}): { ok: true } | SupportClosed {
  return idea.reviewStatus === "approved" && idea.status !== "delivered"
    ? { ok: true }
    : { ok: false, error: { code: "closed" } };
}
