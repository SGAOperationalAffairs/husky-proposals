"use client";

import { usePathname } from "next/navigation";
import { buttonLook } from "@/components/Button";

// A plain anchor, never next/link (#177): /sign-in redirects off the site, so a
// client-side navigation or prefetch would not follow it. It carries the current path
// so sign-in returns here. Search parameters are not known to a client component
// without a Suspense boundary, so the visitor returns to the page, not its filters.
export function SignInLink() {
  const pathname = usePathname();
  return (
    <a href={`/sign-in?next=${encodeURIComponent(pathname)}`} className={buttonLook("text", "sm")}>
      Sign in
    </a>
  );
}
