import { z } from "zod";

// A post made while signed out is kept for after sign-in (#181, the post form's share
// of #102). It lives in sessionStorage: the student's own words, in their own tab.
const KEY = "husky-proposals:post-draft";

const draftSchema = z.object({
  title: z.string(),
  summary: z.string(),
  details: z.string(),
  category: z.string(),
  location: z.string(),
  scale: z.string(),
  costBand: z.string(),
  timeHorizon: z.string(),
  anonymous: z.boolean(),
});

export type PostDraft = z.infer<typeof draftSchema>;

// Every call is wrapped: private mode or a full quota must never break the form.
export function saveDraft(values: PostDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(values));
  } catch {
    // Nothing to do: the draft is a convenience.
  }
}

// Storage is outside our code, so what comes back is checked, not trusted.
export function loadDraft(): PostDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}
