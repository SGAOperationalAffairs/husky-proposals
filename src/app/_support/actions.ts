"use server";

import { headers } from "next/headers";
import { reportThrows } from "@/app/_errors/reportThrows";
import { withSession } from "@/auth/gate";
import { isSameOrigin } from "@/core/sameOrigin";
import { db } from "@/db/runtime";
import { prismaSupportStore } from "@/db/supportStore";
import { refreshPublicIdea } from "@/app/_ideas/refresh";
import { setSupport as applySupport } from "./setSupport";

// The support action (#94): from our own origin, then a signed-in session (withSession),
// then the rules. Any signed-in student may support, so there is no role check.
type CrossOrigin = { ok: false; error: { code: "cross_origin" } };

async function isOwnOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"));
}

const crossOrigin: CrossOrigin = { ok: false, error: { code: "cross_origin" } };

// The abuse-limit bump, its trim, and the write commit together. A rate_limited result
// is a return, not a throw, so its bump still commits and a script stays blocked. The
// public tags are refreshed after the commit, and only when a row changed.
const setSupportAsSession = withSession(async (session, raw: unknown) => {
  const result = await db().$transaction((tx) =>
    applySupport(prismaSupportStore(tx), session, raw, new Date()),
  );
  if (result.ok && result.refresh.length > 0) refreshPublicIdea(result.number);
  return result;
});

// Every exported action goes through reportThrows, so a throw shows on dev and preview (#191).
const setSupportReporting = reportThrows("setSupport", async (raw: unknown) =>
  (await isOwnOrigin()) ? setSupportAsSession(raw) : crossOrigin,
);

export async function setSupport(raw: unknown) {
  return setSupportReporting(raw);
}
