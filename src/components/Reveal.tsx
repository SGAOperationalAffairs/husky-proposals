import { ViewTransition, type ReactNode } from "react";

// Streamed content rises into place when it replaces its placeholder (#73),
// the same rise as a page change, and the placeholder fades out. Wrap a
// Suspense boundary's fallback in <Reveal.Out> and its content in <Reveal>.
// Nothing else inside animates, so filter changes stay still.
export function Reveal({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="auto" default="none">
      {children}
    </ViewTransition>
  );
}

Reveal.Out = function RevealOut({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit="auto" default="none">
      {children}
    </ViewTransition>
  );
};
