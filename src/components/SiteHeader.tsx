import Link from "next/link";
import type { ReactNode } from "react";
import { PAGE } from "@/components/pageTransition";

// The site's name at the top of every page (#61, #62). `nav` is the page's tabs
// (#156). The tabs are read per request, so the page passes them in a Suspense
// boundary; this header itself never reads the session, so it stays cached.
export function SiteHeader({ nav }: { nav?: ReactNode }) {
  return (
    <header className="site-header flex flex-col gap-3">
      <Link transitionTypes={PAGE} href="/" className="inline-flex items-center gap-3 self-start">
        <span aria-hidden className="bordered px-1.5 heading text-lg leading-tight">
          SGA
        </span>
        <span className="font-bold">Husky Proposals</span>
      </Link>
      {nav}
    </header>
  );
}
