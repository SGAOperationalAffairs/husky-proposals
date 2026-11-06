import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSession } from "@/auth/session";
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
  return (
    <nav aria-label="Pages" className="flex gap-0.5 overflow-x-auto border-b border-line">
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
  );
}
