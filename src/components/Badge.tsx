// The count on a tab (#124, #221). A plain component with no client code, so a server
// component (the site header) and a client tablist can both draw it.
export function Badge({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count} need attention`}
      className={`inline-grid h-5 min-w-5 place-items-center rounded-chip px-1.5 text-xs font-bold ${
        count > 0 ? "bg-accent text-on-accent" : "bg-grey text-grey-ink"
      }`}
    >
      {count}
    </span>
  );
}
