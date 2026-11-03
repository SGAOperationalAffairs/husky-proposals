"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import type { Session } from "@/auth/contract";
import { withSession } from "@/auth/gate";
import { isSameOrigin } from "@/core/sameOrigin";
import { prismaBoardSettingsStore } from "@/db/boardSettingsStore";
import { prismaReviewStore } from "@/db/reviewStore";
import { db } from "@/db/runtime";
import { changeReviewDueDays } from "./changeReviewDueDays";
import { decidePost, type DecisionType } from "./decidePost";

// The review actions (#58). Each is from our own origin, then a signed-in session
// (withSession), then the rules. A request from another site is refused before the
// session is read or anything is written. Who may review is checked in the rules,
// against the idea's board.
type CrossOrigin = { ok: false; error: { code: "cross_origin" } };

async function isOwnOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"));
}

const crossOrigin: CrossOrigin = { ok: false, error: { code: "cross_origin" } };

// The idea write and its review row commit together. The public tags are refreshed
// only after the commit, and never on a refusal.
async function decide(session: Session, type: DecisionType, raw: unknown) {
  const result = await db().$transaction((tx) =>
    decidePost(prismaReviewStore(tx), session, type, raw, new Date()),
  );
  if (result.ok) for (const tag of result.refresh) updateTag(tag);
  return result;
}

const approveAsSession = withSession((session, raw: unknown) => decide(session, "approve", raw));
const declineAsSession = withSession((session, raw: unknown) => decide(session, "decline", raw));
const takeDownAsSession = withSession((session, raw: unknown) => decide(session, "take_down", raw));
// One write, so no transaction. Nothing is cached around the setting.
const setDueDaysAsSession = withSession((session, raw: unknown) =>
  changeReviewDueDays(prismaBoardSettingsStore(db()), session, raw),
);

export async function approvePost(raw: unknown) {
  return (await isOwnOrigin()) ? approveAsSession(raw) : crossOrigin;
}

export async function declinePost(raw: unknown) {
  return (await isOwnOrigin()) ? declineAsSession(raw) : crossOrigin;
}

export async function takeDownPost(raw: unknown) {
  return (await isOwnOrigin()) ? takeDownAsSession(raw) : crossOrigin;
}

export async function setReviewDueDays(raw: unknown) {
  return (await isOwnOrigin()) ? setDueDaysAsSession(raw) : crossOrigin;
}
