import type { Env } from "@/env";

// The one switch between the playground's sample ideas and the database (#60). Browser
// tests and port's agent worktrees have no database, so local and test fall back to the
// sample when DATABASE_URL is unset (operator decision). Every other environment refuses
// to start without a URL (src/env.ts), so a deployed site can never show the sample.
export function usesSampleIdeas(e: Pick<Env, "APP_ENV" | "DATABASE_URL">): boolean {
  return (e.APP_ENV === "local" || e.APP_ENV === "test") && !e.DATABASE_URL;
}
