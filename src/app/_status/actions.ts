"use server";

import { headers } from "next/headers";
import { reportThrows } from "@/app/_errors/reportThrows";
import { refreshPublicIdea } from "@/app/_ideas/refresh";
import type { Session } from "@/auth/contract";
import { withSession } from "@/auth/gate";
import { isSameOrigin } from "@/core/sameOrigin";
import { db } from "@/db/runtime";
import { prismaStatusStore } from "@/db/statusStore";
import { changeIdeaStatus, type StatusType } from "./changeIdeaStatus";

// The status actions (#98). Each is from our own origin, then a signed-in session
// (withSession), then the rules. A request from another site is refused before the
// session is read or anything is written. Who may change a board's ideas is checked in
// the rules, against the idea's stored board.
type CrossOrigin = { ok: false; error: { code: "cross_origin" } };

async function isOwnOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"));
}

const crossOrigin: CrossOrigin = { ok: false, error: { code: "cross_origin" } };

// The idea write, its system update, and the follower email rows commit together. The
// public pages are refreshed only after the commit, and never on a refusal.
async function change(session: Session, type: StatusType, raw: unknown) {
  const result = await db().$transaction((tx) =>
    changeIdeaStatus(prismaStatusStore(tx), session, type, raw, new Date()),
  );
  if (result.ok) refreshPublicIdea(result.number);
  return result;
}

const startAsSession = withSession((session, raw: unknown) => change(session, "start", raw));
const holdAsSession = withSession((session, raw: unknown) => change(session, "hold", raw));
const deliverAsSession = withSession((session, raw: unknown) => change(session, "deliver", raw));

// Every exported action goes through reportThrows, so a throw shows on dev and preview (#191).
const startReporting = reportThrows("startIdea", async (raw: unknown) =>
  (await isOwnOrigin()) ? startAsSession(raw) : crossOrigin,
);
const holdReporting = reportThrows("holdIdea", async (raw: unknown) =>
  (await isOwnOrigin()) ? holdAsSession(raw) : crossOrigin,
);
const deliverReporting = reportThrows("deliverIdea", async (raw: unknown) =>
  (await isOwnOrigin()) ? deliverAsSession(raw) : crossOrigin,
);

export async function startIdea(raw: unknown) {
  return startReporting(raw);
}

export async function holdIdea(raw: unknown) {
  return holdReporting(raw);
}

export async function deliverIdea(raw: unknown) {
  return deliverReporting(raw);
}
