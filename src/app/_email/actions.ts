"use server";

import { headers } from "next/headers";
import type { Session } from "@/auth/contract";
import { reportThrows } from "@/app/_errors/reportThrows";
import { usesSampleIdeas } from "@/app/_ideas/source";
import { withSession } from "@/auth/gate";
import type { Unexpected } from "@/core/errorReport";
import { isSameOrigin } from "@/core/sameOrigin";
import { prismaEmailSettingsStore } from "@/db/emailSettingsStore";
import { db } from "@/db/runtime";
import { env } from "@/env";
import { setEmailSetting } from "./setEmailSetting";
import { unsubscribe, type UnsubscribeResult } from "./unsubscribe";

// The notification setting action (#211): from our own origin, then a signed-in session,
// then the rule. A request from another site is refused before the session is read. It
// writes only the signed-in student's own rows, so there is no transaction, and no cache
// tag is refreshed: nothing public depends on it.
type CrossOrigin = { ok: false; error: { code: "cross_origin" } };

async function isOwnOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"));
}

const crossOrigin: CrossOrigin = { ok: false, error: { code: "cross_origin" } };

const setEmailSettingAsSession = withSession((session: Session, raw: unknown) =>
  setEmailSetting(prismaEmailSettingsStore(db()), session, raw),
);

// Every exported action goes through reportThrows, so a throw shows on dev and preview (#191).
const setEmailSettingReporting = reportThrows("setEmailSetting", async (raw: unknown) =>
  (await isOwnOrigin()) ? setEmailSettingAsSession(raw) : crossOrigin,
);

export async function setEmailSettingAction(raw: unknown) {
  return setEmailSettingReporting(raw);
}

// Stopping the digest from the link in an email (#212). No session: the signed token is
// the authorization. It still must come from our own origin, because the SGAuth cookie is
// shared by every SGA subdomain and a state-changing request must be ours (CLAUDE.md), and
// the page only ever shows the confirm button after a GET that wrote nothing.
//
// The first argument is the previous state, because the confirm form runs this through
// useActionState, which also lets the form work with no JavaScript. Only the token field
// is read from the form: no user id or type is ever taken from the request.
export type UnsubscribeOutcome = UnsubscribeResult | CrossOrigin;

const unsubscribeReporting = reportThrows(
  "unsubscribe",
  async (raw: unknown): Promise<UnsubscribeOutcome> => {
    if (!(await isOwnOrigin())) return crossOrigin;
    const settings = env();
    // A local run or browser test with no database: nothing to write, so the preview of the
    // done state works and db() is never touched.
    if (usesSampleIdeas(settings)) return { ok: true, type: "digest" };
    return unsubscribe(prismaEmailSettingsStore(db()), settings.EMAIL_LINK_SECRET, raw);
  },
);

export async function unsubscribeAction(
  _previous: UnsubscribeOutcome | Unexpected | null,
  formData: FormData,
): Promise<UnsubscribeOutcome | Unexpected> {
  return unsubscribeReporting({ token: formData.get("token") });
}
