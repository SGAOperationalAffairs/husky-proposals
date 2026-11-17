"use server";

import { headers } from "next/headers";
import { reportThrows } from "@/app/_errors/reportThrows";
import { withSession } from "@/auth/gate";
import { isSameOrigin } from "@/core/sameOrigin";
import { db } from "@/db/runtime";
import { prismaContactStore } from "@/db/peopleStore";
import { setContactStatus } from "./setContactStatus";

// The People list's Joined and Not now actions (#129). Same-origin first, then a signed-in
// session, then the rules. The rules check the People permission for the idea's board.
const crossOrigin = { ok: false, error: { code: "cross_origin" } } as const;

async function isOwnOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  return isSameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"));
}

const asSession = withSession((session, raw: unknown) =>
  setContactStatus(prismaContactStore(db()), { user: { id: session.user.id }, roles: session.roles }, raw),
);

const reporting = reportThrows("setContactStatus", async (raw: unknown) =>
  (await isOwnOrigin()) ? asSession(raw) : crossOrigin,
);

export async function setContactStatusAction(raw: unknown) {
  return reporting(raw);
}
