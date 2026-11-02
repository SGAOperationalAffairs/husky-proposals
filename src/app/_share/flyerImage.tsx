import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { IdeaPageData } from "@/app/_ideas/data";
import { qrModules } from "@/components/qrModules";
import { BOARDS } from "@/core/boards";
import { fonts, shorten, tokenValue } from "./posterImage";

// The printable flyer as one picture (issue 120), the same layout as the flyer page
// (src/components/Flyer.tsx): the board's poster band on top, then the description,
// a QR code to the idea, and what support means. Drawn at 200 dpi on a Letter page,
// so the PDF wrapper (flyerPdf.ts) can place it at full size. Image layout has no
// container queries, so the sizes here are fixed in pixels.
export const FLYER_SIZE = { width: 1700, height: 2200 };

const root = (...parts: string[]) => join(process.cwd(), ...parts);

export async function flyerImage(idea: IdeaPageData, origin: string) {
  const board = BOARDS[idea.board];
  const css = await readFile(root("design/tokens.css"), "utf8");
  const band = tokenValue(css, `board-${board.color}`);
  const bandInk = tokenValue(css, `on-board-${board.color}`);
  const paper = tokenValue(css, "paper");
  const ink = tokenValue(css, "paper-ink");
  const title = shorten(idea.title, 80);
  const description = shorten(idea.description, 180);
  const { size, d } = qrModules(`${origin}/ideas/${idea.number}`);

  return new ImageResponse(
    <div
      style={{
        ...FLYER_SIZE,
        display: "flex",
        flexDirection: "column",
        background: paper,
        color: ink,
        fontFamily: "Public Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "130px 130px 110px",
          background: band,
          color: bandInk,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 56, fontWeight: 700 }}>
          <span>{board.name}</span>
          <span>#{idea.number}</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 60,
            fontFamily: "Big Shoulders",
            fontWeight: 800,
            fontSize: 150,
            lineHeight: 1.02,
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "110px 130px 110px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", fontSize: 62, lineHeight: 1.3 }}>{description}</div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg
            width={520}
            height={520}
            viewBox={`0 0 ${size} ${size}`}
            style={{ display: "flex", flexShrink: 0 }}
          >
            <path d={d} fill={ink} />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 90 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Big Shoulders",
                fontWeight: 800,
                fontSize: 120,
                lineHeight: 1,
              }}
            >
              Scan to support this idea
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 46, lineHeight: 1.35 }}>
              Read it, support it, or offer to help. Support helps SGA decide; it is not a vote.
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            borderTop: `6px solid ${ink}`,
            paddingTop: 30,
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          Husky Proposals, from Northeastern’s Student Government Association
        </div>
      </div>
    </div>,
    { ...FLYER_SIZE, fonts: await fonts() },
  );
}
