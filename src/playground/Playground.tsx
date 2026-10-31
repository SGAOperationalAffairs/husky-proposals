"use client";

import { useState, type ReactNode } from "react";
import { BoardFilter } from "@/components/BoardFilter";
import { Button } from "@/components/Button";
import { SelectField, TextArea, TextField } from "@/components/Field";
import { IdeaCard, updatedText } from "@/components/IdeaCard";
import { QueueHeader, QueueRow } from "@/components/QueueRow";
import { SupportPair } from "@/components/SupportPair";
import { SupportSquares } from "@/components/SupportSquares";
import { Tabs } from "@/components/Tabs";
import { BOARD_CODES, BOARDS, type BoardCode } from "@/core/boards";
import palettes from "@design/playground-palettes.json";
import { contrast, contrastVerdict } from "./contrast";
import { IDEAS, QUEUE } from "./sample";
import { applyDials, DIAL_GROUPS, DIALS, INITIAL_DIALS } from "./dials";
import {
  DEFAULT_TEMPLATE,
  emptyOverrides,
  settingsBlob,
  tokenStyle,
  type ColorKey,
  type Mode,
  type Overrides,
} from "./templates";

// The style playground (T0.3b, #29), inside the Poster direction. Local only:
// never compiled into a production build (next.config.ts). Turn the dials, check light, dark, and phone width, then copy the
// settings.

type Taps = Record<number, boolean>;

export function Playground() {
  const [mode, setMode] = useState<Mode>("light");
  const [phone, setPhone] = useState(false);
  const [dials, setDials] = useState<Record<string, string>>(INITIAL_DIALS);
  // Board colors picked one by one (#61), applied over the dials in both modes.
  const [tuned, setTuned] = useState<Tuned>({});
  const [copied, setCopied] = useState("");
  // Hide the panel to see the preview at the full window width.
  const [panelOpen, setPanelOpen] = useState(true);

  const template = DEFAULT_TEMPLATE;
  const overrides: Overrides = applyTuned(applyDials(emptyOverrides(), dials), tuned);

  const copy = async () => {
    const text = JSON.stringify(settingsBlob(template, overrides), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Copied. Paste it into the chat to apply it to design/tokens.css.");
    } catch {
      setCopied(text);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg text-ink lg:flex-row">
      {!panelOpen && (
        <Button variant="primary" className="fixed right-4 bottom-4 z-10" onClick={() => setPanelOpen(true)}>
          Show settings
        </Button>
      )}
      <aside
        hidden={!panelOpen}
        className="flex flex-col gap-5 border-b border-line bg-surface p-5 lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:overflow-y-auto lg:border-r lg:border-b-0"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="heading text-4xl">Playground</h1>
            <p className="mt-1 text-sm text-muted">
              Local only. Tune the Poster direction, then copy the settings.
            </p>
          </div>
          <Button size="sm" onClick={() => setPanelOpen(false)}>
            Hide
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button aria-pressed={mode === "dark"} onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
            {mode === "dark" ? "Dark" : "Light"}
          </Button>
          <Button aria-pressed={phone} onClick={() => setPhone(!phone)}>
            {phone ? "Phone width" : "Full width"}
          </Button>
        </div>

        {DIAL_GROUPS.map((group) => (
          <fieldset key={group} className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-bold">{group}</legend>
            {DIALS.filter((d) => d.group === group).map((d) => (
              <Preset
                key={d.id}
                label={d.label}
                value={dials[d.id] ?? d.initial}
                options={Object.keys(d.options)}
                onChange={(v) => setDials({ ...dials, [d.id]: v })}
              />
            ))}
          </fieldset>
        ))}
        <BoardTuner template={template} overrides={overrides} mode={mode} tuned={tuned} onChange={setTuned} />
        <Button
          onClick={() => {
            setDials(INITIAL_DIALS);
            setTuned({});
          }}
        >
          Reset dials
        </Button>

        <div className="flex flex-col gap-2">
          <Button variant="primary" onClick={copy}>
            Copy settings
          </Button>
          {copied && (
            <p role="status" className="text-sm break-words whitespace-pre-wrap text-muted">
              {copied}
            </p>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto p-4 lg:p-8">
        <div
          data-testid="preview"
          style={tokenStyle(template, overrides, mode)}
          className={`@container mx-auto bg-bg font-sans text-ink ${phone ? "max-w-sm" : "max-w-6xl"}`}
        >
          <PreviewPage />
        </div>
      </main>
    </div>
  );
}

type BoardColor = (typeof BOARDS)[BoardCode]["color"];
// Text on a board color is white or black; the values live with the other
// playground colors in design/ (colors never live in src/).
type TextColor = keyof typeof palettes.text;
const TEXT = palettes.text;
type Tuned = Partial<Record<BoardColor, { color: string; text: TextColor }>>;

function applyTuned(overrides: Overrides, tuned: Tuned): Overrides {
  for (const [board, pick] of Object.entries(tuned)) {
    for (const modeOverrides of [overrides.light, overrides.dark]) {
      modeOverrides[`board-${board}` as ColorKey] = pick.color;
      modeOverrides[`on-board-${board}` as ColorKey] = TEXT[pick.text];
    }
  }
  return overrides;
}

// One color picker per board, with its text color and a live contrast readout,
// so a board color can be tuned by eye without leaving AA (#61).
function BoardTuner(props: {
  template: typeof DEFAULT_TEMPLATE;
  overrides: Overrides;
  mode: Mode;
  tuned: Tuned;
  onChange: (tuned: Tuned) => void;
}) {
  const current = (key: ColorKey) =>
    props.overrides[props.mode][key] ?? props.template[props.mode][key] ?? props.template.light[key] ?? "";
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-bold">Board colors, one by one</legend>
      {BOARD_CODES.map((code) => {
        const { color: name, category } = BOARDS[code];
        const color = current(`board-${name}` as ColorKey);
        const text: TextColor = current(`on-board-${name}` as ColorKey) === TEXT.black ? "black" : "white";
        const ratio = contrast(TEXT[text], color);
        const set = (pick: { color?: string; text?: TextColor }) =>
          props.onChange({ ...props.tuned, [name]: { color, text, ...pick } });
        return (
          <div key={code} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <label htmlFor={`tune-${name}`} className="flex-1 text-sm font-semibold">
                {category}
              </label>
              <input
                id={`tune-${name}`}
                type="color"
                value={color}
                onChange={(e) => set({ color: e.target.value })}
                className="h-8 w-12 rounded-field bordered bg-surface"
              />
              <select
                aria-label={`${category} text color`}
                value={text}
                onChange={(e) => set({ text: e.target.value as TextColor })}
                className="rounded-field bordered bg-surface px-1.5 py-1 text-sm"
              >
                <option value="white">White text</option>
                <option value="black">Black text</option>
              </select>
            </div>
            <p className={`text-xs ${ratio >= 4.5 ? "text-muted" : "font-semibold text-accent-text"}`}>
              {color} with {text} text: {ratio.toFixed(2)}:1, {contrastVerdict(ratio)}
            </p>
          </div>
        );
      })}
    </fieldset>
  );
}

function Preset(props: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <SelectField label={props.label} value={props.value} onChange={(e) => props.onChange(e.target.value)}>
      {props.options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </SelectField>
  );
}

// A whole page in miniature, from the real components: the ideas list, one
// idea, posting with a live preview, and the SGA queue.
function PreviewPage() {
  const [board, setBoard] = useState<BoardCode | "all">("all");
  const [sgaTab, setSgaTab] = useState("queue");
  const [supported, setSupported] = useState<Taps>({ 103: true });
  const [participating, setParticipating] = useState<Taps>({});
  const [draft, setDraft] = useState({ title: "A late-night dining option", board: "DAB" as BoardCode });
  const idea = IDEAS[0]!;
  const shown = IDEAS.filter((i) => board === "all" || i.board === board);
  const taps = (n: number) => ({
    supported: !!supported[n],
    participating: !!participating[n],
    onSupportChange: (v: boolean) => setSupported({ ...supported, [n]: v }),
    onParticipateChange: (v: boolean) => setParticipating({ ...participating, [n]: v }),
  });

  return (
    <div className="flex flex-col gap-14 p-4 @lg:p-8">
      <Section title="Ideas">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="heading text-7xl @3xl:text-8xl">Ideas for campus</h2>
            <p className="mt-3 max-w-prose text-muted">
              Every poster is an idea a student posted. Support the ones you care about, or offer to help.
              Support helps SGA decide; it is not a vote.
            </p>
          </div>
          <Button variant="primary">Post an idea</Button>
        </header>
        <div role="group" aria-label="Board" className="flex flex-wrap gap-2">
          <BoardFilter label="All boards" selected={board === "all"} onClick={() => setBoard("all")} />
          {BOARD_CODES.map((code) => (
            <BoardFilter
              key={code}
              label={BOARDS[code].category}
              color={BOARDS[code].color}
              selected={board === code}
              onClick={() => setBoard(code)}
            />
          ))}
        </div>
        <div className="card-grid">
          {shown.map((i) => (
            <IdeaCard key={i.number} {...i} {...taps(i.number)} />
          ))}
        </div>
      </Section>

      <Section title="One idea">
        <div className="grid items-start gap-6 @3xl:grid-cols-5">
          <article
            data-board={BOARDS[idea.board].color}
            className="poster flex flex-col gap-4 @3xl:col-span-3"
          >
            <p className="flex gap-3 text-sm font-bold">
              <span>{BOARDS[idea.board].name}</span>
              <span>#{idea.number}</span>
            </p>
            <h3 className="heading text-7xl text-balance">{idea.title}</h3>
            <p className="max-w-prose">{idea.description}</p>
            <p className="flex items-end gap-3">
              <span className="heading text-8xl tabular-nums">{idea.supportCount}</span>
              <span className="pb-2 leading-tight font-semibold">
                students want this
                <br />
                {idea.willingCount} will help
              </span>
            </p>
            <SupportPair look="buttons" ideaNumber={idea.number} {...taps(idea.number)} />
            <p className="text-sm">
              &ldquo;I&rsquo;ll participate&rdquo; tells SGA you would help work on this if it moves forward.
            </p>
          </article>
          <aside className="flex flex-col gap-4 bordered bg-surface p-card @3xl:col-span-2">
            <h4 className="heading text-3xl">Where it stands</h4>
            <p>
              In progress, {updatedText(idea.updatedDaysAgo)}. The board met with Student Life about space in
              the Curry Student Center and is pricing shelving and a weekly restock.
            </p>
            <h4 className="heading text-3xl">{idea.supportCount} supporters</h4>
            <SupportSquares
              count={idea.supportCount}
              board={idea.board}
              rank={{ position: 1, of: 9, board: "Dining" }}
            />
          </aside>
        </div>
      </Section>

      <Section title="Post an idea">
        <div className="grid items-start gap-6 @3xl:grid-cols-2">
          <form
            className="flex flex-col gap-3 bordered bg-surface p-card"
            onSubmit={(e) => e.preventDefault()}
          >
            <h3 className="heading text-4xl">Post an idea</h3>
            <TextField
              label="Headline"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <SelectField
              label="Board"
              value={draft.board}
              onChange={(e) => setDraft({ ...draft, board: e.target.value as BoardCode })}
            >
              {BOARD_CODES.map((code) => (
                <option key={code} value={code}>
                  {BOARDS[code].category}
                </option>
              ))}
            </SelectField>
            <TextField label="Where on campus" hint="Optional" placeholder="Stetson East" />
            <TextArea
              label="What would change"
              error="Add a sentence or two so reviewers know what you mean."
              placeholder="Who it helps, and how"
            />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5" />
              <span>
                Anonymous to students. This board&rsquo;s reviewer and the VP of Campus Affairs will still see
                your name, so they can follow up.
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" type="submit">
                Submit for review
              </Button>
              <Button>Save draft</Button>
            </div>
          </form>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-muted">Your poster, as students will see it</p>
            <IdeaCard
              number={160}
              title={draft.title || "Your headline"}
              description="Keep one dining hall open later for students coming out of labs."
              board={draft.board}
              status="collecting_support"
              updatedDaysAgo={0}
              supportCount={0}
              willingCount={0}
            />
          </div>
        </div>
      </Section>

      <Section title="SGA queue">
        <Tabs
          label="SGA pages"
          selected={sgaTab}
          onSelect={setSgaTab}
          tabs={[
            { id: "review", label: "To review", count: 3 },
            { id: "queue", label: "Queue" },
            { id: "updates", label: "Updates", count: 1 },
            { id: "people", label: "People", count: 0 },
          ]}
        />
        <div className="overflow-hidden bordered bg-surface">
          <QueueHeader />
          {QUEUE.map((row) => (
            <QueueRow key={row.number} {...row} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Start working on this</Button>
          <Button variant="line">Put on hold</Button>
          <Button size="sm">Change board</Button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-5">
      {children}
    </section>
  );
}
