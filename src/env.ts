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

const schema = z
  .object({
    // Which deployment this is. Vercel sets it per environment.
    APP_ENV: z.enum(["local", "test", "preview", "dev", "production"], {
      error: "APP_ENV must be one of local, test, preview, dev, production",
    }),
    // Pooled connection for the app at runtime, and direct connection for migrations (#43).
    // Optional until src/db first queries (T0.5), so the server and browser tests start
    // without a database. Empty means unset: GitHub Actions passes a missing secret as "".
    DATABASE_URL: postgresUrl("DATABASE_URL"),
    DIRECT_URL: postgresUrl("DIRECT_URL"),
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
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Refusing to start. Fix the environment:\n${problems.join("\n")}`);
  }
  return result.data;
}

let cached: Env | undefined;

export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
