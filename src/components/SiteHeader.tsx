import Link from "next/link";
import { PAGE } from "@/components/pageTransition";
import { tabLook } from "./tabLook";

// The site's name and the two student lists, at the top of every student page
// (#61, #62, #63). An idea's page passes no current list.
type Props = { current?: "ideas" | "progress" };

const LISTS = [
  { id: "ideas", label: "Ideas", href: "/" },
  { id: "progress", label: "In progress", href: "/in-progress" },
] as const;

export function SiteHeader({ current }: Props) {
  return (
    <header className="site-header flex flex-col gap-4">
      <Link transitionTypes={PAGE} href="/" className="inline-flex items-center gap-3 self-start">
        <span aria-hidden className="bordered px-1.5 heading text-lg leading-tight">
          SGA
        </span>
        <span className="font-bold">Husky Proposals</span>
      </Link>
      <nav aria-label="Lists" className="flex gap-0.5 border-b border-line">
        {LISTS.map((list) => (
          <Link
            transitionTypes={PAGE}
            key={list.id}
            href={list.href}
            aria-current={current === list.id ? "page" : undefined}
            className={tabLook(current === list.id)}
          >
            {list.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
