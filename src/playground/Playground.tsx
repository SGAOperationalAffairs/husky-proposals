"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { SelectField, TextArea, TextField } from "@/components/Field";
import { IdeaCard } from "@/components/IdeaCard";
import { QueueHeader, QueueRow } from "@/components/QueueRow";
import { StatusLabel } from "@/components/StatusLabel";
import { SupportPair } from "@/components/SupportPair";
import { SupportSquares } from "@/components/SupportSquares";
import { Tabs } from "@/components/Tabs";
import { BoardTag } from "@/components/Tag";
import { CATEGORIES, IDEAS, QUEUE } from "./sample";
import { TEMPLATES, emptyOverrides, settingsBlob, tokenStyle, type Mode, type Overrides } from "./templates";

// The style playground (T0.3b, #29). Local only: never compiled into a
// production build (next.config.ts). Pick a whole-app template, check it in
// light, dark, and phone width, nudge three things, then copy the settings.
const CORNERS: Record<string, Partial<Overrides["shared"]> | null> = {
  "Template default": null,
  Square: { "card-radius": "0", "field-radius": "0", "button-radius": "0", "chip-radius": "0" },
  Small: { "card-radius": "4px", "field-radius": "2px", "button-radius": "4px", "chip-radius": "999px" },
  Rounded: { "card-radius": "10px", "field-radius": "8px", "button-radius": "8px", "chip-radius": "999px" },
};
const FONTS: Record<string, string | null> = {
  "Template default": null,
  System: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  "Bricolage Grotesque": "var(--pg-font-bricolage), system-ui, sans-serif",
  Newsreader: "var(--pg-font-newsreader), Georgia, serif",
  "Hanken Grotesk": "var(--pg-font-hanken), system-ui, sans-serif",
  "Barlow Condensed": 'var(--pg-font-barlow), "Arial Narrow", sans-serif',
};
const RULES: Record<string, string | null> = {
  "Template default": null,
  None: "0",
  Thin: "3px",
  Standard: "5px",
  Thick: "8px",
};

export function Playground() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0]!.id);
  const [mode, setMode] = useState<Mode>("light");
  const [phone, setPhone] = useState(false);
  const [corners, setCorners] = useState("Template default");
  const [font, setFont] = useState("Template default");
  const [rule, setRule] = useState("Template default");
  const [copied, setCopied] = useState("");

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]!;
  const overrides: Overrides = emptyOverrides();
  Object.assign(overrides.shared, CORNERS[corners] ?? {});
  if (FONTS[font]) overrides.shared["font-heading"] = FONTS[font]!;
  if (RULES[rule] !== null && RULES[rule] !== undefined) overrides.shared["accent-rule"] = RULES[rule]!;

  const pick = (id: string) => {
    setTemplateId(id);
    setCorners("Template default");
    setFont("Template default");
    setRule("Template default");
  };

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
    <div className="flex min-h-full flex-col bg-bg text-ink lg:flex-row">
      <aside className="flex flex-col gap-5 border-b border-line bg-surface p-5 lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div>
          <h1 className="text-xl font-semibold">Style playground</h1>
          <p className="mt-1 text-sm text-muted">
            Local only. Pick a direction for Husky Proposals, then copy the settings.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Template</legend>
          {TEMPLATES.map((t) => (
            <label
              key={t.id}
              className={`flex cursor-pointer flex-col gap-0.5 border border-line p-2.5 ${t.id === templateId ? "border-ink bg-bg" : ""}`}
            >
              <span className="flex items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={t.id === templateId}
                  onChange={() => pick(t.id)}
                />
                {t.name}
              </span>
              <span className="text-sm text-muted">{t.description}</span>
            </label>
          ))}
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <Button aria-pressed={mode === "dark"} onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
            {mode === "dark" ? "Dark" : "Light"}
          </Button>
          <Button aria-pressed={phone} onClick={() => setPhone(!phone)}>
            {phone ? "Phone width" : "Full width"}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <Preset label="Corners" value={corners} options={Object.keys(CORNERS)} onChange={setCorners} />
          <Preset label="Heading font" value={font} options={Object.keys(FONTS)} onChange={setFont} />
          <Preset
            label="Rule across the top of cards"
            value={rule}
            options={Object.keys(RULES)}
            onChange={setRule}
          />
        </div>

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
          className={`@container mx-auto bg-bg font-sans text-ink ${phone ? "max-w-sm" : "max-w-5xl"}`}
        >
          <PreviewPage />
        </div>
      </main>
    </div>
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

// A whole page in miniature: the ideas list, one idea, posting, and the SGA
// queue, all from the real components (Studio: judge a direction on a page).
function PreviewPage() {
  const [studentTab, setStudentTab] = useState("ideas");
  const [sgaTab, setSgaTab] = useState("queue");
  const [category, setCategory] = useState("All");
  const [supported, setSupported] = useState<Record<number, boolean>>({ 103: true });
  const [participating, setParticipating] = useState<Record<number, boolean>>({});
  const idea = IDEAS[0]!;

  return (
    <div className="flex flex-col gap-10 p-4 @lg:p-6">
      <Section title="Ideas">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="heading text-3xl leading-tight">Ideas for campus</h2>
            <p className="mt-1 max-w-prose text-muted">
              Post an idea, support the ones you care about, and follow what happens next. Support helps SGA
              decide; it is not a vote.
            </p>
          </div>
          <Button variant="primary">Post an idea</Button>
        </header>
        <Tabs
          label="Student pages"
          selected={studentTab}
          onSelect={setStudentTab}
          tabs={[
            { id: "ideas", label: "Ideas" },
            { id: "progress", label: "In progress" },
            { id: "mine", label: "My posts" },
          ]}
        />
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === category}
              onClick={() => setCategory(c)}
              className="rounded-chip bordered bg-surface px-3 py-1 text-sm aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid gap-4 @2xl:grid-cols-2">
          {IDEAS.map((i) => (
            <IdeaCard
              key={i.number}
              {...i}
              supported={!!supported[i.number]}
              participating={!!participating[i.number]}
              onSupportChange={(v) => setSupported({ ...supported, [i.number]: v })}
              onParticipateChange={(v) => setParticipating({ ...participating, [i.number]: v })}
            />
          ))}
        </div>
      </Section>

      <Section title="One idea">
        <article className="flex flex-col gap-4 rounded-card bordered accent-rule bg-surface p-card shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-muted">Proposal {idea.number}</span>
            <BoardTag label={idea.boardTag} />
            <StatusLabel status={idea.status} />
          </div>
          <h3 className="heading text-2xl leading-tight">{idea.title}</h3>
          <p className="max-w-prose">{idea.description}</p>
          <div className="grid gap-6 @2xl:grid-cols-2">
            <div>
              <h4 className="mb-2 font-semibold">Student support</h4>
              <SupportSquares count={idea.supportCount} rank={{ position: 1, of: 9, board: "DAB" }} />
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Your support</h4>
              <SupportPair
                size="full"
                ideaNumber={idea.number}
                supportCount={idea.supportCount}
                willingCount={idea.willingCount}
                supported={!!supported[idea.number]}
                participating={!!participating[idea.number]}
                onSupportChange={(v) => setSupported({ ...supported, [idea.number]: v })}
                onParticipateChange={(v) => setParticipating({ ...participating, [idea.number]: v })}
              />
              <p className="mt-2.5 text-sm text-muted">
                &ldquo;I&rsquo;ll participate&rdquo; tells SGA you would help work on this if it moves
                forward.
              </p>
            </div>
          </div>
        </article>
      </Section>

      <Section title="Post an idea">
        <form
          className="grid gap-3 rounded-card bordered bg-surface p-card @lg:grid-cols-2"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="@lg:col-span-2">
            <TextField label="Title" placeholder="A late-night dining option on weeknights" />
          </div>
          <SelectField label="Category" defaultValue="Dining">
            {CATEGORIES.slice(1).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <TextField label="Where on campus" hint="Optional" placeholder="Stetson East" />
          <div className="@lg:col-span-2">
            <TextArea
              label="Describe the idea"
              error="Add a sentence or two so reviewers know what you mean."
              placeholder="What would change, and who would it help?"
            />
          </div>
          <label className="flex items-start gap-2 text-sm @lg:col-span-2">
            <input type="checkbox" className="mt-0.5" />
            <span>
              Post anonymous to students. Other students will not see your name. The board&rsquo;s reviewer
              and the VP of Campus Affairs can, so they can follow up if your idea moves forward.
            </span>
          </label>
          <div className="flex flex-wrap gap-2 @lg:col-span-2">
            <Button variant="primary" type="submit">
              Submit for review
            </Button>
            <Button>Save draft</Button>
          </div>
        </form>
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
        <div className="overflow-hidden rounded-card bordered bg-surface">
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
    <section aria-label={title} className="flex flex-col gap-4">
      {children}
    </section>
  );
}
