"use client";

// Support and "I'll participate" are a matched pair, always shown together
// (PRD decision log). Taps set a state, they never toggle on the server: the
// handlers receive the state the student wants.
//
// Two looks (#29): "icons" on the ideas wall, a heart and a raised hand that
// fill in when tapped; "buttons" on an idea's own page, the same icons inside
// labeled buttons, where students actually decide.
type Props = {
  ideaNumber: number;
  supported: boolean;
  participating: boolean;
  onSupportChange?: (supported: boolean) => void;
  onParticipateChange?: (participating: boolean) => void;
  look?: "icons" | "buttons";
};

export function SupportPair({
  ideaNumber,
  supported,
  participating,
  onSupportChange,
  onParticipateChange,
  look = "icons",
}: Props) {
  const support = { "aria-pressed": supported, onClick: () => onSupportChange?.(!supported) };
  const participate = { "aria-pressed": participating, onClick: () => onParticipateChange?.(!participating) };
  const group = { role: "group", "aria-label": `Your support for proposal ${ideaNumber}` };

  if (look === "buttons") {
    const button =
      "poster-btn inline-flex min-w-0 items-center justify-center gap-2 px-3 py-2 font-bold whitespace-nowrap";
    return (
      <div {...group} className="grid grid-cols-1 gap-2 @2xs:grid-cols-2">
        <button type="button" {...support} className={button}>
          <HeartIcon />
          {supported ? "Supported" : "Support"}
        </button>
        <button type="button" {...participate} className={button}>
          <HandIcon />
          {participating ? "Participating" : "I'll participate"}
        </button>
      </div>
    );
  }
  return (
    <div {...group} className="support-icons flex gap-1">
      <button type="button" {...support} aria-label="Support" title="Support" className="support-icon">
        <HeartIcon />
      </button>
      <button
        type="button"
        {...participate}
        aria-label="I'll participate"
        title="I'll participate"
        className="support-icon"
      >
        <HandIcon />
      </button>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="support-glyph">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

// One closed outline, so it can fill when tapped; the three short lines mark
// the fingers, and turn into gaps when filled.
function HandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="support-glyph">
      <path d="M6 14V6a2 2 0 0 1 4 0V4a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L6 14Z" />
      <path className="support-glyph-gaps" d="M10 6v4.5M14 6v4M18 8v3" />
    </svg>
  );
}
