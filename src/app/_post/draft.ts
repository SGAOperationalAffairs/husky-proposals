import { z } from "zod";

// A post made while signed out is kept for after sign-in (#181, the post form's share
// of #102). It lives in sessionStorage: the student's own words, in their own tab.
const KEY = "husky-proposals:post-draft";

// An edit of a declined post keeps its own draft, scoped by the idea's id (#128), so it
// never collides with the draft of a new post. No scope keeps the original key.
const keyFor = (scope?: string) => (scope ? `${KEY}:${scope}` : KEY);

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
export function saveDraft(values: PostDraft, scope?: string): void {
  try {
    sessionStorage.setItem(keyFor(scope), JSON.stringify(values));
  } catch {
    // Nothing to do: the draft is a convenience.
  }
}

// Storage is outside our code, so what comes back is checked, not trusted.
export function loadDraft(scope?: string): PostDraft | null {
  try {
    const raw = sessionStorage.getItem(keyFor(scope));
    if (raw === null) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearDraft(scope?: string): void {
  try {
    sessionStorage.removeItem(keyFor(scope));
  } catch {
    // Nothing to do.
  }
}
