import { createHash, timingSafeEqual } from "node:crypto";

// The guard shared by every scheduled route under /api/jobs (#210). Plain TypeScript: no
// Next.js and no database, so the rule is unit tested on its own.

type Authorization = { ok: true } | { ok: false; status: 401 | 503 };

const BEARER = /^Bearer (.+)$/;

const digest = (value: string) => createHash("sha256").update(value).digest();

// Secret unset: 503, so a deploy without one is visibly broken and never open. Header
// missing, not `Bearer <token>`, or wrong: 401. Comparing SHA-256 digests means both sides
// always have the same length, so the comparison neither throws nor leaks the secret's length.
export function authorizeJob(authorization: string | null, secret: string | undefined): Authorization {
  if (!secret) return { ok: false, status: 503 };
  const token = authorization === null ? undefined : BEARER.exec(authorization)?.[1];
  if (token === undefined || !timingSafeEqual(digest(token), digest(secret))) {
    return { ok: false, status: 401 };
  }
  return { ok: true };
}

// `run` is called only after the secret checks out, so a rejected request reads and writes
// nothing. A throw from `run` propagates: the route answers 500 and the workflow run fails.
export async function handleJobRequest<T extends Record<string, unknown>>({
  authorization,
  secret,
  run,
}: {
  authorization: string | null;
  secret: string | undefined;
  run: () => Promise<T>;
}): Promise<{ status: number; body: { ok: boolean } & Partial<T> }> {
  const auth = authorizeJob(authorization, secret);
  // A rejection carries none of T's fields, which is why they are all optional in the body.
  if (!auth.ok) return { status: auth.status, body: { ok: false } as { ok: boolean } & Partial<T> };
  return { status: 200, body: { ok: true, ...(await run()) } };
}
