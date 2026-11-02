"use client";

import {
  Building2,
  ChevronLeft,
  Leaf,
  Recycle,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { SelectField, TextArea, TextField } from "@/components/Field";
import { BOARDS } from "@/core/boards";
import { PENDING_LIMIT } from "@/core/review";
import { BOARD_FOR_CATEGORY, CATEGORIES, parsePostIdea } from "@/core/postIdea";

// The post form (#55). A student picks the board first; the rest of the form
// rises in after that, and the panel takes the board's color with a short
// transition (board-shift in globals.css). Validation is the shared rules in
// src/core/postIdea.ts, so the form and the post action (#54) check the same
// thing. The action is not wired yet: submitting only checks the fields.

const NOT_SURE = "";

// One icon per category, so a student can tell the boards apart at a glance.
const CATEGORY_ICON: Record<(typeof CATEGORIES)[number], LucideIcon> = {
  dining: UtensilsCrossed,
  campus_planning: Building2,
  campus_services: Wrench,
  green_initiatives: Leaf,
  sustainability: Recycle,
};

const isCategory = (v: string): v is (typeof CATEGORIES)[number] =>
  (CATEGORIES as readonly string[]).includes(v);

type Values = {
  title: string;
  summary: string;
  details: string;
  category: string;
  location: string;
  scale: string;
  costBand: string;
  timeHorizon: string;
  anonymous: boolean;
};

const EMPTY: Values = {
  title: "",
  summary: "",
  details: "",
  category: "",
  location: "",
  scale: NOT_SURE,
  costBand: NOT_SURE,
  timeHorizon: NOT_SURE,
  anonymous: false,
};

const SCALE = { small: "Small", medium: "Medium", large: "Large" } as const;
const COST = { under_1k: "Under $1k", from_1k_to_5k: "$1k to $5k", over_5k: "$5k or more" } as const;
const TIME = {
  this_semester: "This semester",
  next_semester: "Next semester",
  within_a_year: "Within a year",
} as const;

// Field names as the rules module reports them, mapped to the plain message a student sees.
const MESSAGES: Record<string, string> = {
  title: "Add a title, up to 120 characters.",
  summary: "Add a summary, up to 140 characters.",
  details: "Keep the details under 4,000 characters.",
  category: "Choose the board this idea is for.",
  location: "Keep the location under 120 characters.",
};

function toInput(values: Values) {
  const pick = (v: string) => (v === NOT_SURE ? undefined : v);
  return {
    title: values.title,
    summary: values.summary,
    details: values.details,
    category: values.category,
    location: values.location,
    scale: pick(values.scale),
    costBand: pick(values.costBand),
    timeHorizon: pick(values.timeHorizon),
    anonymous: values.anonymous,
  };
}

type Props = {
  // How many of this student's posts are waiting for review (PENDING_LIMIT caps them).
  pendingCount: number;
  // grid: the boards in two columns. line: all five in one row on a wide panel (#55 playground).
  boardTiles?: "grid" | "line";
  // above: the icon sits over the name. inline: the icon sits on the same line as the name (#55 playground).
  iconAlign?: "above" | "inline";
};

export function PostForm({ pendingCount, boardTiles = "grid", iconAlign = "inline" }: Props) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const ids = useId();
  const blocked = pendingCount >= PENDING_LIMIT;
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstError = useRef(false);

  const boardCode = isCategory(values.category) ? BOARD_FOR_CATEGORY[values.category] : undefined;
  const board = boardCode ? BOARDS[boardCode] : undefined;
  const BandIcon = isCategory(values.category) ? CATEGORY_ICON[values.category] : undefined;

  // Focus the first field with an error, so keyboard users land on it. This runs
  // after the render that marks the fields invalid, not before it.
  useEffect(() => {
    if (!focusFirstError.current) return;
    focusFirstError.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  // Once a board is picked, the title gets focus, so the rest of the form is one tab away.
  const picked = !!board;
  useEffect(() => {
    if (!picked) return;
    formRef.current?.querySelector<HTMLElement>("input:not([type='checkbox'])")?.focus();
  }, [picked]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    const result = parsePostIdea(toInput(values));
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        next[field] ??= MESSAGES[field] ?? "Check this field.";
      }
      setErrors(next);
      focusFirstError.current = true;
      return;
    }
    // TODO(#54): call the post action with result.data here.
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        noValidate
        onSubmit={onSubmit}
        aria-label="Post an idea"
        ref={formRef}
        // The panel takes the color of the board once one is picked (#55). The color
        // changes in place, so board-shift can animate it.
        data-board={board?.color}
        className={`flex flex-col ${board ? "board-accent" : ""}`}
      >
        <div className="board-shift flex flex-wrap items-center justify-between gap-4 bg-accent p-card text-on-accent">
          <p id={`${ids}-band`} className="flex items-center gap-3 heading text-4xl">
            {BandIcon && <BandIcon aria-hidden className="size-8 shrink-0" />}
            {board ? board.category : "What is this for?"}
          </p>
          {board && (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
              onClick={() => set("category", NOT_SURE)}
            >
              <ChevronLeft aria-hidden className="size-5" />
              Change board
            </button>
          )}
        </div>

        <div className="flex flex-col">
          {!board && (
            <div className="flex flex-col gap-4 py-card">
              <div
                role="group"
                aria-labelledby={`${ids}-band`}
                className={
                  boardTiles === "line" ? "flex gap-3 overflow-x-auto pb-1" : "grid gap-3 @lg:grid-cols-2"
                }
              >
                {CATEGORIES.map((c) => {
                  const option = BOARDS[BOARD_FOR_CATEGORY[c]];
                  const Icon = CATEGORY_ICON[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      data-board={option.color}
                      onClick={() => set("category", c)}
                      className={`board-accent board-shift bg-accent p-card text-left text-on-accent motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-1 ${boardTiles === "line" ? "w-48 shrink-0" : ""}`}
                    >
                      <span
                        className={iconAlign === "inline" ? "flex items-center gap-3" : "flex flex-col gap-3"}
                      >
                        <Icon aria-hidden className="size-8 shrink-0" />
                        <span className={`heading ${boardTiles === "line" ? "text-2xl" : "text-3xl"}`}>
                          {option.category}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm">{option.description}</span>
                    </button>
                  );
                })}
              </div>
              {errors.category && <p className="px-card font-semibold text-accent-text">{errors.category}</p>}
            </div>
          )}

          {board && (
            <div key="fields" className="poster-arrive flex flex-col gap-6 p-card">
              {blocked && (
                <p role="status" className="bordered p-card font-semibold">
                  You have {pendingCount} posts waiting for review. You can post again once one is reviewed.
                </p>
              )}

              <fieldset disabled={blocked} className="contents">
                <div className="grid gap-5 @lg:grid-cols-2">
                  <div className="@lg:col-span-2">
                    <TextField
                      label="Title"
                      hint="Short and specific. Up to 120 characters."
                      error={errors.title}
                      maxLength={120}
                      value={values.title}
                      onChange={(e) => set("title", e.target.value)}
                    />
                  </div>

                  <div className="@lg:col-span-2">
                    <TextArea
                      label="Short description"
                      hint="One or two sentences. Students see this on the poster. Up to 140 characters."
                      error={errors.summary}
                      rows={2}
                      maxLength={140}
                      value={values.summary}
                      onChange={(e) => set("summary", e.target.value)}
                    />
                  </div>

                  <div className="@lg:col-span-2">
                    <TextArea
                      label="Detailed description"
                      hint="Optional. Background, who it helps, and what has already been tried."
                      error={errors.details}
                      rows={5}
                      value={values.details}
                      onChange={(e) => set("details", e.target.value)}
                    />
                  </div>

                  <TextField
                    label="Where on campus"
                    hint="Optional. A building or an area is enough."
                    error={errors.location}
                    value={values.location}
                    onChange={(e) => set("location", e.target.value)}
                  />

                  <SelectField
                    label="Scale"
                    value={values.scale}
                    onChange={(e) => set("scale", e.target.value)}
                  >
                    <option value={NOT_SURE}>Not sure</option>
                    {Object.entries(SCALE).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Rough cost"
                    value={values.costBand}
                    onChange={(e) => set("costBand", e.target.value)}
                  >
                    <option value={NOT_SURE}>Not sure</option>
                    {Object.entries(COST).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="When"
                    value={values.timeHorizon}
                    onChange={(e) => set("timeHorizon", e.target.value)}
                  >
                    <option value={NOT_SURE}>Not sure</option>
                    {Object.entries(TIME).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </SelectField>
                </div>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={values.anonymous}
                    onChange={(e) => set("anonymous", e.target.checked)}
                  />
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">Post anonymously to students</span>
                    <span className="text-muted">
                      Students will not see your name. Only the board&apos;s reviewer and the VP of Campus
                      Affairs will see who posted it.
                    </span>
                  </span>
                </label>

                <p className="text-muted">
                  Every post is reviewed before it shows. The board&apos;s chair or director, or the VP of
                  Campus Affairs, reviews it, usually within 2 to 3 days. If it is declined, you will see why,
                  and you can edit it and send it again.
                </p>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="primary" type="submit" className="board-shift">
                    Post idea
                  </Button>
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
