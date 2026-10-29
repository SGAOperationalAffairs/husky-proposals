import type { ButtonHTMLAttributes } from "react";

// Buttons from the prototype (.btn): primary for the one main action on a
// screen, line for a secondary action that still matters, plain for the rest.
export type ButtonVariant = "primary" | "line" | "plain";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent border-accent",
  line: "bg-transparent text-accent-text border-accent-text",
  plain: "bg-surface text-ink",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "md" | "sm";
};

export function Button({ variant = "plain", size = "md", className = "", type = "button", ...rest }: Props) {
  const sizing = size === "sm" ? "px-2.5 py-1 text-sm" : "px-3.5 py-2";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-button bordered font-medium aria-disabled:opacity-55 ${VARIANTS[variant]} ${sizing} ${className}`}
      {...rest}
    />
  );
}
