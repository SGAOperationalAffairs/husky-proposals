import type { ButtonHTMLAttributes } from "react";

// Buttons from the prototype (.btn): primary for the one main action on a
// screen, line for a secondary action that still matters, plain for the rest.
export type ButtonVariant = "primary" | "line" | "plain";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent",
  line: "bg-transparent text-accent-text",
  plain: "bg-surface text-ink",
};
const BORDERS: Record<ButtonVariant, string> = {
  primary: "border-accent",
  line: "border-accent-text",
  plain: "",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  // An ink outline instead of the variant's own, to match the field beside it (the ideas search, #61).
  outlined?: boolean;
};

// The button look, for a link that should look like a button (the share
// dialog's Text, Email, and download links, #64).
export const buttonLook = (variant: ButtonVariant = "plain", size: "md" | "sm" = "md", outlined = false) => {
  const sizing = size === "sm" ? "px-2.5 py-1 text-sm" : "px-3.5 py-2";
  const border = outlined ? "border-line" : BORDERS[variant];
  return `inline-flex items-center justify-center gap-2 rounded-button bordered font-medium aria-disabled:opacity-55 ${VARIANTS[variant]} ${border} ${sizing}`;
};

export function Button({
  variant = "plain",
  size = "md",
  outlined = false,
  className = "",
  type = "button",
  ...rest
}: Props) {
  return <button type={type} className={`${buttonLook(variant, size, outlined)} ${className}`} {...rest} />;
}
