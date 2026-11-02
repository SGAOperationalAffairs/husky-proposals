import qrcode from "qrcode-generator";

// The QR code's modules as plain data, so a server route (the flyer PDF, issue 120) and
// the browser component draw the same code. Kept out of QrCode.tsx, which is a client
// component: server code cannot call a function from a "use client" file.

const QUIET_ZONE = 4;

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
