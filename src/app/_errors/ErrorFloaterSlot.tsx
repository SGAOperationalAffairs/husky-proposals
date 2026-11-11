import { connection } from "next/server";
import { Suspense } from "react";
import { sessionProblem } from "@/auth/session";
import { errorsShown } from "./errorsShown";
import { LiveErrorFloater } from "./LiveErrorFloater";

// The floater's mount point in the root layout (#191). Its own Suspense boundary, so the
// request-time reads (the gate and the SGAuth session) never hold up a page. The gate is
// read per request, never at build, because CI builds have no APP_ENV secrets. The session
// problem is read here and not in NavTabs, so pages with no site header (/post) report too.
export function ErrorFloaterSlot() {
  return (
    <Suspense fallback={null}>
      <ErrorFloaterGate />
    </Suspense>
  );
}

export async function ErrorFloaterGate() {
  await connection();
  if (!errorsShown()) return null;
  return <LiveErrorFloater sgauthProblem={await sessionProblem()} />;
}
