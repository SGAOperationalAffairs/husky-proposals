import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { IdeaPageData } from "@/app/_ideas/data";
import { BOARDS } from "@/core/boards";

// The share dialog's poster (#64): the idea as a poster in its board's color,
// drawn on request from its text, with nothing stored (PRD S7). Portrait, for
// stories and group chats. The image renderer cannot read CSS, so the board
// colors come from design/tokens.css (light mode) and the faces from the
// vendored files in ./fonts (OFL, from Fontsource).
const SIZE = { width: 1080, height: 1350 };
const root = (...parts: string[]) => join(process.cwd(), ...parts);

async function fonts() {
  const read = (file: string) => readFile(root("src/app/_share/fonts", file));
  const [heading, regular, bold] = await Promise.all([
    read("big-shoulders-display-latin-800-normal.woff"),
    read("public-sans-latin-400-normal.woff"),
    read("public-sans-latin-700-normal.woff"),
  ]);
  return [
    { name: "Big Shoulders", data: heading, weight: 800 as const, style: "normal" as const },
    { name: "Public Sans", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Public Sans", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

// One light-mode token's value, read from the single token source.
export function tokenValue(css: string, name: string) {
  const light = css.slice(0, css.indexOf("@media (prefers-color-scheme: dark)"));
  const value = light.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
  if (!value) throw new Error(`design/tokens.css has no --${name}`);
  return value;
}

// Cut at a word near `max` characters, so the poster never overflows.
export function shorten(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}...`;
}

export async function posterImage(idea: IdeaPageData, host: string) {
  const board = BOARDS[idea.board];
  const css = await readFile(root("design/tokens.css"), "utf8");
  const bg = tokenValue(css, `board-${board.color}`);
  const fg = tokenValue(css, `on-board-${board.color}`);
  const delivered = idea.status === "delivered";
  const title = shorten(idea.title, 90);

  return new ImageResponse(
    <div
      style={{
        ...SIZE,
        display: "flex",
        flexDirection: "column",
        padding: 80,
        background: bg,
        color: fg,
        fontFamily: "Public Sans",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 34, fontWeight: 700 }}>
        <span>{board.name}</span>
        <span>#{idea.number}</span>
      </div>
      <div
        style={{
          marginTop: 56,
          fontFamily: "Big Shoulders",
          fontWeight: 800,
          fontSize: title.length > 50 ? 110 : 140,
          lineHeight: 0.92,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 40, fontSize: 36, lineHeight: 1.35 }}>{shorten(idea.description, 140)}</div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", gap: 28 }}>
        <span style={{ fontFamily: "Big Shoulders", fontWeight: 800, fontSize: 220, lineHeight: 0.8 }}>
          {idea.supportCount}
        </span>
        <span style={{ display: "flex", flexDirection: "column", fontSize: 38, fontWeight: 700 }}>
          <span>{delivered ? "students supported this" : "students want this"}</span>
          <span>{idea.willingCount} will help</span>
        </span>
      </div>
      <div
        style={{
          marginTop: 56,
          paddingTop: 28,
          borderTop: `4px solid ${fg}`,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 32,
        }}
      >
        <span style={{ fontWeight: 700 }}>
          Support it at {host}/ideas/{idea.number}
        </span>
        <span>Support helps SGA decide; it is not a vote.</span>
      </div>
    </div>,
    { ...SIZE, fonts: await fonts() },
  );
}
