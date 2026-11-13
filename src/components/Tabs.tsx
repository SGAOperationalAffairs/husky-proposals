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
            className={tabLook(active)}
          >
            {tab.label}
            {tab.count !== undefined && <Badge count={tab.count} />}
          </button>
        );
      })}
    </div>
  );
}
