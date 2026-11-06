"use server";

import { headers } from "next/headers";
import type { Session } from "@/auth/contract";
import { withSession } from "@/auth/gate";
import { getSession } from "@/auth/session";
import { isSameOrigin } from "@/core/sameOrigin";
import { prismaOwnPostStore } from "@/db/ownPostStore";
import { prismaPostStore } from "@/db/postStore";
import { db } from "@/db/runtime";
import { resubmitPost, withdrawPost } from "./ownPost";
import { submitPost, type SubmitResult } from "./submitPost";

// The post actions (#54, #56): from our own origin, then the rules. A request from
// another site is refused before anything is read or written.
type CrossOrigin = { ok: false; error: { code: "cross_origin" } };

async function isOwnOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"));
}

const crossOrigin: CrossOrigin = { ok: false, error: { code: "cross_origin" } };

export async function postIdea(raw: unknown): Promise<SubmitResult | CrossOrigin> {
  if (!(await isOwnOrigin())) return crossOrigin;
  return submitPost(prismaPostStore(db()), await getSession(), raw, new Date());
}

// Pending, declined, and withdrawn posts are never public, so neither action
// refreshes a cached page. The guarded write and the revision commit together.
const resubmitAsSession = withSession((session: Session, raw: unknown) =>
  db().$transaction((tx) => resubmitPost(prismaOwnPostStore(tx), session, raw, new Date())),
);
const withdrawAsSession = withSession((session: Session, raw: unknown) =>
  db().$transaction((tx) => withdrawPost(prismaOwnPostStore(tx), session, raw)),
);

export async function resubmitIdea(raw: unknown) {
  return (await isOwnOrigin()) ? resubmitAsSession(raw) : crossOrigin;
}

export async function withdrawIdea(raw: unknown) {
  return (await isOwnOrigin()) ? withdrawAsSession(raw) : crossOrigin;
}
