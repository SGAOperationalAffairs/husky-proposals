"use client";

import qrcode from "qrcode-generator";
import { useSyncExternalStore } from "react";

// A QR code for an idea's link (#64), for tabling and flyers. Drawn here as one
// SVG path, with no outside service. Always dark on light, in both modes, since
// some phone cameras cannot read a light-on-dark code (--qr-ink, --qr-paper).
//
// The page only knows its path; the address comes from the browser, so the
// code matches whichever site it is on (localhost, a preview, production).
type Props = { path: string };

const QUIET_ZONE = 4;
const noSubscribe = () => () => {};

export function QrCode({ path }: Props) {
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => null,
  );
  // Same size before the address is known, so nothing shifts when it appears.
  if (!origin) return <div aria-hidden className="size-40 bg-qr-paper" />;
  const url = `${origin}${path}`;
  const { size, d } = qrModules(url);
  return (
    <svg
      role="img"
      aria-label={`QR code for ${url}`}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="size-40 bg-qr-paper"
    >
      <path d={d} className="fill-qr-ink" />
    </svg>
  );
}

// The code's dark modules as one path of 1x1 squares, offset by the quiet zone
// that scanners need around the code. Error correction M, which survives a
// scuffed flyer.
export function qrModules(text: string) {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  const n = code.getModuleCount();
  let d = "";
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (code.isDark(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }
  return { size: n + QUIET_ZONE * 2, d };
}
