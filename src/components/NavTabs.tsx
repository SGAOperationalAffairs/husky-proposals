import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { canSignIn, getSession, signOutUrl } from "@/auth/session";
import { usesSampleIdeas } from "@/app/_ideas/source";
import { AccountLinks } from "@/components/AccountLinks";
import { NavLinks } from "@/components/NavLinks";
import { navTabsFor } from "@/core/navigation";
import { reviewQueueCount } from "@/db/reviewQueue";
import { db } from "@/db/runtime";
import { env } from "@/env";

// The site's tabs for this viewer (#156). Read per request, so they carry their own
// Suspense boundary. Students and visitors never get a leader tab. The tab that is
// open is worked out in the browser from the URL (NavLinks), so the tabs do not need
// to know which page they sit on (#221).
export function NavTabs() {
  return (
    <Suspense fallback={null}>
      <Tabs />
    </Suspense>
  );
}

async function Tabs() {
  await connection();
  const session = await getSession();
  const viewer = session ? { user: { id: session.user.id }, roles: session.roles } : null;
  // The red count on the Queue tab: posts waiting for review on the viewer's boards (#221).
  // Zero for students and visitors, and no badge when nothing is waiting. Local runs without
  // a database never reach db(), as on the queue page.
  const waiting = viewer && !usesSampleIdeas(env()) ? await reviewQueueCount(db(), viewer) : 0;
  // signOutUrl refuses an origin it does not know, so a spoofed host only gives null (#177).
  const requestHeaders = await headers();
  const origin = `https://${requestHeaders.get("host") ?? ""}`;
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line">
      <NavLinks tabs={navTabsFor(viewer)} waiting={waiting} />
      <div className="shrink-0 pb-1">
        <AccountLinks
          canSignIn={canSignIn()}
          name={session?.user.name ?? null}
          signOutHref={signOutUrl(origin)}
        />
      </div>
    </div>
  );
}
