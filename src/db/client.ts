import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 connects through the Postgres adapter. Pass the pooled URL at runtime
// and the direct URL only for migrations (prisma.config.ts). The runtime singleton
// is in runtime.ts (#54).
//
// `onQuery` runs once per query the client sends. Only the query-count test passes it
// (#60), so the app's client does not log or listen.
export function createPrismaClient(
  connectionString: string,
  options?: { onQuery?: () => void },
): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  const { onQuery } = options ?? {};
  if (!onQuery) return new PrismaClient({ adapter });
  const client = new PrismaClient({ adapter, log: [{ emit: "event", level: "query" }] });
  client.$on("query", onQuery);
  return client;
}
