import { defineConfig } from "prisma/config";
import { databaseUrls } from "./src/env";

// Prisma CLI config (#26, #44). Migrations use the direct connection; the app uses
// the pooled one through the Postgres adapter (src/db/). Offline commands such
// as `prisma generate` and `prisma validate` never connect, but Prisma 7 still
// requires a URL, so a placeholder stands in when none is set (build-plan T0.5).
// The URLs go through src/env.ts, so a malformed one stops the CLI, as it stops the app.
const PLACEHOLDER = "postgresql://placeholder:placeholder@localhost:5432/placeholder";
const { pooled, direct } = databaseUrls();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    url: direct ?? pooled ?? PLACEHOLDER,
  },
});
