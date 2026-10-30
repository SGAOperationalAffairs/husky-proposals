"use client";

// Support and "I'll participate" are a matched pair, always shown together
// (PRD decision log), so both use the same button style (.poster-btn).
// Taps set a state, they never toggle on the server: the handlers receive the
// state the student wants. On a narrow poster (4 per row) the pair stacks.
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
  return (
    <div
      className="grid grid-cols-1 gap-2 @2xs:grid-cols-2"
      role="group"
      aria-label={`Your support for proposal ${ideaNumber}`}
    >
      <button
        type="button"
        aria-pressed={supported}
        onClick={() => onSupportChange?.(!supported)}
        className={button}
      >
        {supported ? "Supported" : "Support"}
      </button>
      <button
        type="button"
        aria-pressed={participating}
        onClick={() => onParticipateChange?.(!participating)}
        className={button}
      >
        {participating ? "Participating" : "I'll participate"}
      </button>
    </div>
  );
}
