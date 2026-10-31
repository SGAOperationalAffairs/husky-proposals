"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, startStandInSession } from "@/auth/session";
import { STAND_IN_SLUGS } from "@/auth/standIn";

// Imported only by page.dev.tsx, so a production build never bundles it (#45).
// startStandInSession also refuses when the stand-in is off: a second guard.
// Next's built-in Server Action origin check covers same-origin writes.
const input = z.object({ user: z.enum(STAND_IN_SLUGS) });

export async function signInAs(formData: FormData): Promise<void> {
  const parsed = input.safeParse({ user: formData.get("user") });
  // Invalid input is only reachable by tampering, so it changes nothing.
  if (parsed.success) await startStandInSession(parsed.data.user);
  redirect("/stand-in");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/stand-in");
}
