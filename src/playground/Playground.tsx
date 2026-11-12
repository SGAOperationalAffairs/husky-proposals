"use client";

import { useId, useState, type ReactNode } from "react";
import { BoardFilter } from "@/components/BoardFilter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/Field";
import { IdeaCard, updatedText } from "@/components/IdeaCard";
import { IdeaPlaceholder, WallPlaceholder } from "@/components/Placeholder";
import { Flyer } from "@/components/Flyer";
import { ShareDialog } from "@/components/ShareDialog";
import { SiteHeader } from "@/components/SiteHeader";
import { SubmitYours } from "@/components/SubmitYours";
import { PostForm } from "@/app/_post/PostForm";
import { ButtonsSection } from "./sections/ButtonsSection";
import { FiltersSection } from "./sections/FiltersSection";
import { InProgressCardsSection } from "./sections/InProgressCardsSection";
import { CORNER_TAG_STYLES, CornerCardSection, type CornerTagStyle } from "./sections/CornerCardSection";
import { SurfacesSection } from "./sections/SurfacesSection";
import { TextSection } from "./sections/TextSection";
import { TOP_BAR_STYLES, TopBarSection, type TopBarStyle } from "./sections/TopBarSection";
import { POST_INTRO } from "@/app/_post/intro";
import { CopyLink } from "@/components/CopyLink";
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

// Every choice the sidebar makes (#55 playground). The preview only shows them.
type Choices = {
  boardTiles: "grid" | "line";
  iconAlign: "above" | "inline";
  pendingPosts: "0" | "1" | "2" | "3";
  submitAt: "title" | "end";
  backdrop: "page" | "board";
  edges: "border" | "float";
  posterShadow: "on" | "off";
  textWidth: "prose" | "full";
  topBarStyle: TopBarStyle;
  cornerTag: CornerTagStyle;
  cornerX: number;
  cornerY: number;
  logoInline: boolean;
  fullWidth: boolean;
};
const INITIAL_CHOICES: Choices = {
  boardTiles: "grid",
  iconAlign: "inline",
  pendingPosts: "0",
  submitAt: "title",
  backdrop: "board",
  edges: "float",
  posterShadow: "off",
  textWidth: "full",
  topBarStyle: "underline",
  cornerTag: "white-board",
  cornerX: 0,
  cornerY: 0,
  logoInline: false,
  fullWidth: true,
};

// The preview shows one section at a time, as Resume Studio's playground does.
const SECTIONS = [
  { id: "ideas", label: "Ideas", title: "Ideas" },
  { id: "filters", label: "Filters", title: "Filters" },
  { id: "topbar", label: "Top bar", title: "Top bar" },
  { id: "buttons", label: "Buttons", title: "Buttons" },
  { id: "surfaces", label: "Surfaces", title: "Surfaces" },
  { id: "text", label: "Text", title: "Text" },
  { id: "one", label: "One idea", title: "One idea" },
  { id: "idea-page", label: "Idea page", title: "Idea page in its color" },
  { id: "in-progress-cards", label: "In progress cards", title: "In progress cards" },
  { id: "corner-card", label: "Corner tag card", title: "Corner tag card" },
  { id: "loading", label: "Loading", title: "Loading" },
  { id: "share", label: "Share", title: "Share" },
  { id: "post", label: "Post an idea", title: "Post an idea" },
  { id: "queue", label: "SGA queue", title: "SGA queue" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

// The settings each page uses. A page's sidebar shows only these; the card layout
// dials are for the wall and the placeholder grid, not one idea or the queue.
const LAYOUT = ["perRow", "gap", "density"];
const TYPE = ["case", "titleSize", "weight"];
const LOOK = ["boards", "bg", "border", "corners"];
const PAGE_SETTINGS: Record<SectionId, { dials: string[]; choices: (keyof Choices)[]; tuner: boolean }> = {
  ideas: { dials: [...LAYOUT, ...TYPE, "titleLines", "desc", ...LOOK], choices: ["submitAt"], tuner: true },
  // The new sections have no settings of their own, so they show the shared dials for what they draw.
  filters: { dials: LOOK, choices: [], tuner: true },
  topbar: { dials: [...TYPE, ...LOOK], choices: ["topBarStyle", "logoInline", "fullWidth"], tuner: true },
  buttons: { dials: LOOK, choices: [], tuner: true },
  surfaces: { dials: ["density", ...LOOK], choices: [], tuner: true },
  text: { dials: [...TYPE, ...LOOK], choices: ["textWidth"], tuner: true },
  one: { dials: [...TYPE, "number", "titleLines", "desc", ...LOOK], choices: [], tuner: true },
  "idea-page": {
    dials: [...TYPE, "number", "titleLines", "desc", ...LOOK],
    choices: ["backdrop", "posterShadow"],
    tuner: true,
  },
  "in-progress-cards": { dials: [...TYPE, "titleLines", "desc", ...LOOK], choices: [], tuner: true },
  "corner-card": {
    dials: [...LAYOUT, ...TYPE, "titleLines", "desc", ...LOOK],
    choices: ["cornerTag", "cornerX", "cornerY"],
    tuner: true,
  },
  loading: { dials: [...LAYOUT, "bg", "border", "corners"], choices: [], tuner: false },
  share: { dials: [...TYPE, ...LOOK], choices: [], tuner: true },
  post: {
    dials: [...TYPE, ...LOOK],
    choices: ["boardTiles", "iconAlign", "pendingPosts"],
    tuner: true,
  },
  queue: { dials: ["boards", "bg", "border", "corners"], choices: [], tuner: true },
};

export function Playground() {
  const [mode, setMode] = useState<Mode>("light");
  const [phone, setPhone] = useState(false);
  const [dials, setDials] = useState<Record<string, string>>(INITIAL_DIALS);
  // Board colors picked one by one (#61), applied over the dials in both modes.
  const [tuned, setTuned] = useState<Tuned>({});
  const [copied, setCopied] = useState("");
  // Hide the panel to see the preview at the full window width.
  const [panelOpen, setPanelOpen] = useState(true);
  const [choices, setChoices] = useState<Choices>(INITIAL_CHOICES);
  const [section, setSection] = useState<SectionId>("ideas");

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

        <SectionSettings section={section} choices={choices} onChange={setChoices} />
        {DIAL_GROUPS.map((group) => {
          const shown = DIALS.filter((d) => d.group === group && PAGE_SETTINGS[section].dials.includes(d.id));
          if (shown.length === 0) return null;
          return (
            <fieldset key={group} className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-bold">{group}</legend>
              {shown.map((d) => (
                <Preset
                  key={d.id}
                  label={d.label}
                  value={dials[d.id] ?? d.initial}
                  options={Object.keys(d.options)}
                  onChange={(v) => setDials({ ...dials, [d.id]: v })}
                />
              ))}
            </fieldset>
          );
        })}
        {PAGE_SETTINGS[section].tuner && (
          <BoardTuner
            template={template}
            overrides={overrides}
            mode={mode}
            tuned={tuned}
            onChange={setTuned}
          />
        )}
        <Button
          onClick={() => {
            setDials(INITIAL_DIALS);
            setTuned({});
            setChoices(INITIAL_CHOICES);
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

      <main className="flex-1 overflow-x-auto p-4 lg:p-6">
        <div
          data-testid="preview"
          style={tokenStyle(template, overrides, mode)}
          className={`@container mx-auto bg-bg font-sans text-ink ${phone ? "max-w-sm" : "max-w-6xl"}`}
        >
          <PreviewPage choices={choices} section={section} onSection={setSection} />
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

// A row of buttons for one choice. Lives in the sidebar with every other setting.
function ChoiceGroup<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-bold">{props.label}</legend>
      <div className="flex flex-wrap gap-2">
        {props.options.map((o) => (
          <Button
            key={o.value}
            size="sm"
            variant={props.value === o.value ? "primary" : "plain"}
            aria-pressed={props.value === o.value}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

// A slider with its label and the value in pixels.
function SliderRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex items-center justify-between gap-3 text-sm font-semibold">
        {props.label}
        <span className="text-muted tabular-nums">{props.value}px</span>
      </label>
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

// A switch with its label. The label is the button's name; the On or Off word
// repeats the state for anyone who cannot see the track.
function ToggleRow(props: { label: string; on: boolean; onChange: (on: boolean) => void; note?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span id={id} className="text-sm font-semibold">
          {props.label}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-muted">{props.on ? "On" : "Off"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={props.on}
            aria-labelledby={id}
            onClick={() => props.onChange(!props.on)}
            className={`relative inline-flex h-6 w-11 shrink-0 bordered ${props.on ? "border-accent bg-accent" : "bg-bg"}`}
          >
            <span
              aria-hidden
              className={`absolute top-0.5 left-0.5 size-4 transition-transform duration-(--motion-fast) ease-out motion-reduce:transition-none ${
                props.on ? "translate-x-5.5 bg-on-accent" : "bg-line"
              }`}
            />
          </button>
        </span>
      </div>
      {props.note && <p className="text-sm text-muted">{props.note}</p>}
    </div>
  );
}

// The settings for the section being shown. Each section lists only its own
// choices; the token dials and board colors below apply to every section.
function SectionSettings({
  section,
  choices,
  onChange,
}: {
  section: SectionId;
  choices: Choices;
  onChange: (c: Choices) => void;
}) {
  const set = <K extends keyof Choices>(key: K, value: Choices[K]) => onChange({ ...choices, [key]: value });
  const name = SECTIONS.find((x) => x.id === section)?.label ?? "";
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-bold">Settings for {name}</legend>
      {section === "post" && (
        <>
          <ChoiceGroup
            label="Board tiles"
            value={choices.boardTiles}
            options={[
              { value: "grid", label: "Grid" },
              { value: "line", label: "One line" },
            ]}
            onChange={(v) => set("boardTiles", v)}
          />
          <ChoiceGroup
            label="Board icon"
            value={choices.iconAlign}
            options={[
              { value: "above", label: "Above the name" },
              { value: "inline", label: "In line with it" },
            ]}
            onChange={(v) => set("iconAlign", v)}
          />
          <ChoiceGroup
            label="Pending posts"
            value={choices.pendingPosts}
            options={[
              { value: "0", label: "0" },
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3 (the limit)" },
            ]}
            onChange={(v) => set("pendingPosts", v)}
          />
        </>
      )}
      {section === "text" && (
        <ChoiceGroup
          label="Intro width"
          value={choices.textWidth}
          options={[
            { value: "full", label: "Full width" },
            { value: "prose", label: "Reading width" },
          ]}
          onChange={(v) => set("textWidth", v)}
        />
      )}
      {section === "corner-card" && (
        <>
          <ChoiceGroup
            label="Tag color"
            value={choices.cornerTag}
            options={CORNER_TAG_STYLES.map((o) => ({ value: o.id, label: o.label }))}
            onChange={(v) => set("cornerTag", v)}
          />
          <SliderRow
            label="Tag across"
            value={choices.cornerX}
            min={-40}
            max={40}
            onChange={(v) => set("cornerX", v)}
          />
          <SliderRow
            label="Tag down"
            value={choices.cornerY}
            min={-40}
            max={40}
            onChange={(v) => set("cornerY", v)}
          />
        </>
      )}
      {section === "topbar" && (
        <>
          <ChoiceGroup
            label="Top bar style"
            value={choices.topBarStyle}
            options={TOP_BAR_STYLES.map((o) => ({ value: o.id, label: o.label }))}
            onChange={(v) => set("topBarStyle", v)}
          />
          <ToggleRow
            label="Logo inline with the list choice"
            on={choices.logoInline}
            onChange={(v) => set("logoInline", v)}
            note={
              TOP_BAR_STYLES.find((o) => o.id === choices.topBarStyle)?.logoAlwaysInline
                ? "No effect on this style: it already puts the logo inline."
                : undefined
            }
          />
          <ToggleRow label="Full width" on={choices.fullWidth} onChange={(v) => set("fullWidth", v)} />
        </>
      )}
      {section === "ideas" && (
        <ChoiceGroup
          label="Submit yours"
          value={choices.submitAt}
          options={[
            { value: "title", label: "Under the title" },
            { value: "end", label: "End of the ideas" },
          ]}
          onChange={(v) => set("submitAt", v)}
        />
      )}
      {section === "idea-page" && (
        <>
          <ChoiceGroup
            label="Background"
            value={choices.backdrop}
            options={[
              { value: "board", label: "Board color" },
              { value: "page", label: "Page" },
            ]}
            onChange={(v) => set("backdrop", v)}
          />
          <ChoiceGroup
            label="Poster shadow"
            value={choices.posterShadow}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) => set("posterShadow", v)}
          />
        </>
      )}
      {PAGE_SETTINGS[section].choices.length === 0 && (
        <p className="text-sm text-muted">No settings only for this page.</p>
      )}
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
function PreviewPage({
  choices,
  section,
  onSection,
}: {
  choices: Choices;
  section: SectionId;
  onSection: (s: SectionId) => void;
}) {
  const [board, setBoard] = useState<BoardCode | "all">("all");
  const [sgaTab, setSgaTab] = useState("queue");
  const [supported, setSupported] = useState<Taps>({ 103: true });
  const [participating, setParticipating] = useState<Taps>({});
  const { boardTiles, iconAlign, submitAt, textWidth } = choices;
  const idea = IDEAS[0]!;
  const shown = IDEAS.filter((i) => board === "all" || i.board === board);
  const taps = (n: number) => ({
    supported: !!supported[n],
    participating: !!participating[n],
    onSupportChange: (v: boolean) => setSupported({ ...supported, [n]: v }),
    onParticipateChange: (v: boolean) => setParticipating({ ...participating, [n]: v }),
  });

  return (
    <div className="flex flex-col gap-6 p-4 @lg:p-6">
      <Tabs
        label="Playground sections"
        tabs={SECTIONS.map((x) => ({ id: x.id, label: x.label }))}
        selected={section}
        onSelect={(id) => onSection(id as SectionId)}
      />
      {section === "ideas" && (
        <Section title="Ideas">
          <SiteHeader />
          {/* The title, with the way to post right under it, as on the real Ideas page (#55). */}
          <div className="flex flex-col gap-4">
            <h2 className="heading text-7xl @3xl:text-8xl">Ideas for campus</h2>
            {submitAt === "title" && <SubmitYours />}
          </div>
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
          {submitAt === "end" && <SubmitYours />}
        </Section>
      )}

      {section === "filters" && (
        <Section title="Filters">
          <FiltersSection />
        </Section>
      )}

      {section === "topbar" && (
        <Section title="Top bar">
          <TopBarSection
            style={choices.topBarStyle}
            logoInline={choices.logoInline}
            fullWidth={choices.fullWidth}
          />
        </Section>
      )}

      {section === "buttons" && (
        <Section title="Buttons">
          <ButtonsSection />
        </Section>
      )}

      {section === "surfaces" && (
        <Section title="Surfaces">
          <SurfacesSection />
        </Section>
      )}

      {section === "text" && (
        <Section title="Text">
          <TextSection textWidth={textWidth} />
        </Section>
      )}

      {section === "one" && (
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
                &ldquo;I&rsquo;ll participate&rdquo; tells SGA you would help work on this if it moves
                forward.
              </p>
            </article>
            <aside className="flex flex-col gap-4 bordered bg-surface p-card @3xl:col-span-2">
              <h4 className="heading text-3xl">Where it stands</h4>
              <p>
                In progress, {updatedText(idea.updatedDaysAgo)}. The board met with Student Life about space
                in the Curry Student Center and is pricing shelving and a weekly restock.
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
      )}

      {/* Trying an idea page whose whole background is its board's color. */}
      {section === "idea-page" && (
        <Section title="Idea page in its color">
          <IdeaBackdrop
            backdrop={choices.backdrop}
            edges={choices.edges}
            posterShadow={choices.posterShadow}
          />
        </Section>
      )}

      {/* What the wall and an idea page show while they load (#73), and the
          share dialog with its flyer (#64), held still so they can be looked at. */}
      {section === "in-progress-cards" && (
        <Section title="In progress cards">
          <InProgressCardsSection />
        </Section>
      )}

      {section === "corner-card" && (
        <Section title="Corner tag card">
          <CornerCardSection
            tagStyle={choices.cornerTag}
            offset={{ x: choices.cornerX, y: choices.cornerY }}
          />
        </Section>
      )}

      {section === "loading" && (
        <Section title="Loading">
          <WallPlaceholder />
          <IdeaPlaceholder />
        </Section>
      )}

      {section === "share" && (
        <Section title="Share">
          <div className="flex flex-col items-start gap-4">
            <ShareDialog
              number={idea.number}
              title={idea.title}
              description={idea.description}
              board={idea.board}
            />
            <div className="w-full max-w-sm bordered p-4">
              <Flyer
                number={idea.number}
                title={idea.title}
                description={idea.description}
                board={idea.board}
              />
            </div>
          </div>
        </Section>
      )}

      {section === "post" && (
        <Section title="Post an idea">
          <header className="flex flex-col gap-3">
            <h2 className="heading text-7xl @3xl:text-8xl">Post an idea</h2>
            <p className="text-muted">{POST_INTRO.short}</p>
          </header>
          <PostForm
            pendingCount={Number(choices.pendingPosts)}
            boardTiles={boardTiles}
            iconAlign={iconAlign}
          />
        </Section>
      )}

      {section === "queue" && (
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
      )}
    </div>
  );
}

// An idea page with its board's color as the whole background, beside the
// current look (page background, poster in color). The real header, poster,
// pair, and cards, so the comparison is honest.
function IdeaBackdrop({
  backdrop,
  edges,
  posterShadow,
}: {
  backdrop: Choices["backdrop"];
  edges: Choices["edges"];
  posterShadow: Choices["posterShadow"];
}) {
  // Cards outlined (today) or floating on a hard offset shadow (being tried).
  const card = `flex flex-col gap-3 bg-surface p-card text-ink ${edges === "float" ? "edge-float" : "bordered"}`;
  const [code, setCode] = useState<BoardCode>("CPAB");
  const idea = IDEAS.find((i) => i.board === code) ?? IDEAS[0]!;
  const board = BOARDS[code];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {BOARD_CODES.map((c) => (
          <BoardFilter
            key={c}
            label={BOARDS[c].category}
            color={BOARDS[c].color}
            selected={code === c}
            onClick={() => setCode(c)}
          />
        ))}
      </div>
      <div
        data-board={board.color}
        className={`board-accent flex flex-col gap-6 p-6 @lg:p-8 ${backdrop === "board" ? "board-backdrop" : "bg-bg"}`}
      >
        <SiteHeader />
        <Button variant="text" className="self-start" icon={<ChevronLeft className="size-4" />}>
          Back to ideas
        </Button>
        <div className="grid items-start gap-6 @3xl:grid-cols-5">
          <article
            className={`poster flex flex-col gap-4 @3xl:col-span-3 ${posterShadow === "on" ? "edge-float" : ""}`}
          >
            <p className="flex flex-wrap gap-3 text-sm font-bold">
              <span>{board.name}</span>
              <span>#{idea.number}</span>
            </p>
            <h3 className="heading text-6xl text-balance">{idea.title}</h3>
            <p className="max-w-prose">{idea.description}</p>
            <p className="flex items-end gap-3">
              <span className="heading text-8xl tabular-nums">{idea.supportCount}</span>
              <span className="pb-2 leading-tight font-semibold">
                students want this
                <br />
                {idea.willingCount} will help
              </span>
            </p>
            <SupportPair
              look="buttons"
              ideaNumber={idea.number}
              board={code}
              supported={false}
              participating={false}
            />
          </article>
          <aside className="flex flex-col gap-6 @3xl:col-span-2">
            <section className={card}>
              <h4 className="heading text-3xl">Where it stands</h4>
              <p>
                This idea is collecting support. The {board.name} looks at its ideas regularly and usually
                works on 1 to 2 at a time.
              </p>
              <p className="text-sm text-muted">Updated 3 days ago.</p>
            </section>
            <section className={card}>
              <h4 className="heading text-3xl">{idea.supportCount} supporters</h4>
              <SupportSquares count={idea.supportCount} board={code} />
            </section>
            <section className={card}>
              <h4 className="heading text-3xl">Share this idea</h4>
              <div className="flex flex-wrap gap-3">
                <CopyLink board={code} />
                <ShareDialog
                  number={idea.number}
                  title={idea.title}
                  description={idea.description}
                  board={code}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
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
