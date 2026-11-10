import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { canSignIn, getSession, signOutUrl } from "@/auth/session";
import { AccountLinks } from "@/components/AccountLinks";
import { PAGE } from "@/components/pageTransition";
import { tabLook } from "@/components/tabLook";
import { navTabsFor, type NavTab } from "@/core/navigation";

// The site's tabs for this viewer (#156). Read per request, so they carry their own
// Suspense boundary and the page around them stays cached. Students and visitors
// never get a leader tab.
export function NavTabs({ current }: { current?: NavTab["id"] }) {
  return (
    <Suspense fallback={null}>
      <Tabs current={current} />
    </Suspense>
  );
}

async function Tabs({ current }: { current?: NavTab["id"] }) {
  await connection();
  const session = await getSession();
  const viewer = session ? { user: { id: session.user.id }, roles: session.roles } : null;
  // signOutUrl refuses an origin it does not know, so a spoofed host only gives null (#177).
  const requestHeaders = await headers();
  const origin = `https://${requestHeaders.get("host") ?? ""}`;
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line">
      {/* Only the sideways scroll is wanted. Setting overflow-x makes overflow-y scroll too, by a pixel (#186). */}
      <nav aria-label="Pages" className="flex gap-0.5 overflow-x-auto overflow-y-hidden">
        {navTabsFor(viewer).map((t) => (
          <Link
            key={t.id}
            transitionTypes={PAGE}
            href={t.href}
            aria-current={t.id === current ? "page" : undefined}
            className={tabLook(t.id === current)}
          >
            {t.label}
          </Link>
        ))}
      </nav>
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
