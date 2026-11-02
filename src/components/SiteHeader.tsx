import Link from "next/link";
import { PAGE } from "@/components/pageTransition";

// The site's name, at the top of every student page (#61, #62). There is one
// list now (#55), so the header has no tabs.
export function SiteHeader() {
  return (
    <header className="site-header flex flex-col gap-3">
      <Link transitionTypes={PAGE} href="/" className="inline-flex items-center gap-3 self-start">
        <span aria-hidden className="bordered px-1.5 heading text-lg leading-tight">
          SGA
        </span>
        <span className="font-bold">Husky Proposals</span>
      </Link>
    </header>
  );
}
