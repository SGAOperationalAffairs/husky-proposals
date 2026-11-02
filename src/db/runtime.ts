import { databaseUrls } from "@/env";
import { createPrismaClient } from "./client";
import type { PrismaClient } from "@/generated/prisma/client";

// The app's one Prisma client, made on first use (#54). Pooled URL, as the runtime
// rule says; migrations use the direct URL through prisma.config.ts.
let client: PrismaClient | undefined;

export function db(): PrismaClient {
  if (!client) {
    const { pooled } = databaseUrls();
    if (!pooled) throw new Error("DATABASE_URL is not set, so the app cannot reach the database (#54).");
    client = createPrismaClient(pooled);
  }
  return client;
}
