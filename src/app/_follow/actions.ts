"use server";

import { headers } from "next/headers";
import type { Session } from "@/auth/contract";
import { reportThrows } from "@/app/_errors/reportThrows";
import { withSession } from "@/auth/gate";
import { isSameOrigin } from "@/core/sameOrigin";
import { prismaFollowStore } from "@/db/followStore";
import { db } from "@/db/runtime";
import { setFollow } from "./setFollow";

// The follow action (#101): from our own origin, then a signed-in session, then the
// rules. A request from another site is refused before the session is read. No cache
// tag is refreshed: the follower count is leaders only (publicStatsSelect leaves it out).
type CrossOrigin = { ok: false; error: { code: "cross_origin" } };

async function isOwnOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"));
}

const crossOrigin: CrossOrigin = { ok: false, error: { code: "cross_origin" } };

const setFollowingAsSession = withSession((session: Session, raw: unknown) =>
  setFollow(prismaFollowStore(db()), session, raw),
);

// Every exported action goes through reportThrows, so a throw shows on dev and preview (#191).
const setFollowingReporting = reportThrows("setFollowing", async (raw: unknown) =>
  (await isOwnOrigin()) ? setFollowingAsSession(raw) : crossOrigin,
);

export async function setFollowing(raw: unknown) {
  return setFollowingReporting(raw);
}
