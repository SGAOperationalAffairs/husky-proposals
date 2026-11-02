import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { testDatabaseEnv } from "./src/env";

const alias = {
  "@design": fileURLToPath(new URL("./design", import.meta.url)),
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

// Two kinds of fast tests, both with fakes for every outside service:
// unit tests (*.test.ts, plain Node) and component tests (*.test.tsx, jsdom).
// Database tests (*.db.test.ts) need a Postgres server: a local one, or the Neon
// test branch in CI's database job. They read TEST_DATABASE_URL, never DATABASE_URL,
// and skip with a printed reason when it is unset. Only the database job sets
// REQUIRE_TEST_DATABASE, which turns a missing URL into a failure (#104).
// Vitest does not read .env.local: export TEST_DATABASE_URL in your shell to run them.
const { TEST_DATABASE_URL, REQUIRE_TEST_DATABASE } = testDatabaseEnv();
if (!TEST_DATABASE_URL) {
  if (REQUIRE_TEST_DATABASE) {
    throw new Error(
      "REQUIRE_TEST_DATABASE is set but TEST_DATABASE_URL is not. CI reads it from the NEON_TEST_DIRECT_URL secret (#104).",
    );
  }
  console.log(
    "Database tests skipped: TEST_DATABASE_URL is not set. Point it at a local Postgres to run them (docs/ENGINEERING.md, #104).",
  );
}

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
          exclude: ["**/*.db.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "component",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "database",
          environment: "node",
          include: ["src/**/*.db.test.ts"],
          env: { APP_ENV: "test" },
          testTimeout: 20_000,
          hookTimeout: 20_000,
          globalSetup: ["src/db/testing/globalSetup.ts"],
          // One run database shared by every file, so they take turns.
          fileParallelism: false,
        },
      },
    ],
  },
});
