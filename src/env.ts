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

function optional<T extends z.ZodType>(inner: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), inner.optional());
}

// RFC 6265 token characters: a cookie name with ; = , or a space cannot be forwarded as a header.
const COOKIE_NAME = /^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/;

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
    // SGAuth sign-in (#177). Only on dev.proposals until T2.5 is merged and deployed.
    AUTH_SGAUTH: z
      .enum(["0", "1"], { error: "AUTH_SGAUTH must be 1 or 0" })
      .optional()
      .transform((value) => value === "1"),
    // Empty means unset, as for the database URLs. Required only when AUTH_SGAUTH is on.
    SGAUTH_URL: optional(z.url({ error: "SGAUTH_URL must be a URL" })),
    SGAUTH_COOKIE_NAME: optional(
      z.string().regex(COOKIE_NAME, {
        error: "SGAUTH_COOKIE_NAME may hold only letters, digits, and !#$%&'*+-.^_`|~",
      }),
    ),
    // Email through Resend (#209). Required on dev and production (see the refines below):
    // the scheduled send needs a mailer and the site's address (#210). Optional elsewhere,
    // so local, test, and preview start without them.
    RESEND_API_KEY: optional(z.string().startsWith("re_", { error: "RESEND_API_KEY must start with re_" })),
    // "Name <address@domain>" or a bare address.
    EMAIL_FROM: optional(
      z.string().regex(/^([^<>@\r\n]+ <[^<>@\s]+@[^<>@\s]+>|[^<>@\s]+@[^<>@\s]+)$/, {
        error: "EMAIL_FROM must be an address, or Name <address>",
      }),
    ),
    // The Svix signing secret of the Resend webhook, checked on /api/webhooks/resend.
    RESEND_WEBHOOK_SECRET: optional(
      z.string().startsWith("whsec_", { error: "RESEND_WEBHOOK_SECRET must start with whsec_" }),
    ),
    // The bearer secret every scheduled route under /api/jobs checks (#210).
    JOBS_SECRET: optional(z.string().min(32, { error: "JOBS_SECRET must be at least 32 characters" })),
    // The site's own address, for links in email. Reduced to its origin so a trailing slash
    // or a path never doubles up in a link (#210).
    SITE_URL: optional(
      z.url({ error: "SITE_URL must be a URL" }).transform((value) => new URL(value).origin),
    ),
  })
  .refine((env) => (env.RESEND_API_KEY === undefined) === (env.EMAIL_FROM === undefined), {
    // Half a sender config would fail at the first send, so refuse at start instead.
    message: "RESEND_API_KEY and EMAIL_FROM must be set together",
    path: ["EMAIL_FROM"],
  })
  .superRefine((env, context) => {
    // The scheduled send runs on dev and production, so a deploy without these would
    // queue email that never goes out (#210). One issue per variable, so each is named.
    if (env.APP_ENV !== "dev" && env.APP_ENV !== "production") return;
    for (const name of ["RESEND_API_KEY", "EMAIL_FROM", "JOBS_SECRET", "SITE_URL"] as const) {
      if (env[name] === undefined) {
        context.addIssue({
          code: "custom",
          message: `${name} is required when APP_ENV is dev or production`,
          path: [name],
        });
      }
    }
    if (env.SITE_URL !== undefined && !env.SITE_URL.startsWith("https://")) {
      context.addIssue({
        code: "custom",
        message: "SITE_URL must be an https:// URL when APP_ENV is dev or production",
        path: ["SITE_URL"],
      });
    }
  })
  .refine((env) => !env.AUTH_STAND_IN || env.APP_ENV === "local" || env.APP_ENV === "test", {
    // Otherwise anyone could choose "I'm the VP" on a deployed site (dev-process.md).
    message: "The sign-in stand-in runs only when APP_ENV is local or test",
    path: ["AUTH_STAND_IN"],
  })
  .refine((env) => !env.AUTH_SGAUTH || env.APP_ENV === "dev", {
    // Production must not use the SGAuth client until T2.5 is merged and deployed (#177),
    // and a *.vercel.app preview cannot use sign-in (its origin is not registered).
    message: "SGAuth sign-in runs only when APP_ENV is dev until T2.5",
    path: ["AUTH_SGAUTH"],
  })
  .refine((env) => !env.AUTH_SGAUTH || env.SGAUTH_URL !== undefined, {
    message: "SGAUTH_URL is required when AUTH_SGAUTH is 1",
    path: ["SGAUTH_URL"],
  })
  .refine((env) => !env.AUTH_SGAUTH || env.SGAUTH_COOKIE_NAME !== undefined, {
    message: "SGAUTH_COOKIE_NAME is required when AUTH_SGAUTH is 1",
    path: ["SGAUTH_COOKIE_NAME"],
  })
  .refine(
    (env) => !env.AUTH_SGAUTH || env.SGAUTH_URL === undefined || env.SGAUTH_URL.startsWith("https://"),
    {
      message: "SGAUTH_URL must be an https:// URL when AUTH_SGAUTH is 1",
      path: ["SGAUTH_URL"],
    },
  )
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
