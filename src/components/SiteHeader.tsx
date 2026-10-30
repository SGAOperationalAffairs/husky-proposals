import Link from "next/link";

// The site's name, at the top of every student page (#61, #62).
export function SiteHeader() {
  return (
    <header>
      <Link href="/" className="inline-flex items-center gap-3">
        <span aria-hidden className="bordered px-1.5 heading text-lg leading-tight">
          SGA
        </span>
        <span className="font-bold">Husky Proposals</span>
      </Link>
    </header>
  );
}
