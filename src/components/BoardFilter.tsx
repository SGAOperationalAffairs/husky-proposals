import Link from "next/link";
import type { MouseEvent } from "react";

// A board filter chip (#29): the board's swatch and name, filled when chosen.
// A link on pages, so a filtered list has its own URL and works without
// JavaScript (#61). With onSelect, a plain click filters in place instead of
// navigating; a new-tab or modified click still follows the link. A button in
// the playground, which keeps the choice in state.
type Props = { label: string; color?: string; selected: boolean } & (
  | { href: string; onSelect?: () => void; onClick?: never }
  | { onClick: () => void; href?: never; onSelect?: never }
);

const chip = "poster-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold";

const plainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export function BoardFilter({ label, color, selected, href, onSelect, onClick }: Props) {
  const content = (
    <>
      {color && <span aria-hidden className="board-swatch size-3" />}
      {label}
    </>
  );
  if (href !== undefined) {
    return (
      <Link
        href={href}
        scroll={false}
        data-board={color}
        aria-current={selected ? "true" : undefined}
        onClick={(e) => {
          if (onSelect && plainClick(e)) {
            e.preventDefault();
            onSelect();
          }
        }}
        className={chip}
      >
        {content}
      </Link>
    );
  }
  return (
    <button type="button" data-board={color} aria-pressed={selected} onClick={onClick} className={chip}>
      {content}
    </button>
  );
}
