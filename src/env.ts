import { z } from "zod";

// The only place that reads process.env (CLAUDE.md, architecture rules).
// Validated when a server starts (src/instrumentation.ts), not at build time,
// because builds in CI and in port's worktrees have no secrets. Add each new
// variable here, with the feature that first needs it.
function postgresUrl(name: string) {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .regex(/^postgres(ql)?:\/\//, { error: `${name} must be a postgres:// or postgresql:// URL` })
      .optional(),
  );
}

// Pooled connection for the app at runtime, and direct connection for migrations (#43).
// Optional in the schema, so the Prisma CLI and offline commands run; the main schema
// below requires DATABASE_URL outside local and test (#60), so the server and browser
// tests start without a database but a deployed site does not. Empty means
// unset: GitHub Actions passes a missing secret as "". One definition, shared by the
// main schema and databaseUrls() below (#44).
const databaseUrlFields = z.object({
  DATABASE_URL: postgresUrl("DATABASE_URL"),
  DIRECT_URL: postgresUrl("DIRECT_URL"),
});

const schema = z
  .object({
    // Which deployment this is. Vercel sets it per environment.
    APP_ENV: z.enum(["local", "test", "preview", "dev", "production"], {
      error: "APP_ENV must be one of local, test, preview, dev, production",
    }),
    ...databaseUrlFields.shape,
    // The development sign-in stand-in (T0.6). "1" turns it on.
    AUTH_STAND_IN: z
      .enum(["0", "1"], { error: "AUTH_STAND_IN must be 1 or 0" })
      .optional()
      .transform((value) => value === "1"),
  })
  .refine((env) => !env.AUTH_STAND_IN || env.APP_ENV === "local" || env.APP_ENV === "test", {
    // Otherwise anyone could choose "I'm the VP" on a deployed site (dev-process.md).
    message: "The sign-in stand-in runs only when APP_ENV is local or test",
    path: ["AUTH_STAND_IN"],
  })
  .refine((env) => env.DATABASE_URL !== undefined || env.APP_ENV === "local" || env.APP_ENV === "test", {
    // A deployed site reads its ideas from the database (#60). Local and test fall back to
    // the sample ideas, so browser tests and agent worktrees need no database.
    message: "DATABASE_URL is required unless APP_ENV is local or test",
    path: ["DATABASE_URL"],
  });

export type Env = z.infer<typeof schema>;

function formatIssues(error: z.ZodError): string {
  const problems = error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
  return `Refusing to start. Fix the environment:\n${problems.join("\n")}`;
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) throw new Error(formatIssues(result.error));
  return result.data;
}

let cached: Env | undefined;

export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

// The Prisma CLI (prisma.config.ts, migrations, the seed) needs only these two URLs,
// and must not need APP_ENV: `prisma generate` runs at install time with no
// secrets. Missing is not an error here; the caller decides what to do (#44).
export function databaseUrls(source: Record<string, string | undefined> = process.env): {
  pooled: string | undefined;
  direct: string | undefined;
} {
  const result = databaseUrlFields.safeParse(source);
  if (!result.success) throw new Error(formatIssues(result.error));
  return { pooled: result.data.DATABASE_URL, direct: result.data.DIRECT_URL };
}

// The database test harness reads its own variables (issue 104). Separate from env()
// because the Vitest main process has no APP_ENV, and because tests must never
// read DATABASE_URL: a shell pointed at Neon dev can then never reach them.
const testDatabaseSchema = z.object({
  // Admin connection to the server that hosts one database per run.
  TEST_DATABASE_URL: postgresUrl("TEST_DATABASE_URL"),
  // Exact hostnames allowed besides localhost. Unset locally, which keeps local runs off Neon.
  TEST_DATABASE_ALLOWED_HOSTS: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean),
    ),
  // "1" makes a missing URL fail instead of skip. Set only in the CI database job.
  REQUIRE_TEST_DATABASE: z
    .enum(["0", "1"], { error: "REQUIRE_TEST_DATABASE must be 1 or 0" })
    .optional()
    .transform((value) => value === "1"),
  // Set by GitHub Actions. Names the run's database in CI.
  GITHUB_RUN_ID: z.string().optional(),
  GITHUB_RUN_ATTEMPT: z.string().optional(),
});

export type TestDatabaseEnv = z.infer<typeof testDatabaseSchema>;

export function parseTestDatabaseEnv(source: Record<string, string | undefined>): TestDatabaseEnv {
  const result = testDatabaseSchema.safeParse(source);
  if (!result.success) throw new Error(formatIssues(result.error));
  return result.data;
}

let cachedTestDatabase: TestDatabaseEnv | undefined;

export function testDatabaseEnv(): TestDatabaseEnv {
  cachedTestDatabase ??= parseTestDatabaseEnv(process.env);
  return cachedTestDatabase;
}
