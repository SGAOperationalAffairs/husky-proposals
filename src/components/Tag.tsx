import { Megaphone, Tag as TagIcon } from "lucide-react";

// The board's category on a card ("Dining"), and the "From SGA" tag on ideas
// posted by SGA leaders (data-model.md, review decisions).
export function BoardTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip bg-accent-soft px-2 py-px text-xs font-semibold text-accent-text">
      <TagIcon aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}

export function FromSgaTag() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip bordered px-2 py-px text-xs font-semibold text-ink">
      <Megaphone aria-hidden className="size-3.5" />
      From SGA
    </span>
  );
}
