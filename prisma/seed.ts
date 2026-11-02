import { databaseUrls } from "../src/env";
import { createPrismaClient } from "../src/db/client";
import { assertSeedable, seed } from "../src/db/seed";

// `prisma db seed` (#44). Runs as a separate process, so it reads its own environment:
// APP_ENV must be local or test, and one of the URLs must be set. Prefers the direct
// connection, like migrations do.
async function main(): Promise<void> {
  assertSeedable(process.env.APP_ENV);
  const { pooled, direct } = databaseUrls();
  const url = direct ?? pooled;
  if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL to seed (#44).");
  const client = createPrismaClient(url);
  try {
    await seed(client, { now: new Date() });
    console.log("Seeded the local test data (#44).");
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
