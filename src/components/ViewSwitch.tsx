import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// A two-way switch between views: cards or the list (#138, #139). Links, so it works
// without JavaScript; the active side is filled. A client view passes onSelect to
// change the view in place instead of loading the page again.
export type ViewOption = { id: string; label: string; icon: LucideIcon; href: string };

export function ViewSwitch({
  label,
  options,
  current,
  onSelect,
}: {
  label: string;
  options: ViewOption[];
  current: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <nav aria-label={label} className="inline-flex bordered bg-surface">
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.id === current;
        return (
          <Link
            key={o.id}
            href={o.href}
            aria-current={active ? "true" : undefined}
            onClick={
              onSelect
                ? (e) => {
                    e.preventDefault();
                    onSelect(o.id);
                  }
                : undefined
            }
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-bold ${active ? "bg-line text-surface" : "text-line"}`}
          >
            <Icon aria-hidden className="size-4" />
            {o.label}
            {active && <span className="sr-only"> (showing)</span>}
          </Link>
        );
      })}
    </nav>
  );
}
