"use server";

import { headers } from "next/headers";
import { reportThrows } from "@/app/_errors/reportThrows";
import { refreshPublicIdea } from "@/app/_ideas/refresh";
import { withSession } from "@/auth/gate";
import { isSameOrigin } from "@/core/sameOrigin";
import { db } from "@/db/runtime";
import { prismaUpdateStore } from "@/db/updateStore";
import { postUpdate } from "./postUpdate";

// The post-update action (#130): from our own origin, then a signed-in session
// (withSession), then the rules. A request from another site is refused before the session
// is read or anything is written. Who may post is checked in the rules, against the idea's
// stored board.
type CrossOrigin = { ok: false; error: { code: "cross_origin" } };

async function isOwnOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"));
}

const crossOrigin: CrossOrigin = { ok: false, error: { code: "cross_origin" } };

// The update, the leader's user row, and any follower email rows commit together. The idea
// page is refreshed only after the commit, and never on a refusal.
const postAsSession = withSession(async (session, raw: unknown) => {
  const result = await db().$transaction((tx) => postUpdate(prismaUpdateStore(tx), session, raw, new Date()));
  if (result.ok) refreshPublicIdea(result.number);
  return result;
});

// Every exported action goes through reportThrows, so a throw shows on dev and preview (#191).
const postReporting = reportThrows("postUpdate", async (raw: unknown) =>
  (await isOwnOrigin()) ? postAsSession(raw) : crossOrigin,
);

export async function postUpdateAction(raw: unknown) {
  return postReporting(raw);
}
