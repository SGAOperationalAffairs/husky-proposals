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
import { PAGE } from "@/components/pageTransition";
import { WithdrawDialog } from "@/components/WithdrawDialog";
import { BOARDS } from "@/core/boards";
import { COST_LABELS, SCALE_LABELS, TIME_LABELS } from "@/core/ideaFacts";
import { PENDING_LIMIT, PENDING_LIMIT_REASON, RESUBMIT_LIMIT_REASON } from "@/core/review";
import { BOARD_FOR_CATEGORY, CATEGORIES, parsePostIdea } from "@/core/postIdea";
import { clearDraft, loadDraft, saveDraft, type PostDraft } from "./draft";
import { FIELD_MESSAGES, postMessage, RESUBMIT_SIGNED_OUT } from "./messages";
import { PendingCount } from "./PendingCount";
import type { SimilarIdeaData } from "./present";
import { SimilarIdeas } from "./SimilarIdeas";
import { usePostIdea } from "./usePostIdea";

// The post form (#55). A student picks the board first; the rest of the form
// rises in after that, and the panel takes the board's color with a short
// transition (board-shift in globals.css). Validation is the shared rules in
// src/core/postIdea.ts, so the form and the post action (#54) check the same
// thing. A valid submit runs the action through usePostIdea (#181).
//
// With `edit` (#128) it is the edit form for a post the review sent back: prefilled,
// sent through resubmit, with a section to withdraw the post. Without it nothing changes.

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

type Values = PostDraft;

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
  // Null for a visitor: there is no count to show (#96).
  pendingCount: number | null;
  // The declined post being edited, and its values to start from (#128).
  edit?: { ideaId: string; values: PostDraft };
  // grid: the boards in two columns. line: all five in one row on a wide panel (#55 playground).
  boardTiles?: "grid" | "line";
  // above: the icon sits over the name. inline: the icon sits on the same line as the name (#55 playground).
  iconAlign?: "above" | "inline";
  // Public ideas to match the title against while typing (#55). Not used when editing.
  similarIdeas?: SimilarIdeaData[];
};

export function PostForm({
  pendingCount,
  edit,
  boardTiles = "grid",
  iconAlign = "inline",
  similarIdeas = [],
}: Props) {
  const [values, setValues] = useState<Values>(edit?.values ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const ids = useId();
  const blocked = pendingCount !== null && pendingCount >= PENDING_LIMIT;
  const formRef = useRef<HTMLFormElement>(null);
  const limitRef = useRef<HTMLParagraphElement>(null);
  const focusFirstError = useRef(false);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const withdrawnRef = useRef<HTMLHeadingElement>(null);
  const withdrawRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // In edit mode the board is already picked, so the title is not focused on mount. It is
  // once the student has changed the board. Set in `set`, not in an effect, so a second
  // mount-time effect run in development does not count as a change.
  const boardChanged = useRef(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const ideaId = edit?.ideaId;
  const editing = !!edit;
  const { phase, message, submit: postIt, withdraw, reset } = usePostIdea(ideaId);
  const posting = phase === "posting";
  const saved = phase === "saved";
  const withdrawn = phase === "withdrawn";
  const done = saved || withdrawn;

  const boardCode = isCategory(values.category) ? BOARD_FOR_CATEGORY[values.category] : undefined;
  const board = boardCode ? BOARDS[boardCode] : undefined;
  const BandIcon = isCategory(values.category) ? CATEGORY_ICON[values.category] : undefined;
  const originalCategory = edit?.values.category;
  const originalBoard =
    originalCategory && isCategory(originalCategory) ? BOARD_FOR_CATEGORY[originalCategory] : undefined;
  const boardDiffers = !!edit && !!board && values.category !== originalCategory;

  // Focus the first field with an error, so keyboard users land on it. This runs
  // after the render that marks the fields invalid, not before it.
  useEffect(() => {
    if (!focusFirstError.current) return;
    focusFirstError.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  // Once a board is picked, the title gets focus, so the rest of the form is one tab away.
  // At the limit the fields are disabled, so the reason gets focus instead (#132).
  const picked = !!board;
  useEffect(() => {
    if (!picked || (editing && !boardChanged.current)) return;
    const target = blocked
      ? limitRef.current
      : formRef.current?.querySelector<HTMLElement>("input:not([type='checkbox'])");
    target?.focus();
  }, [picked, blocked, editing]);

  // A post made while signed out comes back here after sign-in (#181). It is filled in
  // after the first render, so the server and the client draw the same first frame.
  // An edit keeps its own draft per idea (#128), and it wins over the server's values.
  useEffect(() => {
    const draft = loadDraft(ideaId);
    if (!draft) return;
    clearDraft(ideaId);
    // Storage is an outside system: its value arrives in a callback, not in the effect body.
    queueMicrotask(() => setValues(draft));
  }, [ideaId]);

  // A link to the card's Withdraw (#withdraw) lands on the section's button (#128).
  useEffect(() => {
    if (ideaId && window.location.hash === "#withdraw") {
      withdrawRef.current?.querySelector("button")?.focus();
    }
  }, [ideaId]);

  // The fields are gone once a post is saved or withdrawn, so focus moves to what replaced them.
  useEffect(() => {
    if (saved) confirmationRef.current?.focus();
  }, [saved]);
  useEffect(() => {
    if (withdrawn) withdrawnRef.current?.focus();
  }, [withdrawn]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    if (key === "category") boardChanged.current = true;
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    const result = parsePostIdea(toInput(values));
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        next[field] ??= FIELD_MESSAGES[field] ?? "Check this field.";
      }
      setErrors(next);
      focusFirstError.current = true;
      return;
    }
    // The server checks again and is the authority; the client check only saves a trip (#181).
    const serverErrors = await postIt(result.data, () => saveDraft(values, ideaId));
    if (serverErrors && Object.keys(serverErrors).length > 0) {
      setErrors(serverErrors);
      focusFirstError.current = true;
    }
  }

  // Keep what the student wrote for after sign-in (#181, the post form's share of #102).
  // The first save happens in onSubmit, before the Sign in link renders; this keeps the
  // draft current if the student edits the form while the prompt is showing.
  useEffect(() => {
    if (phase === "signed_out") saveDraft(values, ideaId);
  }, [phase, values, ideaId]);

  function postAnother() {
    setValues(EMPTY);
    setErrors({});
    reset();
  }

  async function confirmWithdraw() {
    setWithdrawError(null);
    const line = await withdraw();
    if (line) setWithdrawError(line);
    else setWithdrawOpen(false);
  }

  const editPath = ideaId ? `/me/ideas/${ideaId}/edit` : undefined;
  // Only ids that render: no count line for a visitor, no limit line below the limit.
  const describedBy =
    [pendingCount !== null && `${ids}-pending`, blocked && `${ids}-limit`].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex flex-col gap-8">
      <form
        noValidate
        onSubmit={onSubmit}
        aria-label={editing ? "Edit your post" : "Post an idea"}
        ref={formRef}
        // The panel takes the color of the board once one is picked (#55). The color
        // changes in place, so board-shift can animate it.
        data-board={board?.color}
        aria-busy={posting || undefined}
        className={`flex flex-col ${board ? "board-accent" : ""}`}
      >
        <div className="board-shift flex flex-wrap items-center justify-between gap-4 bg-accent p-card text-on-accent">
          <p id={`${ids}-band`} className="flex items-center gap-3 heading text-4xl">
            {BandIcon && <BandIcon aria-hidden className="size-8 shrink-0" />}
            {board ? board.category : "What is this for?"}
          </p>
          {board && !done && (
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
          {!board && !done && (
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

          {saved && (
            <div role="status" className="flex flex-col gap-4 p-card">
              <h2 ref={confirmationRef} tabIndex={-1} className="heading text-4xl">
                {editing ? "Sent for review again" : "Sent for review"}
              </h2>
              {editing ? (
                <p>
                  Your post is not public yet. The board&apos;s chair or director, or the VP of Campus
                  Affairs, usually reviews it within 2 to 3 days.
                </p>
              ) : (
                <p>
                  Your idea is not public yet. The board&apos;s chair or director, or the VP of Campus
                  Affairs, usually reviews it within 2 to 3 days. If it is declined, you will see why, and you
                  can edit it and send it again.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4">
                {editing ? (
                  <Button variant="primary" href="/me" transitionTypes={PAGE}>
                    Back to my ideas
                  </Button>
                ) : (
                  <>
                    <Button variant="primary" href="/" transitionTypes={PAGE}>
                      Back to ideas
                    </Button>
                    <Button variant="text" onClick={postAnother}>
                      Post another idea
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {withdrawn && (
            <div role="status" className="flex flex-col gap-4 p-card">
              <h2 ref={withdrawnRef} tabIndex={-1} className="heading text-4xl">
                Post withdrawn
              </h2>
              <p>It will not be reviewed. You can post a new idea at any time.</p>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" href="/me" transitionTypes={PAGE}>
                  Back to my ideas
                </Button>
                <Button variant="text" href="/post" transitionTypes={PAGE}>
                  Post an idea
                </Button>
              </div>
            </div>
          )}

          {board && !done && (
            <div key="fields" className="poster-arrive flex flex-col gap-6 p-card">
              {boardDiffers && board && (
                <p className="text-muted">A different board will review it: {board.category}.</p>
              )}
              {blocked && (
                <p
                  id={`${ids}-limit`}
                  role="status"
                  tabIndex={-1}
                  ref={limitRef}
                  className="bordered p-card font-semibold"
                >
                  {editing ? RESUBMIT_LIMIT_REASON : PENDING_LIMIT_REASON}
                </p>
              )}

              <fieldset disabled={blocked} className="contents">
                <div className="grid gap-5 @lg:grid-cols-2">
                  <div className="@lg:col-span-2">
                    <TextField
                      label="Title"
                      required
                      hint="Short and specific."
                      error={errors.title}
                      max={120}
                      maxLength={120}
                      value={values.title}
                      onChange={(e) => set("title", e.target.value)}
                    />
                    {!editing && (
                      <SimilarIdeas title={values.title} category={values.category} ideas={similarIdeas} />
                    )}
                  </div>

                  <div className="@lg:col-span-2">
                    <TextArea
                      label="Short description"
                      required
                      hint="One or two sentences. Students see this on the poster."
                      error={errors.summary}
                      rows={2}
                      max={140}
                      maxLength={140}
                      value={values.summary}
                      onChange={(e) => set("summary", e.target.value)}
                    />
                  </div>

                  <div className="@lg:col-span-2">
                    <TextArea
                      label="Detailed description"
                      required
                      hint="Background, who it helps, and what has been tried. At least 80 characters."
                      error={errors.details}
                      rows={5}
                      min={80}
                      max={1000}
                      value={values.details}
                      onChange={(e) => set("details", e.target.value)}
                    />
                  </div>

                  <TextField
                    label="Where on campus"
                    hint="Optional. A building or an area is enough."
                    error={errors.location}
                    max={120}
                    maxLength={120}
                    value={values.location}
                    onChange={(e) => set("location", e.target.value)}
                  />

                  <SelectField
                    label="Scale"
                    value={values.scale}
                    onChange={(e) => set("scale", e.target.value)}
                  >
                    <option value={NOT_SURE}>Not sure</option>
                    {Object.entries(SCALE_LABELS).map(([v, label]) => (
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
                    {Object.entries(COST_LABELS).map(([v, label]) => (
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
                    {Object.entries(TIME_LABELS).map(([v, label]) => (
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
              </fieldset>

              {/* Outside the fieldset so the button stays focusable at the limit and a keyboard
                  user can hear why it does nothing (#132). */}
              {phase === "signed_out" && (
                <div role="status" className="flex flex-col items-start gap-3 bordered p-card">
                  <p>{editing ? RESUBMIT_SIGNED_OUT : postMessage("signed_out")}</p>
                  {/* No prefetch: on dev /sign-in redirects off site (#177). */}
                  <Button
                    variant="primary"
                    href={`/sign-in?next=${encodeURIComponent(editPath ?? "/post")}`}
                    prefetch={false}
                  >
                    Sign in
                  </Button>
                </div>
              )}

              <div className="flex flex-col items-end gap-2">
                {message && (
                  <p role="alert" className="font-semibold text-accent-text">
                    {message}
                  </p>
                )}
                <PendingCount id={`${ids}-pending`} count={pendingCount} />
                <Button
                  variant="primary"
                  type="submit"
                  className="board-shift"
                  // aria-disabled, not disabled, so the button keeps focus; the in-flight guard in
                  // usePostIdea is what stops a second post (#181).
                  aria-disabled={blocked || posting || undefined}
                  aria-describedby={describedBy}
                >
                  {editing
                    ? posting
                      ? "Sending"
                      : "Send for review again"
                    : posting
                      ? "Posting"
                      : "Post idea"}
                </Button>
              </div>
            </div>
          )}

          {/* Edit mode only, and outside the fieldset so it works at the pending limit. */}
          {editing && !done && (
            <div
              id="withdraw"
              ref={withdrawRef}
              className="flex flex-col items-start gap-3 border-t border-line p-card"
            >
              <p className="font-bold">Withdraw this post</p>
              <p className="text-muted">
                It will not be reviewed, and it stops counting toward your pending posts. This cannot be
                undone.
              </p>
              <Button
                variant="line"
                onClick={(e) => {
                  opener.current = e.currentTarget;
                  setWithdrawError(null);
                  setWithdrawOpen(true);
                }}
              >
                Withdraw post
              </Button>
              {(boardCode ?? originalBoard) && (
                <WithdrawDialog
                  board={(boardCode ?? originalBoard)!}
                  open={withdrawOpen}
                  busy={phase === "withdrawing"}
                  error={withdrawError}
                  onConfirm={confirmWithdraw}
                  onCancel={() => setWithdrawOpen(false)}
                  returnFocus={opener}
                />
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
