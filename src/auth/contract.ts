import { z } from "zod";
import { rolesFromPositions, type Roles } from "@/core/positions";

// The 200 body of SGAuth's GET /api/sgauth/session (SGAOperations/auth#40).
// Not strict: a field SGAuth adds later is stripped instead of signing
// everyone out. isAdmin and isPrimaryAdmin are deliberately not read, because
// SGAuth admin grants nothing here (#45).
export const sgauthSessionSchema = z.object({
  user: z.object({
    id: z.uuid(),
    email: z.string().min(1),
    name: z.string().min(1),
    preferredName: z.string().nullable(),
  }),
  positions: z.array(z.object({ key: z.string().min(1), name: z.string() })).max(50),
  session: z.object({
    id: z.string(),
    expiresAt: z.iso.datetime(),
    absoluteExpiresAt: z.iso.datetime(),
    createdAt: z.iso.datetime(),
  }),
});

export type Session = {
  user: { id: string; email: string; name: string };
  positions: { key: string; name: string }[];
  roles: Roles;
};

export type SessionResult =
  { ok: true; session: Session } | { ok: false; error: { code: "invalid_session_response" } };

// Every body goes through here, the stand-in's included, so a real SGAuth
// body takes the same path. An invalid body is never a partial session.
export function toSession(body: unknown): SessionResult {
  const parsed = sgauthSessionSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: { code: "invalid_session_response" } };
  const { user, positions } = parsed.data;
  return {
    ok: true,
    session: {
      user: { id: user.id, email: user.email, name: user.preferredName ?? user.name },
      positions,
      roles: rolesFromPositions(positions.map((position) => position.key)),
    },
  };
}
