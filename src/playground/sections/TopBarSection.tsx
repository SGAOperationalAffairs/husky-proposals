"use client";

import { useId, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { BoardFilter } from "@/components/BoardFilter";
import { Button } from "@/components/Button";
import { tabLook } from "@/components/tabLook";
import { BOARD_CODES, BOARDS } from "@/core/boards";
import { IDEAS } from "@/playground/sample";

// Six ways to lay out the top bar: the logo and the two student lists, Ideas and
// In progress (#63). The sidebar picks one, and it shows alone at full width, so
// each can be judged on its own. Links and chips do nothing here: mock-ups for
// choosing. The real top bar is SiteHeader.

export type TopBarStyle =
  | "underline"
  | "segmented"
  | "switch"
  | "headings"
  | "filter"
  | "centered"
  | "stack"
  | "split"
  | "ruled"
  | "oversized"
  | "tall"
  | "counts";
type ListId = "ideas" | "progress";

// logoAlwaysInline: the option already puts the logo on the list's row, so the
// "logo inline" toggle does nothing for it (the sidebar says so).
export const TOP_BAR_STYLES: {
  id: TopBarStyle;
  label: string;
  description: string;
  logoAlwaysInline: boolean;
}[] = [
  {
    id: "underline",
    label: "Underline tabs",
    description:
      "The current look. The two lists share the full width, and the red line marks the one you are on.",
    logoAlwaysInline: false,
  },
  {
    id: "segmented",
    label: "Segmented bar",
    description: "Two equal halves. Good when there are only two lists.",
    logoAlwaysInline: true,
  },
  {
    id: "switch",
    label: "Switch",
    description:
      "One line: the logo, then a switch between the two lists. Takes the least space at the top of a page.",
    logoAlwaysInline: true,
  },
  {
    id: "headings",
    label: "Big headings",
    description:
      "The list names are the headings, so the choice is hard to miss. The type gets smaller on a phone.",
    logoAlwaysInline: false,
  },
  {
    id: "filter",
    label: "Filter row",
    description:
      "No tabs. The page is the Ideas list, and In progress is a filter chip beside the board chips.",
    logoAlwaysInline: false,
  },
  {
    id: "centered",
    label: "Centered",
    description: "The logo sits centered, with the two lists centered under it and a thin rule below them.",
    logoAlwaysInline: false,
  },
  {
    id: "stack",
    label: "Poster stack",
    description:
      "Each list is a full-width block with very large type. The one you are on is filled in ink, and the other is outlined.",
    logoAlwaysInline: false,
  },
  {
    id: "split",
    label: "Split poster",
    description:
      "The two lists split the width. The one you are on is filled in the accent red. On a phone the type steps down so each name stays on one line.",
    logoAlwaysInline: false,
  },
  {
    id: "ruled",
    label: "Ruled index",
    description:
      "A plain index. Hairlines separate the names, and a short red bar at the left marks the one you are on.",
    logoAlwaysInline: false,
  },
  {
    id: "oversized",
    label: "Oversized toggle",
    description:
      "One huge heading shows the list you are on, with a small button to switch to the other. Good when most people use one list at a time.",
    logoAlwaysInline: false,
  },
  {
    id: "tall",
    label: "Tall type",
    description:
      "Both names at their largest size. The one you are on has a thick red bar under it, and the other is in the muted grey.",
    logoAlwaysInline: false,
  },
  {
    id: "counts",
    label: "Heading counts",
    description:
      "Each name has a badge with the number of ideas in that list. The list you are on has a filled badge.",
    logoAlwaysInline: false,
  },
];

const LISTS: { id: ListId; label: string }[] = [
  { id: "ideas", label: "Ideas" },
  { id: "progress", label: "In progress" },
];

// The logo: the same markup as SiteHeader's, without the link, so the mock-ups
// can sit anywhere. The caller sets its alignment.
function Logo({ className = "self-start" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span aria-hidden className="bordered px-1.5 heading text-lg leading-tight">
        SGA
      </span>
      <span className="font-bold">Husky Proposals</span>
    </span>
  );
}

type ListProps = { logoInline: boolean; list: ListId; onList: (id: ListId) => void };

// A row of tabs in the shared tab look (tabLook). Tabs (src/components/Tabs.tsx)
// has no layout prop, so the spread and centered rows set their own.
function TabRow({
  label,
  selected,
  onSelect,
  className = "",
  tabClass = "",
}: {
  label: string;
  selected: ListId;
  onSelect: (id: ListId) => void;
  className?: string;
  tabClass?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex gap-0.5 overflow-x-auto border-b border-line ${className}`}
    >
      {LISTS.map((item) => {
        const active = item.id === selected;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(item.id)}
            className={`${tabLook(active)} ${tabClass}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// a. The current look, with the tabs spread across the full width.
function UnderlineBar({ logoInline, list, onList }: ListProps) {
  const tabs = (
    <TabRow
      label="Lists"
      selected={list}
      onSelect={onList}
      className="w-full"
      tabClass="flex-1 justify-center"
    />
  );
  if (logoInline) {
    return (
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Logo className="self-end" />
        <div className="min-w-0 grow">{tabs}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Logo />
      {tabs}
    </div>
  );
}

// b. Two equal halves. The active half is filled with the accent color; the
// other is on the page color with a border. The logo sits at the left on wide
// screens and above on a phone, so the logo toggle does nothing here.
function SegmentedBar({ list, onList }: ListProps) {
  return (
    <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:gap-6">
      <Logo className="self-start @3xl:self-center" />
      <div role="tablist" aria-label="Lists" className="grid min-w-0 flex-1 grid-cols-2">
        {LISTS.map((item, i) => {
          const active = item.id === list;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onList(item.id)}
              // The second half overlaps the first by one border, so the seam is one line.
              className={`bordered py-3 text-center font-semibold ${i > 0 ? "-ml-(--border)" : ""} ${
                active ? "border-accent bg-accent text-on-accent" : "border-line bg-bg text-ink"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// c. One line: the logo, then a switch track with both labels and a knob over
// the active one. Two radio buttons, so the arrow keys work inside the group.
// Stacks on a phone, where a single line would crowd the logo.
function SwitchBar({ list, onList }: ListProps) {
  const name = useId();
  return (
    <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:gap-6">
      <Logo className="self-start @3xl:self-center" />
      <div
        role="radiogroup"
        aria-label="Lists"
        className="relative grid min-w-0 flex-1 grid-cols-2 bordered bg-bg"
      >
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1/2 bg-accent transition-transform duration-(--motion-fast) ease-out motion-reduce:transition-none ${
            list === "progress" ? "translate-x-full" : ""
          }`}
        />
        {LISTS.map((item) => {
          const active = item.id === list;
          return (
            <label key={item.id} className="relative cursor-pointer">
              <input
                type="radio"
                name={name}
                value={item.id}
                checked={active}
                onChange={() => onList(item.id)}
                className="peer sr-only"
              />
              <span
                className={`block py-3 text-center font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus ${
                  active ? "text-on-accent" : ""
                }`}
              >
                {item.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// d. The list names as big headings, side by side. The active one has a rule
// across its full column under it.
function HeadingsBar({ logoInline, list, onList }: ListProps) {
  const headings = (
    <div role="tablist" aria-label="Lists" className="flex w-full gap-6">
      {LISTS.map((item) => {
        const active = item.id === list;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onList(item.id)}
            className="flex min-w-0 flex-1 flex-col gap-2 text-left"
          >
            <span
              className={`heading text-4xl @xl:text-5xl @3xl:text-6xl ${active ? "text-ink" : "text-muted"}`}
            >
              {item.label}
            </span>
            <span aria-hidden className={`block h-(--accent-rule) w-full ${active ? "bg-accent" : ""}`} />
          </button>
        );
      })}
    </div>
  );
  if (logoInline) {
    return (
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Logo className="self-end" />
        <div className="min-w-0 grow">{headings}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Logo />
      {headings}
    </div>
  );
}

// e. No tabs. The heading is Ideas; In progress is a chip in a filter row, pressed
// (filled) when it is on. The board chips sit beside it, as on the real page.
function FilterBar({ logoInline, list, onList }: ListProps) {
  const heading = <h2 className="heading text-6xl @3xl:text-7xl">Ideas</h2>;
  return (
    <div className="flex flex-col gap-4">
      {logoInline ? (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Logo className="self-end" />
          {heading}
        </div>
      ) : (
        <>
          <Logo />
          {heading}
        </>
      )}
      <div role="group" aria-label="Board and status" className="flex w-full flex-wrap gap-2">
        {BOARD_CODES.map((code) => (
          <BoardFilter
            key={code}
            label={BOARDS[code].category}
            color={BOARDS[code].color}
            selected={false}
            onClick={() => {}}
          />
        ))}
        <BoardFilter
          label="In progress"
          selected={list === "progress"}
          onClick={() => onList(list === "progress" ? "ideas" : "progress")}
        />
      </div>
    </div>
  );
}

// f. The logo centered, the two lists centered under it on a thin rule. With the
// logo toggle on, the logo and the lists share one centered line.
function CenteredBar({ logoInline, list, onList }: ListProps) {
  if (logoInline) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Logo className="self-center" />
        <TabRow label="Lists" selected={list} onSelect={onList} className="justify-center" />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <Logo className="self-center" />
      <TabRow label="Lists" selected={list} onSelect={onList} className="w-full justify-center" />
    </div>
  );
}

// Counts for the heading-count option, from the sample ideas: Ideas is every
// idea, and In progress is the ones with the in_progress status.
const COUNTS: Record<ListId, number> = {
  ideas: IDEAS.length,
  progress: IDEAS.filter((idea) => idea.status === "in_progress").length,
};

// The logo and the list choice, laid out as the older options do: the logo
// beside the choice when the logo toggle is on, above it when off.
function Framed({ logoInline, children }: { logoInline: boolean; children: ReactNode }) {
  if (logoInline) {
    return (
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Logo className="self-end" />
        <div className="min-w-0 grow">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Logo />
      {children}
    </div>
  );
}

// The new options use buttons with aria-pressed, not tabs: they switch which
// list is shown, and none of them needs the arrow-key tab pattern.
const PRESS = "transition-colors duration-(--motion-fast) motion-reduce:transition-none";

// g. Poster stack. Each list is a full-width block. The one on is filled in ink;
// the other is outlined. Outlined text takes its stroke from the border token,
// since Tailwind has no class for a text stroke.
const OUTLINE: CSSProperties = { color: "transparent", WebkitTextStroke: "var(--border) var(--ink)" };
function PosterStackBar({ logoInline, list, onList }: ListProps) {
  return (
    <Framed logoInline={logoInline}>
      <div role="group" aria-label="Lists" className="flex flex-col gap-3">
        {LISTS.map((item) => {
          const active = item.id === list;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onList(item.id)}
              style={active ? undefined : OUTLINE}
              className={`w-full bordered px-4 py-3 text-left heading text-6xl leading-none @3xl:text-8xl ${PRESS} ${
                active ? "border-ink bg-ink text-bg" : "border-line bg-bg"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </Framed>
  );
}

// h. Split poster. The two lists share the width in two halves. The one on is
// filled in the accent red; the other sits on the page color with a border.
// On a phone the type is smaller, so each name fits its half on one line.
function SplitBar({ logoInline, list, onList }: ListProps) {
  return (
    <Framed logoInline={logoInline}>
      <div role="group" aria-label="Lists" className="grid grid-cols-2">
        {LISTS.map((item, i) => {
          const active = item.id === list;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onList(item.id)}
              // The second half overlaps the first by one border, as in the segmented bar.
              className={`min-w-0 bordered px-3 py-5 text-center heading text-2xl leading-none whitespace-nowrap @md:text-4xl @3xl:py-8 @3xl:text-7xl ${PRESS} ${
                i > 0 ? "-ml-(--border)" : ""
              } ${active ? "border-accent bg-accent text-on-accent" : "border-line bg-bg text-ink"}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </Framed>
  );
}

// i. Ruled index. A list of large names with hairlines between them. The one on
// has a short red bar at its left edge; the others keep the same indent, so the
// names line up.
function RuledBar({ logoInline, list, onList }: ListProps) {
  return (
    <Framed logoInline={logoInline}>
      <div role="group" aria-label="Lists" className="flex flex-col border-t border-line">
        {LISTS.map((item) => {
          const active = item.id === list;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onList(item.id)}
              className="flex items-stretch gap-4 border-b border-line py-3 text-left @3xl:py-5"
            >
              <span aria-hidden className={`my-2 w-(--accent-rule) shrink-0 ${active ? "bg-accent" : ""}`} />
              <span
                className={`heading text-5xl leading-none @3xl:text-7xl ${PRESS} ${active ? "text-ink" : "text-muted"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </Framed>
  );
}

// j. Oversized toggle. One huge heading shows the list on; a small button
// switches to the other. The button wraps under the heading on a phone.
function OversizedBar({ logoInline, list, onList }: ListProps) {
  const current = LISTS.find((item) => item.id === list) ?? LISTS[0]!;
  const other = list === "progress" ? "ideas" : "progress";
  return (
    <Framed logoInline={logoInline}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <h2 className="heading text-6xl leading-none @3xl:text-9xl">{current.label}</h2>
        <Button size="sm" variant="line" onClick={() => onList(other)}>
          Switch list
        </Button>
      </div>
    </Framed>
  );
}

// k. Tall type. Both names at their largest size, stacked on a phone and side by
// side from @3xl. The one on has a thick red bar under it; the other is muted.
function TallBar({ logoInline, list, onList }: ListProps) {
  return (
    <Framed logoInline={logoInline}>
      <div role="group" aria-label="Lists" className="flex flex-col gap-6 @3xl:flex-row @3xl:gap-10">
        {LISTS.map((item) => {
          const active = item.id === list;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onList(item.id)}
              className="flex min-w-0 flex-col text-left"
            >
              <span
                className={`heading text-6xl leading-none @3xl:text-7xl @5xl:text-8xl ${PRESS} ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                {item.label}
              </span>
              <span
                aria-hidden
                className={`mt-3 block h-(--accent-rule) w-full ${active ? "bg-accent" : ""}`}
              />
            </button>
          );
        })}
      </div>
    </Framed>
  );
}

// l. Heading counts. Each name is followed by a badge with its number of ideas.
// The badge on the list you are on is filled in the accent red.
function CountsBar({ logoInline, list, onList }: ListProps) {
  return (
    <Framed logoInline={logoInline}>
      <div
        role="group"
        aria-label="Lists"
        className="flex flex-col gap-4 @xl:flex-row @xl:flex-wrap @xl:items-center @xl:gap-x-10 @xl:gap-y-4"
      >
        {LISTS.map((item) => {
          const active = item.id === list;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onList(item.id)}
              className="flex items-center gap-3 text-left"
            >
              <span
                className={`heading text-5xl leading-none @xl:text-6xl @3xl:text-7xl ${PRESS} ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                {item.label}
              </span>
              <span
                className={`bordered px-2.5 py-1 text-lg leading-tight font-semibold tabular-nums ${PRESS} ${
                  active ? "border-accent bg-accent text-on-accent" : "border-line bg-bg text-ink"
                }`}
              >
                {COUNTS[item.id]}
              </span>
            </button>
          );
        })}
      </div>
    </Framed>
  );
}

// Components, not calls: SwitchBar uses a hook, so each one must render as an element.
const BARS: Record<TopBarStyle, ComponentType<ListProps>> = {
  underline: UnderlineBar,
  segmented: SegmentedBar,
  switch: SwitchBar,
  headings: HeadingsBar,
  filter: FilterBar,
  centered: CenteredBar,
  stack: PosterStackBar,
  split: SplitBar,
  ruled: RuledBar,
  oversized: OversizedBar,
  tall: TallBar,
  counts: CountsBar,
};

export function TopBarSection({
  style,
  logoInline,
  fullWidth,
}: {
  style: TopBarStyle;
  logoInline: boolean;
  fullWidth: boolean;
}) {
  // The mock state starts with Ideas chosen. The tabs and switch can be used to try the keyboard.
  const [list, setList] = useState<ListId>("ideas");
  const option = TOP_BAR_STYLES.find((o) => o.id === style) ?? TOP_BAR_STYLES[0]!;
  const Bar = BARS[style];

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted">Pick one option. Each one shows the top bar at full width.</p>
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold">{option.label}</h3>
        <div className={fullWidth ? "w-full" : "w-full max-w-prose"}>
          <Bar logoInline={logoInline} list={list} onList={setList} />
        </div>
        <p className="text-sm text-muted">{option.description}</p>
      </div>
    </div>
  );
}
