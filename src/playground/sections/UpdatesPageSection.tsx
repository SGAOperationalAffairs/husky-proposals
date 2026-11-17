import { useState, type CSSProperties } from "react";
import { Bell, ChevronDown, Clock, ListChecks, Megaphone, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/Button";
import { BoardChip } from "@/components/BoardChip";
import { BOARDS, type BoardCode } from "@/core/boards";
import { STATUS_LABELS, type IdeaStatus } from "@/core/statuses";

// Playground only (#130 mock): the Updates leader tab, with sample data and no server.
// The sidebar picks what each row shows, how it looks, and where the composer opens.

export type UpdatesRow = "rows" | "compact";
export type DueFlag = "chip" | "text";
export type UpdateForm = "open" | "behind";
export type UpdateRowStyle = "plain" | "square" | "rail" | "band" | "tag" | "underline";
export type RowButtons = "row" | "none" | "title";
export type UpdateButtonTone = "red" | "black" | "board";
export type UpdateButtonStyle = "outline" | "solid";
export type StatusFlag = "chip" | "hidden";
export type StaleFlag = "off" | "14" | "30";
export type NumberFlag = "show" | "hide";
export type BoardTag = "name" | "color" | "hidden";
export type HistoryFlag = "hidden" | "under" | "dropdown";
export type ComposerOpens = "form" | "side" | "modal";
export type PanelSticky = "scroll" | "sticky";
export type GoStyle = "outline" | "solid";

export const UPDATE_ROW_STYLES: { id: UpdateRowStyle; label: string }[] = [
  { id: "plain", label: "Plain" },
  { id: "square", label: "Colored square" },
  { id: "rail", label: "Color rail" },
  { id: "band", label: "Color band" },
  { id: "tag", label: "Board tag" },
  { id: "underline", label: "Color underline" },
];

export type UpdatesOptions = {
  row: UpdatesRow;
  due: DueFlag;
  form: UpdateForm;
  rowStyle: UpdateRowStyle;
  rowButtons: RowButtons;
  status: StatusFlag;
  stale: StaleFlag;
  number: NumberFlag;
  board: BoardTag;
  history: HistoryFlag;
  opens: ComposerOpens;
  sticky: PanelSticky;
  goStyle: GoStyle;
  buttonTone: UpdateButtonTone;
  buttonStyle: UpdateButtonStyle;
};

type Sample = {
  number: number;
  fol: number;
  sup: number;
  title: string;
  board: BoardCode;
  status: IdeaStatus;
  daysSince: number;
  last: string;
  past: { daysAgo: number; text: string }[];
};
const SAMPLE: Sample[] = [
  {
    number: 103,
    fol: 31,
    sup: 58,
    title: "Later dining hours on Sundays",
    board: "DAB",
    status: "in_progress",
    daysSince: 34,
    last: "Still working, no news",
    past: [
      { daysAgo: 34, text: "Still working, no news" },
      { daysAgo: 60, text: "Met with dining services." },
    ],
  },
  {
    number: 118,
    fol: 24,
    sup: 40,
    title: "A longer walk signal at Huntington and Forsyth",
    board: "CPAB",
    status: "in_progress",
    daysSince: 9,
    last: "Met with the city engineer.",
    past: [{ daysAgo: 9, text: "Met with the city engineer." }],
  },
  {
    number: 124,
    fol: 12,
    sup: 19,
    title: "Free print credits each semester",
    board: "CSC",
    status: "waiting",
    daysSince: 31,
    last: "Waiting on the printing budget.",
    past: [{ daysAgo: 31, text: "Waiting on the printing budget." }],
  },
  {
    number: 131,
    fol: 18,
    sup: 27,
    title: "Refill stations on every floor",
    board: "GIB",
    status: "in_progress",
    daysSince: 4,
    last: "Survey goes out this week.",
    past: [{ daysAgo: 4, text: "Survey goes out this week." }],
  },
];
const CADENCE_DAYS = 30; // monthly by default, per board (#12)

const TEMPLATES = [
  {
    id: "formed",
    label: "Committee formed",
    text: "The board has formed a committee to work on this. We will share the first meeting date soon.",
  },
  {
    id: "met",
    label: "Meeting held",
    text: "The board committee met this week. We reviewed the plan and agreed on next steps: [add the steps].",
  },
  { id: "mile", label: "Milestone reached", text: "We reached a milestone: [describe it]." },
  {
    id: "late",
    label: "Delayed",
    text: "This is taking longer than planned because [reason]. New expected timing: [date].",
  },
  { id: "custom", label: "Write my own", text: "" },
] as const;

const chip = "poster-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold";

function dueText(daysSince: number): { text: string; due: boolean } {
  const left = CADENCE_DAYS - daysSince;
  return left <= 0
    ? { text: `Due ${-left} days ago`, due: true }
    : { text: `Due in ${left} days`, due: false };
}

// The row's own look. Each one uses the board's color through var(--b), set by data-board.
function rowLook(style: UpdateRowStyle): {
  row: string;
  rowStyle?: CSSProperties;
  head: string;
  headStyle?: CSSProperties;
  title: CSSProperties | undefined;
} {
  switch (style) {
    case "rail":
      return { row: "border-l-4", rowStyle: { borderLeftColor: "var(--b)" }, head: "", title: undefined };
    case "band":
      return {
        row: "",
        head: "px-3 py-1",
        headStyle: { background: "var(--b)", color: "var(--on-b)" },
        title: undefined,
      };
    case "underline":
      return {
        row: "",
        head: "",
        title: { textDecoration: "underline", textDecorationColor: "var(--b)", textUnderlineOffset: "4px" },
      };
    default:
      return { row: "", head: "", title: undefined };
  }
}

function Filter({
  label,
  icon: Icon,
  pressed,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={chip}>
      <Icon aria-hidden className="size-4" />
      {label}
    </button>
  );
}

// The composer for one idea, as concept-2's Updates panel draws it: the title, a Start from
// menu, Status, the text, Send to with the counts, and one preview, then Post update. Past
// updates live on the row, not here. The same panel in the side column, the modal, and the
// form (#130 mock).
const STATUS_CHOICES = [
  { id: "keep", label: "Keep as In progress" },
  { id: "deliver", label: "Mark as Delivered" },
] as const;

function Composer({
  idea,
  form,
  onClose,
  showGo = false,
  goStyle = "outline",
}: {
  idea: Sample | null;
  form: UpdateForm;
  onClose?: () => void;
  showGo?: boolean;
  goStyle?: GoStyle;
}) {
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]["id"]>("formed");
  const [body, setBody] = useState<string>(TEMPLATES[0].text);
  const [status, setStatus] = useState<(typeof STATUS_CHOICES)[number]["id"]>("keep");
  const [audience, setAudience] = useState<"followers" | "both">("followers");
  const text = body || "Your update appears here.";
  const field = "flex flex-col gap-1";
  const label = "text-sm font-semibold";
  // White fields on the panel, so they read as inputs (a fixed white, not the page tint).
  const control = "rounded-field bordered bg-paper text-line w-full px-3 py-2";
  return (
    <div className="relative flex flex-col gap-4 bordered bg-surface p-card">
      <h3 className="pr-10 heading text-3xl">{idea ? `New update on ${idea.title}` : "Post an update"}</h3>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-1">
          <X aria-hidden className="size-5" />
        </button>
      )}
      {showGo && idea && (
        <Button variant="primary" outlined={goStyle === "outline"} href={`/ideas/${idea.number}`}>
          Go to idea
        </Button>
      )}
      <label className={field}>
        <span className={label}>Start from</span>
        <select
          value={template}
          onChange={(e) => {
            const t = TEMPLATES.find((x) => x.id === e.target.value) ?? TEMPLATES[0];
            setTemplate(t.id);
            setBody(t.text);
          }}
          className={control}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className={field}>
        <span className={label}>Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUS_CHOICES)[number]["id"])}
          className={control}
        >
          {STATUS_CHOICES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className={field}>
        <span className={label}>What students will read</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={control} />
      </label>
      <label className={field}>
        <span className={label}>Send to</span>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as "followers" | "both")}
          className={control}
        >
          <option value="followers">Followers ({idea?.fol ?? 0})</option>
          <option value="both">Followers and supporters ({idea?.sup ?? 0})</option>
        </select>
      </label>
      <div className="bordered bg-bg p-3 text-sm">
        <b>{idea ? `Proposal ${idea.number}: ${idea.title}` : "Proposal"}</b>
        <br />
        {text.length > 110 ? `${text.slice(0, 108)}...` : text}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary">
          <Bell aria-hidden className="size-4" />
          Post update
        </Button>
        {form === "behind" && onClose && (
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export function UpdatesPageSection({ options }: { options: UpdatesOptions }) {
  const {
    row,
    due,
    form,
    rowStyle,
    rowButtons,
    status,
    stale,
    number,
    board,
    history,
    opens,
    buttonTone,
    buttonStyle,
    sticky,
    goStyle,
  } = options;
  // Red is the accent, black is the page's ink, and board uses the row's own color (--b, set by
  // data-board on the row), so each row's button matches its board.
  const tone =
    buttonTone === "red" ? "var(--accent-text)" : buttonTone === "black" ? "var(--line)" : "var(--b-text)";
  // Solid: the tone fills the button, and the text is the color that reads on it.
  const fill = buttonTone === "red" ? "var(--accent)" : buttonTone === "black" ? "var(--line)" : "var(--b)";
  const ink =
    buttonTone === "red" ? "var(--on-accent)" : buttonTone === "black" ? "var(--surface)" : "var(--on-b)";
  const buttonLook: CSSProperties =
    buttonStyle === "solid"
      ? { background: fill, color: ink, borderColor: "transparent" }
      : { color: tone, borderColor: tone };
  const [onlyDue, setOnlyDue] = useState(false);
  const [open, setOpen] = useState(form === "open");
  const [target, setTarget] = useState<number | null>(null);
  // Drop-down mode: the one row that is open, if any (#221 mock).
  const [expanded, setExpanded] = useState<number | null>(null);
  const look = rowLook(rowStyle);
  const staleAfter = stale === "off" ? null : Number(stale);

  const rows = SAMPLE.map((r) => ({ ...r, ...dueText(r.daysSince) }))
    .filter((r) => !onlyDue || r.due)
    .sort((a, b) => Number(b.due) - Number(a.due));
  const targetIdea = SAMPLE.find((r) => r.number === target) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="heading text-6xl @3xl:text-8xl">Updates</h1>
      <div className="flex flex-wrap gap-2">
        <Filter label="All" icon={ListChecks} pressed={!onlyDue} onClick={() => setOnlyDue(false)} />
        <Filter label="Due for an update" icon={Clock} pressed={onlyDue} onClick={() => setOnlyDue(true)} />
      </div>

      {rowButtons === "title" && <p className="text-xs text-muted">Click on an idea to post an update.</p>}
      <div className={`grid gap-6 ${opens === "side" ? "@3xl:grid-cols-5" : ""}`}>
        <div className={opens === "side" ? "min-w-0 @3xl:col-span-3" : "min-w-0"}>
          <ul
            className={
              row === "rows"
                ? "flex flex-col gap-3"
                : "flex flex-col divide-y divide-line bordered bg-surface"
            }
          >
            {rows.map((r) => {
              const isStale = staleAfter !== null && r.daysSince > staleAfter;
              return (
                <li
                  key={r.number}
                  data-board={BOARDS[r.board].color}
                  className={`${row === "rows" ? "flex flex-wrap items-start justify-between gap-3 bordered bg-surface p-card" : "flex flex-wrap items-center justify-between gap-3 px-4 py-2"} ${look.row}`}
                  style={look.rowStyle}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className={`flex items-center gap-x-3 ${look.head}`} style={look.headStyle}>
                      {rowStyle === "square" && (
                        <span
                          aria-hidden
                          className="inline-block size-3"
                          style={{ background: "var(--b)" }}
                        />
                      )}
                      {number === "show" && (
                        <span className="text-sm font-bold tabular-nums">#{r.number}</span>
                      )}
                      {board === "name" && <BoardChip board={r.board} />}
                      {board === "color" && (
                        <span
                          aria-hidden
                          className="inline-block size-3"
                          style={{ background: "var(--b)" }}
                        />
                      )}
                      {rowButtons === "title" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTarget(r.number);
                            if (opens === "form") setOpen(true);
                          }}
                          className={`min-w-0 flex-1 text-left underline-offset-4 hover:underline ${row === "rows" ? "heading text-2xl" : "font-bold"}`}
                          style={look.title}
                        >
                          {r.title}
                        </button>
                      ) : (
                        <span
                          className={`min-w-0 flex-1 ${row === "rows" ? "heading text-2xl" : "font-bold"}`}
                          style={look.title}
                        >
                          {r.title}
                        </span>
                      )}
                      {status === "chip" && (
                        <span className="bordered px-2 py-0.5 text-xs font-bold">
                          {STATUS_LABELS[r.status]}
                        </span>
                      )}
                      {isStale && (
                        <span className="bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">Stale</span>
                      )}
                      {due === "chip" ? (
                        <span
                          className={`inline-block shrink-0 px-2 py-0.5 text-xs font-bold whitespace-nowrap ${r.due ? "bg-accent text-on-accent" : "bordered text-muted"}`}
                        >
                          {r.text}
                        </span>
                      ) : (
                        <span
                          className={`shrink-0 text-sm whitespace-nowrap ${r.due ? "font-bold text-accent-text" : "text-muted"}`}
                        >
                          {r.text}
                        </span>
                      )}
                    </div>
                    {history === "dropdown" ? (
                      <button
                        type="button"
                        aria-expanded={expanded === r.number}
                        aria-label={`Past updates for #${r.number}`}
                        onClick={() => setExpanded(expanded === r.number ? null : r.number)}
                        className="flex w-full items-center gap-1 text-left text-sm text-muted"
                      >
                        Last update: {r.last}
                        <ChevronDown
                          aria-hidden
                          className={`size-4 shrink-0 transition-transform ${expanded === r.number ? "rotate-180" : ""}`}
                        />
                      </button>
                    ) : (
                      <p className="text-sm text-muted">Last update: {r.last}</p>
                    )}
                    {history === "under" && (
                      <ul className="flex flex-col gap-1 text-sm text-muted">
                        {r.past.map((p) => (
                          <li key={p.daysAgo}>
                            {p.daysAgo} days ago: {p.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {rowButtons === "row" && (
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-2 border-2 px-3 py-1.5 text-sm font-bold"
                      style={buttonLook}
                      onClick={() => {
                        setTarget(r.number);
                        if (opens === "form") setOpen(true);
                      }}
                    >
                      <Megaphone aria-hidden className="size-4" />
                      Update #{r.number}
                    </button>
                  )}
                  {history === "dropdown" && expanded === r.number && (
                    <ul className="flex w-full flex-col gap-1 text-sm text-muted">
                      {r.past.map((p) => (
                        <li key={p.daysAgo}>
                          {p.daysAgo} days ago: {p.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        {opens === "side" && (
          <aside
            aria-label="Update"
            className={`min-w-0 self-start @3xl:col-span-2 ${sticky === "sticky" ? "@3xl:sticky @3xl:top-0" : ""}`}
          >
            {targetIdea ? (
              <Composer
                goStyle={goStyle}
                idea={targetIdea}
                form={form}
                onClose={() => setTarget(null)}
                showGo
              />
            ) : (
              <p className="bordered bg-surface p-card text-muted">Click an idea to post an update.</p>
            )}
          </aside>
        )}
      </div>

      {/* Where the composer opens: inline (the form below), a side panel, or a modal (#221 mock). */}
      {opens === "form" && (
        <section className="flex flex-col gap-4">
          {form === "behind" && !open ? (
            <Button variant="primary" onClick={() => setOpen(true)}>
              Post an update
            </Button>
          ) : targetIdea ? (
            <Composer
              idea={targetIdea}
              form={form}
              onClose={form === "behind" ? () => setOpen(false) : undefined}
            />
          ) : (
            <Composer goStyle={goStyle} idea={null} form={form} />
          )}
        </section>
      )}
      {opens === "modal" && targetIdea && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Update"
          className="fixed inset-0 z-10 grid place-items-center bg-scrim p-4"
        >
          <div className="w-full max-w-lg">
            <Composer goStyle={goStyle} idea={targetIdea} form={form} onClose={() => setTarget(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
