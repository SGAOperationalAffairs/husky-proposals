import type { CSSProperties, ReactNode } from "react";
import { IdeaCard } from "@/components/IdeaCard";
import { BOARDS } from "@/core/boards";
import { IDEAS } from "../sample";

// Brainstorm (#55): ways to mark an idea a board has picked up, on its poster.
// Each one wraps the real IdeaCard, so the card's own status line still says
// "In progress" and the mark only adds to it. Marks that move do so only under
// motion-safe; the words are always there, so color and motion are never the
// only cue. Nothing here is chosen yet.

type Variant = {
  name: string;
  note: string;
  frameClass?: string;
  frameStyle?: CSSProperties;
  overlay?: ReactNode;
  below?: ReactNode;
};

// A stamp that sits on the card's top edge, so it never covers the card's text.
const edgeTag = "absolute -top-3 flex items-center gap-2 bg-line px-2.5 py-1 text-xs font-bold text-surface";

const VARIANTS: Variant[] = [
  {
    name: "Double edge",
    note: "A second rule set off the poster, like a frame.",
    frameStyle: { outline: "var(--border) solid var(--line)", outlineOffset: "8px" },
  },
  {
    name: "Corner stamp",
    note: "A heading-size stamp on the top edge, at the right.",
    overlay: (
      <span className="absolute -top-6 right-0 bg-line px-3 py-1 heading text-lg text-surface">
        Picked up by a board
      </span>
    ),
  },
  {
    name: "Live dot",
    note: "A small square that blinks slowly, next to the words. Corners stay square (the radius tokens are 0).",
    overlay: (
      <span className={`${edgeTag} left-4`}>
        <span aria-hidden className="ip-dot size-2.5 bg-surface" />
        Picked up by a board
      </span>
    ),
  },
  {
    name: "Hazard stripe",
    note: "A striped band along the top edge that slides slowly.",
    overlay: (
      <span
        aria-hidden
        className="ip-stripe absolute inset-x-0 -top-2 h-2"
        style={{
          background:
            "repeating-linear-gradient(-45deg, var(--line) 0 8px, var(--surface) 8px 16px) 0 0 / 22px 22px",
        }}
      />
    ),
  },
  {
    name: "Corner stamp, board color",
    note: "The corner stamp in the board's color, with text in the color that reads on it.",
    overlay: (
      <span
        className="absolute -top-6 right-0 px-3 py-1 heading text-lg"
        style={{ background: "var(--b)", color: "var(--on-b)" }}
      >
        Picked up by a board
      </span>
    ),
  },
  {
    name: "Hazard stripe, board color",
    note: "The hazard stripe with its black stripes swapped for the board's color, on the page edge.",
    overlay: (
      <span
        aria-hidden
        className="ip-stripe absolute inset-x-0 -top-2 h-2"
        style={{
          background:
            "repeating-linear-gradient(-45deg, var(--b) 0 8px, var(--line) 8px 16px) 0 0 / 22px 22px",
        }}
      />
    ),
  },
  {
    name: "Board stripe",
    note: "The hazard stripe in the board's own color, on the page edge. It slides slowly.",
    overlay: (
      <span
        aria-hidden
        className="ip-stripe absolute inset-x-0 -top-2 h-2"
        style={{
          background:
            "repeating-linear-gradient(-45deg, var(--b) 0 8px, var(--surface) 8px 16px) 0 0 / 22px 22px",
        }}
      />
    ),
  },
  {
    name: "Board stripe with black stamp",
    note: "The board-color stripe, with the black corner stamp on the top right.",
    overlay: (
      <>
        <span
          aria-hidden
          className="ip-stripe absolute inset-x-0 -top-2 h-2"
          style={{
            background:
              "repeating-linear-gradient(-45deg, var(--b) 0 8px, var(--surface) 8px 16px) 0 0 / 22px 22px",
          }}
        />
        <span className="absolute -top-6 right-0 bg-line px-3 py-1 heading text-lg text-surface">
          Picked up by a board
        </span>
      </>
    ),
  },
  {
    name: "Board rule",
    note: "A thin rule in the board's color, floating just above the poster. Still.",
    overlay: (
      <span aria-hidden className="absolute inset-x-0 -top-2 h-1" style={{ background: "var(--b)" }} />
    ),
  },
  {
    name: "Dot, blinks once",
    note: "The live square with the label, blinking once when the card arrives, then holding still.",
    overlay: (
      <span className={`${edgeTag} left-4`}>
        <span aria-hidden className="ip-dot-once size-2.5 bg-surface" />
        Picked up by a board
      </span>
    ),
  },
  {
    name: "Progress track",
    note: "Three squares under the poster: support, picked up, delivered. The filled ones are done.",
    below: (
      <ol aria-label="Progress" className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold">
        <Step label="Collected support" done />
        <Step label="Picked up by a board" done current />
        <Step label="Delivered" />
      </ol>
    ),
  },
  {
    name: "Cut corner",
    note: "The poster's bottom-right corner is cut away.",
    frameStyle: {
      clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 28px), calc(100% - 28px) 100%, 0 100%)",
    },
  },
  {
    name: "Hard shadow",
    note: "The same hard offset shadow as the idea page's panels.",
    frameClass: "surface-float",
  },
];

// The sample idea a board has picked up (status in_progress), so every variant
// shows the same poster.
export function InProgressCardsSection() {
  const idea = IDEAS.find((i) => i.status === "in_progress");
  if (!idea) return null;
  return (
    <div className="flex flex-col gap-10 pt-4">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .ip-stripe { animation: ip-slide 1.2s linear infinite; }
          .ip-dot { animation: ip-blink 1.4s ease-in-out infinite; }
          .ip-dot-once { animation: ip-blink 1.2s ease-in-out 1 both; }
        }
        @keyframes ip-slide { to { background-position: 22px 0; } }
        @keyframes ip-blink { 50% { opacity: 0.2; } }
      `}</style>
      <p className="text-sm text-muted">
        Each mark sits on the same sample poster. The card&apos;s status line still says In progress, so the
        mark only adds to it.
      </p>
      <div className="grid gap-x-8 gap-y-10 @3xl:grid-cols-2">
        {VARIANTS.map((v) => (
          <div key={v.name} className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-bold">{v.name}</h3>
              <p className="text-sm text-muted">{v.note}</p>
            </div>
            {/* data-board on the wrapper too, so an overlay outside the poster can use the board's color (--b). */}
            {/* The space above each poster is for marks that sit on its top edge. */}
            <div className="pt-7">
              <div
                data-board={BOARDS[idea.board].color}
                className={`relative ${v.frameClass ?? ""}`}
                style={v.frameStyle}
              >
                <IdeaCard {...idea} />
                {v.overlay}
              </div>
            </div>
            {v.below}
          </div>
        ))}
      </div>
    </div>
  );
}

function Step({
  label,
  done = false,
  current = false,
}: {
  label: string;
  done?: boolean;
  current?: boolean;
}) {
  return (
    <li aria-current={current ? "step" : undefined} className="flex items-center gap-2">
      <span aria-hidden className={`size-3 border-2 border-line ${done ? "bg-line" : "bg-surface"}`} />
      {label}
    </li>
  );
}
