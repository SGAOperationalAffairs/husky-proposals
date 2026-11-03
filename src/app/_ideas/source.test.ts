import { describe, expect, it } from "vitest";
import { usesSampleIdeas } from "./source";

describe("where the ideas come from (#60)", () => {
  const URL = "postgresql://user:pw@host-pooler.example.com/db";

  it("uses the sample only in local and test with no database URL", () => {
    expect(usesSampleIdeas({ APP_ENV: "local", DATABASE_URL: undefined })).toBe(true);
    expect(usesSampleIdeas({ APP_ENV: "test", DATABASE_URL: undefined })).toBe(true);
  });

  it("reads the database whenever a URL is set, in every environment", () => {
    for (const APP_ENV of ["local", "test", "preview", "dev", "production"] as const) {
      expect(usesSampleIdeas({ APP_ENV, DATABASE_URL: URL }), APP_ENV).toBe(false);
    }
  });

  it("never uses the sample in a deployed environment, even with no URL", () => {
    for (const APP_ENV of ["preview", "dev", "production"] as const) {
      expect(usesSampleIdeas({ APP_ENV, DATABASE_URL: undefined }), APP_ENV).toBe(false);
    }
  });
});
