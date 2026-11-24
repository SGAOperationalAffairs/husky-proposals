"use server";

import { headers } from "next/headers";
import { reportThrows } from "@/app/_errors/reportThrows";
import { withSession } from "@/auth/gate";
import { isSameOrigin } from "@/core/sameOrigin";
import { prismaParticipationStore } from "@/db/participationStore";
import { db } from "@/db/runtime";
import { refreshPublicIdea } from "@/app/_ideas/refresh";
import { setParticipation } from "./setParticipation";

// The "I'll participate" action (#95): from our own origin, then a signed-in session
// (withSession), then the rules. Any signed-in student may offer.
type CrossOrigin = { ok: false; error: { code: "cross_origin" } };

async function isOwnOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"));
}

const crossOrigin: CrossOrigin = { ok: false, error: { code: "cross_origin" } };

// The abuse-limit bump and the write commit together. A rate_limited result is a return,
// not a throw, so its bump still commits. The public tags (the "will help" count is public)
// are refreshed after the commit, and only when a row changed.
const setParticipatingAsSession = withSession(async (session, raw: unknown) => {
  const result = await db().$transaction((tx) =>
    setParticipation(prismaParticipationStore(tx), session, raw, new Date()),
  );
  if (result.ok && result.refresh.length > 0) refreshPublicIdea(result.number);
  return result;
});

// Every exported action goes through reportThrows, so a throw shows on dev and preview (#191).
const setParticipatingReporting = reportThrows("setParticipating", async (raw: unknown) =>
  (await isOwnOrigin()) ? setParticipatingAsSession(raw) : crossOrigin,
);

export async function setParticipating(raw: unknown) {
  return setParticipatingReporting(raw);
}
