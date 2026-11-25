"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { reportThrows } from "@/app/_errors/reportThrows";
import type { Session } from "@/auth/contract";
import { withSession } from "@/auth/gate";
import { isSameOrigin } from "@/core/sameOrigin";
import { prismaBoardSettingsStore } from "@/db/boardSettingsStore";
import { prismaEditReviewStore } from "@/db/editReviewStore";
import { prismaReviewStore } from "@/db/reviewStore";
import { db } from "@/db/runtime";
import { changeReviewDueDays } from "./changeReviewDueDays";
import { decideEdit, type DecideEditResult, type EditDecisionType } from "./decideEdit";
import { AlreadyDecidedError, decidePost, type DecideResult, type DecisionType } from "./decidePost";

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
// only after the commit, and never on a refusal. A duplicate decision caught after the
// idea was updated throws AlreadyDecidedError, which rolls the transaction back; it is
// mapped to a result here, outside the transaction (#257).
async function decide(session: Session, type: DecisionType, raw: unknown): Promise<DecideResult> {
  let result: DecideResult;
  try {
    result = await db().$transaction((tx) =>
      decidePost(prismaReviewStore(tx), session, type, raw, new Date()),
    );
  } catch (error) {
    if (error instanceof AlreadyDecidedError) return { ok: false, error: { code: "already_decided" } };
    throw error;
  }
  if (result.ok) for (const tag of result.refresh) updateTag(tag);
  return result;
}

// The same shape for a decision on an author's edit to an approved post (#295). Only an
// approval refreshes the public tags; a decline leaves the approved version as it was.
async function decideEditAs(
  session: Session,
  type: EditDecisionType,
  raw: unknown,
): Promise<DecideEditResult> {
  let result: DecideEditResult;
  try {
    result = await db().$transaction((tx) =>
      decideEdit(prismaEditReviewStore(tx), session, type, raw, new Date()),
    );
  } catch (error) {
    if (error instanceof AlreadyDecidedError) return { ok: false, error: { code: "already_decided" } };
    throw error;
  }
  if (result.ok) for (const tag of result.refresh) updateTag(tag);
  return result;
}

const approveEditAsSession = withSession((session, raw: unknown) => decideEditAs(session, "approve", raw));
const declineEditAsSession = withSession((session, raw: unknown) => decideEditAs(session, "decline", raw));

const approveAsSession = withSession((session, raw: unknown) => decide(session, "approve", raw));
const declineAsSession = withSession((session, raw: unknown) => decide(session, "decline", raw));
const sendBackAsSession = withSession((session, raw: unknown) => decide(session, "send_back", raw));
const takeDownAsSession = withSession((session, raw: unknown) => decide(session, "take_down", raw));
// One write, so no transaction. Nothing is cached around the setting.
const setDueDaysAsSession = withSession((session, raw: unknown) =>
  changeReviewDueDays(prismaBoardSettingsStore(db()), session, raw),
);

// Every exported action goes through reportThrows, so a throw shows on dev and preview (#191).
const approveReporting = reportThrows("approvePost", async (raw: unknown) =>
  (await isOwnOrigin()) ? approveAsSession(raw) : crossOrigin,
);
const declineReporting = reportThrows("declinePost", async (raw: unknown) =>
  (await isOwnOrigin()) ? declineAsSession(raw) : crossOrigin,
);
const sendBackReporting = reportThrows("sendBackPost", async (raw: unknown) =>
  (await isOwnOrigin()) ? sendBackAsSession(raw) : crossOrigin,
);
const takeDownReporting = reportThrows("takeDownPost", async (raw: unknown) =>
  (await isOwnOrigin()) ? takeDownAsSession(raw) : crossOrigin,
);
const approveEditReporting = reportThrows("approveEdit", async (raw: unknown) =>
  (await isOwnOrigin()) ? approveEditAsSession(raw) : crossOrigin,
);
const declineEditReporting = reportThrows("declineEdit", async (raw: unknown) =>
  (await isOwnOrigin()) ? declineEditAsSession(raw) : crossOrigin,
);
const setDueDaysReporting = reportThrows("setReviewDueDays", async (raw: unknown) =>
  (await isOwnOrigin()) ? setDueDaysAsSession(raw) : crossOrigin,
);

export async function approvePost(raw: unknown) {
  return approveReporting(raw);
}

export async function declinePost(raw: unknown) {
  return declineReporting(raw);
}

export async function sendBackPost(raw: unknown) {
  return sendBackReporting(raw);
}

export async function takeDownPost(raw: unknown) {
  return takeDownReporting(raw);
}

export async function approveEdit(raw: unknown) {
  return approveEditReporting(raw);
}

export async function declineEdit(raw: unknown) {
  return declineEditReporting(raw);
}

export async function setReviewDueDays(raw: unknown) {
  return setDueDaysReporting(raw);
}
