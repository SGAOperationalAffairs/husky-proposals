"use client";

import { qrModules } from "./qrModules";
import { useOrigin } from "./useOrigin";

// A QR code for an idea's link (#64), for tabling and flyers. Drawn here as one
// SVG path, with no outside service. Always dark on light, in both modes, since
// some phone cameras cannot read a light-on-dark code (--paper, --paper-ink).
//
// The page only knows its path; the address comes from the browser.
// `className` sets the size (size-40 by default).
type Props = { path: string; className?: string };

export function QrCode({ path, className = "size-40" }: Props) {
  const origin = useOrigin();
  // Same size before the address is known, so nothing shifts when it appears.
  if (!origin) return <div aria-hidden className={`${className} bg-paper`} />;
  const url = `${origin}${path}`;
  const { size, d } = qrModules(url);
  return (
    <svg
      role="img"
      aria-label={`QR code for ${url}`}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`${className} bg-paper`}
    >
      <path d={d} className="fill-paper-ink" />
    </svg>
  );
}
