import { defineConfig } from "prisma/config";

// Prisma CLI config (#26). Migrations use the direct connection; the app uses
// the pooled one through the Postgres adapter (src/db/). Offline commands such
// as `prisma generate` and `prisma validate` never connect, but Prisma 7 still
// requires a URL, so a placeholder stands in when none is set (build-plan T0.5).
const PLACEHOLDER = "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? PLACEHOLDER,
  },
});
