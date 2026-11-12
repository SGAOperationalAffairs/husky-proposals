import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

// Form fields from the prototype (.field): a visible label, an optional hint,
// and an error that says what to fix.
const control = "rounded-field bordered bg-surface w-full px-3 py-2";

type Shared = { label: string; hint?: string; error?: string; required?: boolean };
// The character count under a limited field: how many are used, against the limit,
// and how many more a minimum needs once something is written (#55).
type Count = { length: number; max: number; min?: number };

// The red asterisk for a required field. The screen reader hears "required", so the
// mark is not read as a symbol. Use it on the label of every required field.
export function RequiredMark({ onColor = false }: { onColor?: boolean }) {
  return (
    <>
      <span aria-hidden className={`ml-1 font-bold ${onColor ? "text-on-accent" : "text-accent-text"}`}>
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

function CharCount({ length, max, min }: Count) {
  const short = min !== undefined && length > 0 && length < min;
  return (
    <small className={short ? "font-semibold text-accent-text" : "text-muted"}>
      {length} of {max} characters
      {short && `, ${min - length} more needed`}
    </small>
  );
}

function Wrap({
  id,
  label,
  hint,
  error,
  required,
  count,
  children,
}: Shared & { id: string; count?: Count; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {hint && !error && (
        <small id={`${id}-hint`} className="text-muted">
          {hint}
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className="font-semibold text-accent-text">
          {error}
        </small>
      )}
      {count && <CharCount {...count} />}
    </div>
  );
}

const describedBy = (id: string, { hint, error }: Shared) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

// onPage: the field takes the page background instead of a white surface, for a
// field that sits on the page rather than in a panel (the ideas search, #61).
// joinedEnd: no right edge, because a button sits flush against it and draws
// the shared edge, so the seam is one line, not two (#61).
export function TextField({
  label,
  hint,
  error,
  required = false,
  min,
  max,
  onPage = false,
  joinedEnd = false,
  ...rest
}: Shared & {
  onPage?: boolean;
  joinedEnd?: boolean;
  min?: number;
  max?: number;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const count =
    max !== undefined && typeof rest.value === "string" ? { length: rest.value.length, max, min } : undefined;
  return (
    <Wrap id={id} label={label} hint={hint} error={error} required={required} count={count}>
      <input
        id={id}
        aria-required={required || undefined}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, { label, hint, error })}
        // Joined with a space here, not inside the strings: Prettier's class sorter trims them.
        className={[onPage ? control.replace("bg-surface", "bg-bg") : control, joinedEnd && "joined-end"]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
    </Wrap>
  );
}

export function TextArea({
  label,
  hint,
  error,
  required = false,
  min,
  max,
  ...rest
}: Shared & { min?: number; max?: number } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const count =
    max !== undefined && typeof rest.value === "string" ? { length: rest.value.length, max, min } : undefined;
  return (
    <Wrap id={id} label={label} hint={hint} error={error} required={required} count={count}>
      <textarea
        id={id}
        aria-required={required || undefined}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, { label, hint, error })}
        className={`${control} min-h-24 resize-y`}
        {...rest}
      />
    </Wrap>
  );
}

// onPage: as on TextField, the page color instead of a white surface (#61). The
// ideas list's dropdowns use it, so they sit on the page like the search field.
export function SelectField({
  label,
  hint,
  error,
  onPage = false,
  children,
  ...rest
}: Shared & { onPage?: boolean } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  // appearance-none: Safari draws its own rounded select over rounded-field, so
  // the arrow is ours (#61).
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <span className="relative block">
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, { label, hint, error })}
          className={`${onPage ? control.replace("bg-surface", "bg-bg") : control} appearance-none pr-9`}
          {...rest}
        >
          {children}
        </select>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 fill-none stroke-current stroke-2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </Wrap>
  );
}
