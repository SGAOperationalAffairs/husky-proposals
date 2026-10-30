import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = {
  "@design": fileURLToPath(new URL("./design", import.meta.url)),
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

// Two kinds of fast tests, both with fakes for every outside service:
// unit tests (*.test.ts, plain Node) and component tests (*.test.tsx, jsdom).
// Database tests (*.db.test.ts) need the Neon test branch and run only in CI.
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
    ],
  },
});
