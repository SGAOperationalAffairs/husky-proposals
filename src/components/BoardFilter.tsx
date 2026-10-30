import Link from "next/link";

// A board filter chip (#29): the board's swatch and name, filled when chosen.
// A link on pages, so a filtered list has its own URL (#61); a button in the
// playground, which keeps the choice in state.
type Props = { label: string; color?: string; selected: boolean } & (
  { href: string; onClick?: never } | { onClick: () => void; href?: never }
);

const chip = "poster-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold";

export function BoardFilter({ label, color, selected, href, onClick }: Props) {
  const content = (
    <>
      {color && <span aria-hidden className="board-swatch size-3" />}
      {label}
    </>
  );
  if (href !== undefined) {
    return (
      <Link href={href} data-board={color} aria-current={selected ? "true" : undefined} className={chip}>
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
