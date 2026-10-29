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

type Shared = { label: string; hint?: string; error?: string };

function Wrap({ id, label, hint, error, children }: Shared & { id: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
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
    </div>
  );
}

const describedBy = (id: string, { hint, error }: Shared) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function TextField({ label, hint, error, ...rest }: Shared & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, { label, hint, error })}
        className={control}
        {...rest}
      />
    </Wrap>
  );
}

export function TextArea({
  label,
  hint,
  error,
  ...rest
}: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, { label, hint, error })}
        className={`${control} min-h-24 resize-y`}
        {...rest}
      />
    </Wrap>
  );
}

export function SelectField({
  label,
  hint,
  error,
  children,
  ...rest
}: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, { label, hint, error })}
        className={control}
        {...rest}
      >
        {children}
      </select>
    </Wrap>
  );
}
