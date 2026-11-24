"use client";

import { tabLook } from "./tabLook";
import { Badge } from "./Badge";

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
    // The border lives on the inner row, inside the scroller, so the active
    // tab's -mb-px underline covers it without overflowing the scroller
    // (a 1px vertical scroll, #231; same fix as the nav bar, #186).
    // overflow-y-hidden is only a guard. w-max lets the row grow past the
    // screen and scroll; min-w-full keeps the grey line full width.
    <div className="overflow-x-auto overflow-y-hidden">
      <div role="tablist" aria-label={label} className="flex w-max min-w-full gap-0.5 border-b border-line">
        {tabs.map((tab) => {
          const active = tab.id === selected;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect?.(tab.id)}
              className={tabLook(active)}
            >
              {tab.label}
              {tab.count !== undefined && <Badge count={tab.count} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
