"use client";

import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/Button";

// The buttons we use, as one set (#55): each variant in its states, with and
// without an icon, in both sizes. Built from the real Button.
//
// The app's buttons have no hover style yet, so the Hover column shows a
// proposed one. It is styled here only, with the classes below, and nothing in
// the app uses them. The Focus column shows the global focus ring
// (:focus-visible in globals.css) without needing a keyboard.
const FORCED_STATES = `
.catalogue-hover-primary { background-color: color-mix(in srgb, var(--accent) 85%, black); }
.catalogue-hover-line { background-color: var(--accent-soft); }
.catalogue-hover-text { text-decoration: underline; }
.catalogue-focus { outline: 2px solid var(--focus); outline-offset: 2px; }
`;

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2">
    <path d={path} />
  </svg>
);
const PLUS = icon("M12 5v14M5 12h14");
const ARROW = icon("M5 12h14m-6-6 6 6-6 6");
const CHEVRON = icon("m15 6-6 6 6 6");

const ROWS: { name: string; variant: ButtonVariant; text: string; icon: ReactNode; hover: string }[] = [
  { name: "Primary", variant: "primary", text: "Post an idea", icon: PLUS, hover: "catalogue-hover-primary" },
  { name: "Outlined", variant: "line", text: "Put on hold", icon: ARROW, hover: "catalogue-hover-line" },
  {
    name: "Text with chevron",
    variant: "text",
    text: "Back to ideas",
    icon: CHEVRON,
    hover: "catalogue-hover-text",
  },
];

const STATES = ["Default", "Hover", "Focus", "Disabled"] as const;

export function ButtonsSection() {
  return (
    <div className="flex flex-col gap-10">
      <style>{FORCED_STATES}</style>
      {(["md", "sm"] as const).map((size) => (
        <div key={size} className="flex flex-col gap-5">
          <h3 className="text-sm font-bold">{size === "md" ? "Medium (md)" : "Small (sm)"}</h3>
          {ROWS.flatMap((row) =>
            [false, true].map((withIcon) => (
              <div key={`${row.variant}-${withIcon}`} className="flex flex-col gap-2">
                <p className="text-sm font-semibold">
                  {row.name}
                  {withIcon ? ", with icon" : ", no icon"}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {STATES.map((state) => (
                    <div key={state} className="flex flex-col items-start gap-1.5">
                      <span className="text-xs text-muted">
                        {state === "Hover" ? "Hover (proposed)" : state}
                      </span>
                      <Button
                        variant={row.variant}
                        size={size}
                        className={
                          state === "Hover" ? row.hover : state === "Focus" ? "catalogue-focus" : undefined
                        }
                        aria-disabled={state === "Disabled" ? "true" : undefined}
                      >
                        {withIcon ? row.icon : null}
                        {row.text}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )),
          )}
        </div>
      ))}
      <p className="text-sm text-muted">
        Disabled uses aria-disabled, so the button stays in the tab order and can say why it is unavailable.
        The plain button (white, with a line) is not in this set. It is used for Change board, Reset, and
        Hide.
      </p>
    </div>
  );
}
