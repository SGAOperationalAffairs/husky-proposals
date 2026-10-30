import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = {
  "@design": fileURLToPath(new URL("./design", import.meta.url)),
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

// Two kinds of fast tests, both with fakes for every outside service:
// unit tests (*.test.ts, plain Node) and component tests (*.test.tsx, jsdom).
// Database tests (*.db.test.ts) need the Neon test branch. They skip with a
// printed reason when DATABASE_URL is unset, and CI refuses to skip (#43).
// Vitest does not read .env.local: export DATABASE_URL in your shell to run them.
if (!process.env.DATABASE_URL) {
  if (process.env.CI) {
    throw new Error("CI needs the NEON_TEST_DATABASE_URL secret to run database tests (#43).");
  }
  console.log(
    "Database tests skipped: DATABASE_URL is not set. CI runs them against the Neon test branch (#43).",
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
          // Few files, and one connection pool each is plenty against a shared branch.
          fileParallelism: false,
        },
      },
    ],
  },
});
