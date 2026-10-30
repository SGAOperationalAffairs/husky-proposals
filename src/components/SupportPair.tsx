"use client";

// Support and "I'll participate" are a matched pair, always shown together
// (PRD decision log), so both use the same button style (.poster-btn).
// Taps set a state, they never toggle on the server: the handlers receive the
// state the student wants. On a narrow poster (4 per row) the pair stacks.
// The playground can swap the text buttons for outline icons.
type Props = {
  ideaNumber: number;
  supported: boolean;
  participating: boolean;
  onSupportChange?: (supported: boolean) => void;
  onParticipateChange?: (participating: boolean) => void;
};

export function SupportPair({
  ideaNumber,
  supported,
  participating,
  onSupportChange,
  onParticipateChange,
}: Props) {
  const button = "poster-btn min-w-0 px-2 py-2 font-bold whitespace-nowrap";
  const support = { "aria-pressed": supported, onClick: () => onSupportChange?.(!supported) };
  const participate = { "aria-pressed": participating, onClick: () => onParticipateChange?.(!participating) };
  // Both looks render; --card-btn-text and --card-btn-icons pick one, and the
  // hidden one is display: none, so screen readers only meet the visible pair.
  return (
    <div role="group" aria-label={`Your support for proposal ${ideaNumber}`}>
      <div className="card-btn-text">
        <div className="grid grid-cols-1 gap-2 @2xs:grid-cols-2">
          <button type="button" {...support} className={button}>
            {supported ? "Supported" : "Support"}
          </button>
          <button type="button" {...participate} className={button}>
            {participating ? "Participating" : "I'll participate"}
          </button>
        </div>
      </div>
      <div className="card-btn-icons">
        <div className="support-icons flex gap-1">
          <button type="button" {...support} aria-label="Support" title="Support" className="support-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </button>
          <button
            type="button"
            {...participate}
            aria-label="I'll participate"
            title="I'll participate"
            className="support-icon"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {/* The hand's outline is one closed shape, so it can fill when tapped; the
                three short lines mark the fingers in the outline look. */}
              <path d="M6 14V6a2 2 0 0 1 4 0V4a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L6 14Z" />
              <path className="support-icon-gaps" d="M10 6v4.5M14 6v4M18 8v3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
