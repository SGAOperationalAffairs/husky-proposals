"use client";

import type { ReactNode } from "react";
import { TextField } from "@/components/Field";
import { StatusLabel } from "@/components/StatusLabel";
import { BOARD_CODES, BOARDS } from "@/core/boards";
import { STATUS_LABELS, type IdeaStatus } from "@/core/statuses";
import { POST_INTRO } from "@/app/_post/intro";

// The text roles the design uses (#55), one specimen each, at the sizes and
// treatments the real pages use. Nothing new: each role copies a real page's
// classes. The intro follows the sidebar's width control.
export function TextSection({ textWidth }: { textWidth: "prose" | "full" }) {
  return (
    <div className="flex flex-col gap-8">
      <Row name="Page title" where="The heading on every page (the Ideas list, Post an idea).">
        <h2 className="heading text-6xl @3xl:text-8xl">Ideas for campus</h2>
      </Row>

      <Row
        name="Intro paragraph"
        where={
          textWidth === "prose" ? "Short, at reading width (about 65 characters)." : "Short, at full width."
        }
      >
        <p className={textWidth === "prose" ? "max-w-prose text-muted" : "text-muted"}>{POST_INTRO.short}</p>
      </Row>

      <Row name="Body copy" where="Paragraphs in a panel or under a heading.">
        <p className="max-w-prose">
          The board met with Student Life about space in the Curry Student Center and is pricing shelving and
          a weekly restock.
        </p>
      </Row>

      <Row name="Hint text" where="A small line under a field.">
        <small className="text-muted">Optional. A short line that helps the student.</small>
      </Row>

      <Row name="Field label" where="The visible label above a field, with the field under it.">
        <div className="max-w-sm">
          <TextField label="Idea title" onPage placeholder="For example, a longer walk signal" />
        </div>
      </Row>

      <Row name="Status word" where="The status chip on a poster and in the queue.">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABELS) as IdeaStatus[]).map((s) => (
            <StatusLabel key={s} status={s} />
          ))}
        </div>
      </Row>

      <Row name="Board name in the band" where="The top line of a poster: the board, then the idea number.">
        <div className="flex flex-wrap gap-3">
          {BOARD_CODES.map((code) => (
            <div key={code} data-board={BOARDS[code].color} className="poster min-w-44">
              <p className="flex gap-3 text-sm font-bold">
                <span>{BOARDS[code].name}</span>
                <span>#103</span>
              </p>
            </div>
          ))}
        </div>
      </Row>
    </div>
  );
}

// One role: its name and where it is used, then the specimen.
function Row({ name, where, children }: { name: string; where: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <div>
        <h3 className="text-sm font-bold">{name}</h3>
        <p className="text-sm text-muted">{where}</p>
      </div>
      {children}
    </div>
  );
}
