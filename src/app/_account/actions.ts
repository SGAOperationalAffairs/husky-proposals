"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { reportThrows } from "@/app/_errors/reportThrows";
import { endSession } from "@/auth/session";
import { isSameOrigin } from "@/core/sameOrigin";

// Sign-out for the local stand-in (#177). The SGA cookie domain is shared by every
// subdomain, so a request from another origin changes nothing. SGAuth's own sign-out
// is a link (signOutUrl), never this action. It goes through reportThrows like every
// action (#191, #258).
const signOutReporting = reportThrows("signOut", async () => {
  const requestHeaders = await headers();
  if (isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"))) await endSession();
  redirect("/");
});

// A form action must return void, so the wrapper's `unexpected` result is dropped. The
// throw is already logged under the action's name (#258).
export async function signOut(): Promise<void> {
  await signOutReporting();
}
