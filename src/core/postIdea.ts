import { z } from "zod";
import type { BoardCode } from "./boards";

// The five categories in prisma/schema.prisma (IdeaCategory). Each one belongs to one board.
export const CATEGORIES = [
  "dining",
  "campus_planning",
  "campus_services",
  "green_initiatives",
  "sustainability",
] as const;

// The rules for posting an idea (#55 form, #54 action). Plain functions with no
// server code, so the form and the action check the same thing.

export const DETAILS_MIN = 80;
export const DETAILS_MAX = 4000;
const TITLE_MAX = 120; // three lines of headline on the poster (#29)

const text = (max: number) => z.string().trim().min(1).max(max);

export const postIdeaSchema = z.object({
  title: text(TITLE_MAX),
  // The short text students see on the poster (data-model `description`).
  summary: text(140),
  // The long text, shown on the idea page (data-model `full_text`). Optional.
  // Optional, but if written it needs enough to be useful: at least DETAILS_MIN characters (#55).
  details: z
    .string()
    .trim()
    .max(DETAILS_MAX)
    .optional()
    .refine((v) => !v || v.length >= DETAILS_MIN, { message: "details too short" })
    .transform((v) => v || null),
  category: z.enum(CATEGORIES),
  location: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || null),
  // "Not sure" is the form's default; the stored value is null, so reviewers can fill it in.
  scale: z
    .enum(["small", "medium", "large"])
    .nullish()
    .transform((v) => v ?? null),
  costBand: z
    .enum(["under_1k", "from_1k_to_5k", "over_5k"])
    .nullish()
    .transform((v) => v ?? null),
  timeHorizon: z
    .enum(["this_semester", "next_semester", "within_a_year"])
    .nullish()
    .transform((v) => v ?? null),
  anonymous: z.boolean().default(false),
});

export type PostIdeaInput = z.infer<typeof postIdeaSchema>;

// Resubmitting a declined post (#56): the same fields as posting, plus which post.
export const resubmitPostSchema = postIdeaSchema.extend({ ideaId: z.uuid() });

export function parsePostIdea(input: unknown) {
  return postIdeaSchema.safeParse(input);
}

// Words too short or too common to say two titles are about the same thing.
const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "our", "more", "less"]);

const words = (title: string) =>
  title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

export type SimilarCandidate = { number: number; title: string; category: string; reviewStatus: string };

// The similar-idea check (#54, #55): a plain word match on the title, against
// approved ideas in the same board. No AI. Shows at most three, so the form stays short.
export function similarIdeas(
  draft: { title: string; category: string },
  ideas: SimilarCandidate[],
  limit = 3,
): SimilarCandidate[] {
  const wanted = new Set(words(draft.title));
  if (wanted.size === 0) return [];
  return ideas
    .filter((i) => i.reviewStatus === "approved" && i.category === draft.category)
    .filter((i) => words(i.title).some((w) => wanted.has(w)))
    .slice(0, limit);
}

// Each category is one of the five boards (BOARDS in src/core/boards.ts).
export const BOARD_FOR_CATEGORY = {
  dining: "DAB",
  campus_planning: "CPAB",
  campus_services: "CSC",
  green_initiatives: "GIB",
  sustainability: "SC",
} as const satisfies Record<(typeof CATEGORIES)[number], BoardCode>;

// The category a board's ideas are posted under. The inverse of BOARD_FOR_CATEGORY.
export function categoryForBoard(board: BoardCode): (typeof CATEGORIES)[number] | undefined {
  return CATEGORIES.find((c) => BOARD_FOR_CATEGORY[c] === board);
}
