"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { endSession } from "@/auth/session";
import { isSameOrigin } from "@/core/sameOrigin";

// Sign-out for the local stand-in (#177). The SGA cookie domain is shared by every
// subdomain, so a request from another origin changes nothing. SGAuth's own sign-out
// is a link (signOutUrl), never this action.
export async function signOut(): Promise<void> {
  const requestHeaders = await headers();
  if (isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"))) await endSession();
  redirect("/");
}
