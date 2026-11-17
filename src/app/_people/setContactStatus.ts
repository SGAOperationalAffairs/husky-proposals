import { z } from "zod";
import type { BoardCode } from "@/core/boards";
import { can, type Viewer } from "@/core/permissions";
import type { ContactStatus } from "@/core/people";

// Joined and Not now from the People list (#129). The rules live here, away from Next.js, so the
// tests run without a server. The store is passed in; the Prisma one is src/db/peopleStore.ts.

export type ContactStore = {
  findParticipation(userId: string, ideaId: string): Promise<{ boardId: BoardCode } | null>;
  setStatus(userId: string, ideaId: string, status: ContactStatus): Promise<void>;
};

// Only these two come from the list's buttons. Contacted is set by Message, which waits on #101.
const inputSchema = z.object({
  userId: z.uuid(),
  ideaId: z.uuid(),
  status: z.enum(["joined", "later"]),
});

export type SetContactResult = { ok: true } | { ok: false; error: { code: "invalid" | "not_found" } };

export async function setContactStatus(
  store: ContactStore,
  viewer: Viewer,
  raw: unknown,
): Promise<SetContactResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "invalid" } };
  const { userId, ideaId, status } = parsed.data;

  // Missing row and no permission return the same answer, so the list cannot be probed.
  const row = await store.findParticipation(userId, ideaId);
  if (!row || !can(viewer, "see_people", row.boardId)) return { ok: false, error: { code: "not_found" } };

  await store.setStatus(userId, ideaId, status);
  return { ok: true };
}
