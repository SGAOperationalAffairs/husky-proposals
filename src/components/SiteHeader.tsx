import Link from "next/link";
import type { ReactNode } from "react";
import { PAGE } from "@/components/pageTransition";

// The site's name at the top of every page (#61, #62). `nav` is the page's tabs
// (#156). NavTabs reads the session inside its own Suspense boundary; this header
// itself never reads the session, so it stays cached. It is not built in here
// because the playground, a client component, also renders this header.
export function SiteHeader({ nav }: { nav?: ReactNode }) {
  return (
    <header className="site-header flex flex-col gap-3">
      {/* The long logo (#183). A <picture> picks the dark variant by color scheme, so no script runs. */}
      <Link transitionTypes={PAGE} href="/" className="inline-flex self-start">
        <picture>
          <source srcSet="/brand/husky-prop-long-dark.svg" media="(prefers-color-scheme: dark)" />
          <img src="/brand/husky-prop-long.svg" alt="Husky Proposals" className="h-12 w-auto" />
        </picture>
      </Link>
      {nav}
    </header>
  );
}
