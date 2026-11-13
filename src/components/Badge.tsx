// The count on a tab (#124, #221). A plain component with no client code, so a server
// component (the site header) and a client tablist can both draw it. The words are text
// for screen readers, not an aria-label on a span, which many readers skip (#134).
export function Badge({ count }: { count: number }) {
  return (
    <span
      className={`inline-grid h-5 min-w-5 place-items-center rounded-chip px-1.5 text-xs font-bold ${
        count > 0 ? "bg-accent text-on-accent" : "bg-grey text-grey-ink"
      }`}
    >
      {count}
      <span className="sr-only"> need attention</span>
    </span>
  );
}
