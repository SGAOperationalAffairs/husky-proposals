"use client";

// Four ways to set a panel on the page color (#55), each beside a white panel
// (bg-surface) with the same shape, for comparison. The white panels are only
// here to compare: the real pages are unchanged, and the choice waits for Luis.
const TREATMENTS = [
  {
    name: "Border only",
    note: "A 1px line, no fill.",
    page: "border border-line",
    white: "border border-line bg-surface",
  },
  {
    name: "Accent tint",
    note: "A light wash of the board color (accent-soft), with the 2px line.",
    page: "bordered bg-accent-soft",
    white: "bordered bg-surface",
  },
  {
    name: "Hard shadow (default)",
    note: "The default surface (surface-float): no border, the page color, and a hard offset shadow in the line color that lifts the panel. The idea page, the no-ideas panel, and the not-found panel use it.",
    page: "surface-float",
    white: "edge-float bg-surface",
  },
  {
    name: "Heavier border",
    note: "The 2px line from the tokens, no fill.",
    page: "bordered",
    white: "bordered bg-surface",
  },
];

export function SurfacesSection() {
  return (
    <div className="flex flex-col gap-8">
      {TREATMENTS.map((t) => (
        <div key={t.name} className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-bold">{t.name}</h3>
            <p className="text-sm text-muted">{t.note}</p>
          </div>
          <div className="grid gap-6 @3xl:grid-cols-2">
            <Panel label="On the page color" className={t.page} />
            <Panel label="White, for comparison" className={t.white} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Panel({ label, className }: { label: string; className: string }) {
  return (
    <div className={`flex min-h-32 flex-col gap-2 p-card ${className}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-sm text-muted">A short line of text inside the panel.</p>
    </div>
  );
}
