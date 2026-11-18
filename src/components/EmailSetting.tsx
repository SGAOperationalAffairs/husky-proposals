"use client";

import { useId } from "react";

// One notification setting (#211): a native checkbox in a label, the same markup as the
// post form's anonymous checkbox, so Space toggles it and the global focus outline and
// pointer rule apply. Presentational: the state comes in as props, and `onChange` gets the
// state the student wants, never "toggle". Rows are told apart by a hairline, not a box.
type Props = {
  label: string;
  hint: string;
  checked: boolean;
  // A save is in flight for this row: it waits, and the others stay usable.
  busy: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
};

export function EmailSetting({ label, hint, checked, busy, disabled, onChange }: Props) {
  const labelId = useId();
  const hintId = useId();
  return (
    <label className="flex items-start gap-3 border-b border-line py-4 first:border-t">
      <input
        type="checkbox"
        className="mt-1 size-4"
        checked={checked}
        disabled={busy || disabled}
        // The label wraps the hint so the whole row is the click target, so the name is
        // pointed at the label text alone and the hint is the description.
        aria-labelledby={labelId}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="flex flex-col gap-1">
        <span id={labelId} className="font-semibold">
          {label}
        </span>
        <span id={hintId} className="text-muted">
          {hint}
        </span>
      </span>
    </label>
  );
}
