"use server";

import { headers } from "next/headers";
import type { Session } from "@/auth/contract";
import { reportThrows } from "@/app/_errors/reportThrows";
import { withSession } from "@/auth/gate";
import { isSameOrigin } from "@/core/sameOrigin";
import { prismaEmailSettingsStore } from "@/db/emailSettingsStore";
import { db } from "@/db/runtime";
import { setEmailSetting } from "./setEmailSetting";

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
