"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { reportThrows } from "@/app/_errors/reportThrows";
import { endSession, startStandInSession } from "@/auth/session";
import { STAND_IN_SLUGS } from "@/auth/standIn";
import { isSameOrigin } from "@/core/sameOrigin";
import { safeNextPath } from "@/core/nextPath";

// Imported only by page.dev.tsx, so a production build never bundles it (#45).
// startStandInSession also refuses when the stand-in is off: a second guard.
// The SGA cookie domain is shared by every subdomain, so each action checks the origin
// like every other write, and goes through reportThrows like every action (#258).
const input = z.object({ user: z.enum(STAND_IN_SLUGS) });

async function isOwnOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"));
}

const signInAsReporting = reportThrows("signInAs", async (formData: FormData) => {
  // A request from another origin changes nothing and lands where the action normally does.
  if (!(await isOwnOrigin())) redirect("/stand-in");
  const parsed = input.safeParse({ user: formData.get("user") });
  // Invalid input is only reachable by tampering, so it changes nothing.
  if (!parsed.success) redirect("/stand-in");
  const started = await startStandInSession(parsed.data.user);
  if (!started.ok) redirect("/stand-in");
  // next is a form field, so it is untrusted: only a same-site path is followed (#93).
  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null) ?? "/stand-in");
});

const standInSignOutReporting = reportThrows("standInSignOut", async () => {
  if (await isOwnOrigin()) await endSession();
  redirect("/stand-in");
});

// Form actions must return void, so the wrapper's `unexpected` result is dropped; the
// throw is still logged under the action's name (#258).
export async function signInAs(formData: FormData): Promise<void> {
  await signInAsReporting(formData);
}

export async function signOut(): Promise<void> {
  await standInSignOutReporting();
}
