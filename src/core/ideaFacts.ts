// Student-facing words for an idea's scale, rough cost, and timing. One place, so the
// post form and the idea page say the same thing (#60). Keys mirror the Prisma enums
// IdeaScale, CostBand, and TimeHorizon; ideaFacts.test.ts pins them.
export type IdeaScaleValue = "small" | "medium" | "large";
export type CostBandValue = "under_1k" | "from_1k_to_5k" | "over_5k";
export type TimeHorizonValue = "this_semester" | "next_semester" | "within_a_year";

export const SCALE_LABELS: Record<IdeaScaleValue, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export const COST_LABELS: Record<CostBandValue, string> = {
  under_1k: "Under $1k",
  from_1k_to_5k: "$1k to $5k",
  over_5k: "$5k or more",
};

export const TIME_LABELS: Record<TimeHorizonValue, string> = {
  this_semester: "This semester",
  next_semester: "Next semester",
  within_a_year: "Within a year",
};
