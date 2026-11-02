import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

// Buttons from the prototype (.btn): primary for the one main action on a
// screen, line for a secondary action that still matters, plain for the rest.
// text is a link-like action with no box, such as "Back to ideas" (#55): it
// sits flush with its text, and underlines on hover.
export type ButtonVariant = "primary" | "line" | "plain" | "text";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent",
  line: "bg-transparent text-accent-text",
  plain: "bg-surface text-ink",
  text: "bg-transparent text-accent-text",
};
const BORDERS: Record<ButtonVariant, string> = {
  primary: "border-accent",
  line: "border-accent-text",
  plain: "",
  text: "border-transparent",
};
const EXTRAS: Partial<Record<ButtonVariant, string>> = {
  text: "underline-offset-4 hover:underline",
};

type Look = {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  // An ink outline instead of the variant's own, to match the field beside it (the ideas search, #61).
  outlined?: boolean;
  // An icon before the label (#55 "Back to ideas"). Hidden from screen readers: the label says it.
  icon?: ReactNode;
};

// A button is a <button>. Give it an href and it is a link with the same look
// (#55), so links that look like buttons and buttons share one component.
type ButtonProps = Look & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkButtonProps = Look & Omit<ComponentProps<typeof Link>, "href"> & { href: string };
export type Props = ButtonProps | LinkButtonProps;

// Text buttons have no side padding, so their text lines up with the page's edge.
const sizing = (variant: ButtonVariant, size: "md" | "sm") => {
  if (variant === "text") return size === "sm" ? "py-1 text-sm" : "py-2";
  return size === "sm" ? "px-2.5 py-1 text-sm" : "px-3.5 py-2";
};

// The button look, for a link that should look like a button (the share
// dialog's Text, Email, and download links, #64).
export const buttonLook = (variant: ButtonVariant = "plain", size: "md" | "sm" = "md", outlined = false) => {
  const border = outlined ? "border-line" : BORDERS[variant];
  return `inline-flex items-center justify-center gap-2 rounded-button bordered font-medium aria-disabled:opacity-55 ${VARIANTS[variant]} ${border} ${sizing(variant, size)} ${EXTRAS[variant] ?? ""}`.trimEnd();
};

// A link to a page on this site goes through Next's Link, so the page changes
// without a full load. Mail, text, downloads, and new-tab links are plain anchors:
// Next's Link is for pages, and would otherwise intercept a download.
const isPage = (href: string, download?: unknown, target?: string) =>
  href.startsWith("/") && !href.startsWith("//") && download === undefined && target === undefined;

export function Button(props: Props) {
  if (props.href !== undefined) {
    const {
      variant = "plain",
      size = "md",
      outlined = false,
      icon,
      className = "",
      children,
      href,
      ...rest
    } = props as LinkButtonProps;
    const look = `${buttonLook(variant, size, outlined)} ${className}`;
    const content = (
      <>
        {icon && (
          <span aria-hidden className="inline-flex">
            {icon}
          </span>
        )}
        {children}
      </>
    );
    const { download, target } = rest as { download?: unknown; target?: string };
    if (isPage(href, download, target)) {
      return (
        <Link href={href} className={look} {...rest}>
          {content}
        </Link>
      );
    }
    return (
      <a href={href} className={look} {...rest}>
        {content}
      </a>
    );
  }

  const {
    variant = "plain",
    size = "md",
    outlined = false,
    icon,
    className = "",
    type = "button",
    children,
    ...rest
  } = props as ButtonProps;
  return (
    <button type={type} className={`${buttonLook(variant, size, outlined)} ${className}`} {...rest}>
      {icon && (
        <span aria-hidden className="inline-flex">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
