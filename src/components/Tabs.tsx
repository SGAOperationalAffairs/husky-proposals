"use client";

// Tabs with small red numbers for what needs attention (CLAUDE.md: no
// dashboards; leaders open straight onto the list).
export type TabItem = { id: string; label: string; count?: number };

type Props = {
  label: string;
  tabs: TabItem[];
  selected: string;
  onSelect?: (id: string) => void;
};

export function Tabs({ label, tabs, selected, onSelect }: Props) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-0.5 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const active = tab.id === selected;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect?.(tab.id)}
            className={`-mb-px inline-flex items-center gap-2 border-b-3 px-4 py-3 whitespace-nowrap ${
              active ? "border-accent font-semibold text-accent-text" : "border-transparent font-medium"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && <Badge count={tab.count} />}
          </button>
        );
      })}
    </div>
  );
}

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
