"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { PAGE } from "@/components/pageTransition";
import { Badge } from "@/components/Badge";
import type { NavTab } from "@/core/navigation";

// Reduced motion is read in the browser, so the slide can be left out there (#221).
const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const reducedNow = () => window.matchMedia(REDUCED).matches;

// The page links in the header (#156). Client, so the open tab follows the URL: when you
// move between pages in the shared layout (#221), the header stays put. The red line under
// the open tab is one element that slides to the new tab (.nav-indicator, #221). The Ideas
// tab is also open on an idea's own page.
export function NavLinks({ tabs, waiting }: { tabs: NavTab[]; waiting: number }) {
  const pathname = usePathname();
  const isOpen = (t: NavTab) =>
    t.href === "/" ? pathname === "/" || pathname.startsWith("/ideas/") : pathname === t.href;
  const openId = tabs.find(isOpen)?.id;

  const reduced = useSyncExternalStore(subscribeReduced, reducedNow, () => false);
  const links = useRef(new Map<string, HTMLAnchorElement>());
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  // Measure the open tab after it renders, and again if the window resizes (the tabs wrap or scroll).
  useLayoutEffect(() => {
    const place = () => {
      const el = openId ? links.current.get(openId) : undefined;
      setBar(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [openId, tabs.length]);

  return (
    <nav aria-label="Pages" className="relative flex gap-0.5 overflow-x-auto overflow-y-hidden">
      {tabs.map((t) => {
        const open = t.id === openId;
        return (
          <Link
            key={t.id}
            ref={(el) => {
              if (el) links.current.set(t.id, el);
              else links.current.delete(t.id);
            }}
            transitionTypes={PAGE}
            href={t.href}
            aria-current={open ? "page" : undefined}
            className={`inline-flex items-center gap-2 px-4 py-3 whitespace-nowrap ${
              open ? "font-semibold text-accent-text" : "font-medium"
            }`}
          >
            {t.label}
            {t.id === "queue" && waiting > 0 && <Badge count={waiting} />}
          </Link>
        );
      })}
      <span
        aria-hidden
        data-indicator
        className="absolute bottom-0 left-0 -mb-px border-b-3 border-accent"
        style={{
          transition: reduced
            ? "none"
            : "transform var(--motion-fast) ease-out, width var(--motion-fast) ease-out, opacity var(--motion-fast) ease-out",
          width: bar?.width ?? 0,
          transform: `translateX(${bar?.left ?? 0}px)`,
          opacity: bar ? 1 : 0,
        }}
      />
    </nav>
  );
}
