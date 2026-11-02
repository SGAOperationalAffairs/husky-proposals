"use server";

import { headers } from "next/headers";
import { getSession } from "@/auth/session";
import { isSameOrigin } from "@/core/sameOrigin";
import { prismaPostStore } from "@/db/postStore";
import { db } from "@/db/runtime";
import { submitPost, type SubmitResult } from "./submitPost";

// The post action (#54): from our own origin, then the rules in submitPost. A request
// from another site is refused before anything is read or written.
export async function postIdea(
  raw: unknown,
): Promise<SubmitResult | { ok: false; error: { code: "cross_origin" } }> {
  const requestHeaders = await headers();
  if (!isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"))) {
    return { ok: false, error: { code: "cross_origin" } };
  }
  return submitPost(prismaPostStore(db()), await getSession(), raw, new Date());
}
