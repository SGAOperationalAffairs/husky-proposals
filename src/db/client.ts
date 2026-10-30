import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 connects through the Postgres adapter. Pass the pooled URL at runtime
// and the direct URL only for migrations (prisma.config.ts). No singleton yet:
// T0.5 adds the runtime one when the app first queries (#43).
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
