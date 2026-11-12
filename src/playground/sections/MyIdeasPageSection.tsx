"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { BoardChip } from "@/components/BoardChip";
import Link from "next/link";
import { IdeaCard } from "@/components/IdeaCard";
import { PendingPoster, type PosterFill } from "@/components/PendingPoster";
import { BOARDS, type BoardCode } from "@/core/boards";
import { STATUS_LABELS, type IdeaStatus } from "@/core/statuses";
import { SupportPair } from "@/components/SupportPair";

// The My ideas page, whole, with its list and switch chosen in the playground's
// sidebar (#193). The header and page tabs are drawn as NavTabs draws them. Sample
// rows are invented.

export const LIST_STYLES = ["rows", "grid", "compact", "solid", "ledger", "stages"] as const;
export type ListStyle = (typeof LIST_STYLES)[number];
export const SWITCH_STYLES = ["underline", "chips", "segmented"] as const;
export type SwitchStyle = (typeof SWITCH_STYLES)[number];
export type WordStyle = "plain" | "short";
export type Columns = "1" | "2" | "3";
export type GridPending = "muted" | "outline" | "hatched";
export type LabelStyle = "board" | "neutral" | "solid" | "status";

export type MyIdeasOptions = {
  list: ListStyle;
  switchStyle: SwitchStyle;
  columns: Columns;
  pendingCount: number;
  words: WordStyle;
  statusLabel: LabelStyle;
  gridPending: GridPending;
  gridFill: PosterFill;
};

type Row = {
  number: number;
  title: string;
  description: string;
  board: BoardCode;
  // "pending" and "declined" are posts that are not public yet.
  state: IdeaStatus | "pending" | "declined";
  supportCount: number;
  willingCount: number;
  updatedDaysAgo: number;
  declineReason?: string;
};

const ROWS: Row[] = [
  {
    number: 201,
    title: "Longer hours at the Marino dining hall on Sundays",
    description: "The Sunday hours end at 2 p.m. Students who study on weekends want dinner until 8.",
    board: "DAB",
    state: "pending",
    supportCount: 0,
    willingCount: 0,
    updatedDaysAgo: 0,
  },
  {
    number: 202,
    title: "Bike repair stand by the garage",
    description: "A stand with a pump and basic tools, so a flat tire does not end the ride.",
    board: "GIB",
    state: "declined",
    supportCount: 0,
    willingCount: 0,
    updatedDaysAgo: 0,
    declineReason: "This is already in progress with Campus Services. Support the existing idea instead.",
  },
  {
    number: 203,
    title: "Reusable to-go containers at every dining hall",
    description: "Return them at any hall instead of taking a new plastic box each time.",
    board: "GIB",
    state: "collecting_support",
    supportCount: 143,
    willingCount: 17,
    updatedDaysAgo: 2,
  },
  {
    number: 204,
    title: "A late shuttle on Friday nights",
    description: "Run the campus shuttle until 2 a.m. on Fridays, so students get home safely.",
    board: "CSC",
    state: "in_progress",
    supportCount: 305,
    willingCount: 27,
    updatedDaysAgo: 5,
  },
  {
    number: 205,
    title: "Compost bins outside residence halls",
    description: "Food scraps go in the trash today. Bins by each hall, emptied weekly, would change that.",
    board: "SC",
    state: "under_review",
    supportCount: 120,
    willingCount: 10,
    updatedDaysAgo: 9,
  },
  {
    number: 206,
    title: "Quiet study rooms on the top floor of the library",
    description: "Two rooms with no laptops-open rule, bookable for an hour at a time.",
    board: "CSC",
    state: "pending",
    supportCount: 0,
    willingCount: 0,
    updatedDaysAgo: 0,
  },
  {
    number: 207,
    title: "Recycling bins in every elevator lobby",
    description: "Right now recycling is a walk to the stairwell, so most of it ends up in the trash.",
    board: "GIB",
    state: "pending",
    supportCount: 0,
    willingCount: 0,
    updatedDaysAgo: 0,
  },
  {
    number: 208,
    title: "Free tampons in every restroom",
    description: "Stocked in the men's and women's restrooms in every academic building.",
    board: "SC",
    state: "delivered",
    supportCount: 512,
    willingCount: 60,
    updatedDaysAgo: 30,
  },
];

const isPublic = (r: Row): r is Row & { state: IdeaStatus } =>
  r.state !== "pending" && r.state !== "declined";

const PLAIN: Record<Row["state"], string> = {
  pending: "Waiting for review",
  declined: "Not approved",
  ...STATUS_LABELS,
};

const SHORT: Record<Row["state"], string> = {
  pending: "Review",
  declined: "Declined",
  collecting_support: "Gathering",
  under_review: "Reviewing",
  in_progress: "Underway",
  delivered: "Done",
  waiting: "Waiting",
};

const wordsFor = (state: Row["state"], style: WordStyle) => (style === "plain" ? PLAIN : SHORT)[state];

// Pending posts shown are capped by the sidebar; declined and public ideas always show.
function visibleRows(pendingCount: number): Row[] {
  let pendingShown = 0;
  return ROWS.filter((r) => {
    if (r.state !== "pending") return true;
    if (pendingShown >= pendingCount) return false;
    pendingShown += 1;
    return true;
  });
}

function PageTabs() {
  return (
    <nav aria-label="Pages" className="flex gap-0.5 border-b border-line">
      <span className="px-3 pb-2 text-muted">Ideas</span>
      <span aria-current="page" className="border-b-4 border-accent-text px-3 pb-2 font-bold">
        My ideas
      </span>
    </nav>
  );
}

// The switch, in three looks. Each is a link on the real page, so the look is all that changes.
const TABS = ["Written", "Supported", "Participated"] as const;

function SwitchLook({ style }: { style: SwitchStyle }) {
  if (style === "underline") {
    return (
      <nav aria-label="My ideas" className="flex gap-6 border-b border-line">
        {TABS.map((t, i) => (
          <span
            key={t}
            aria-current={i === 0 ? "page" : undefined}
            className={i === 0 ? "border-b-4 border-accent-text pb-2 font-bold" : "pb-2 text-muted"}
          >
            {t}
          </span>
        ))}
      </nav>
    );
  }
  if (style === "chips") {
    return (
      <nav aria-label="My ideas" className="flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <span
            key={t}
            aria-current={i === 0 ? "true" : undefined}
            className="poster-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold"
          >
            {t}
          </span>
        ))}
      </nav>
    );
  }
  return (
    <nav aria-label="My ideas" className="inline-flex self-start bordered">
      {TABS.map((t, i) => (
        <span
          key={t}
          aria-current={i === 0 ? "true" : undefined}
          className={`px-4 py-2 text-sm font-bold ${i > 0 ? "border-l-2 border-line" : ""} ${
            i === 0 ? "bg-ink text-surface" : "bg-surface text-ink"
          }`}
        >
          {t}
        </span>
      ))}
    </nav>
  );
}

function Frame({
  label,
  switchStyle,
  children,
}: {
  label: string;
  switchStyle: SwitchStyle;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 border-2 border-line p-card">
      <p className="text-sm text-muted">{label}</p>
      <header className="flex flex-col gap-3">
        <Image
          src="/brand/husky-prop-long.svg"
          alt="Husky Proposals"
          width={300}
          height={48}
          unoptimized
          className="h-12 w-auto self-start"
        />
        <PageTabs />
      </header>
      <h1 className="heading text-6xl">My ideas</h1>
      <SwitchLook style={switchStyle} />
      {children}
    </section>
  );
}

function ApprovedWithPending({ r }: { r: Row }) {
  return (
    <PendingPoster
      number={r.number}
      title={r.title}
      board={r.board}
      review={r.state === "declined" ? "declined" : "pending"}
      declineReason={r.declineReason}
    />
  );
}

// Rows, as the page has them now.
function RowsList({ rows, words }: { rows: Row[]; words: WordStyle }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {rows.map((r) =>
        isPublic(r) ? (
          <li key={r.number} className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <BoardChip board={r.board} />
              <span className="text-sm">#{r.number}</span>
            </div>
            <p className="heading text-3xl underline underline-offset-4">{r.title}</p>
            <p className="text-sm text-muted">{wordsFor(r.state, words)}</p>
          </li>
        ) : (
          <li key={r.number} className="py-4">
            <ApprovedWithPending r={r} />
          </li>
        ),
      )}
    </ul>
  );
}

const COLUMN_CLASS: Record<Columns, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-2",
  "3": "grid-cols-3",
};

// The real idea cards, in a grid. Their status words come from the card itself.
function PosterGrid({
  rows,
  columns,
  gridPending,
  gridFill,
}: {
  rows: Row[];
  columns: Columns;
  gridPending: GridPending;
  gridFill: PosterFill;
}) {
  return (
    <ul className={`grid auto-rows-fr gap-4 ${COLUMN_CLASS[columns]}`}>
      {rows.map((r) => (
        <li key={r.number} className="grid min-w-0">
          {isPublic(r) ? (
            <IdeaCard
              number={r.number}
              title={r.title}
              description={r.description}
              board={r.board}
              status={r.state}
              updatedDaysAgo={r.updatedDaysAgo}
              supportCount={r.supportCount}
              willingCount={r.willingCount}
            />
          ) : gridPending === "muted" ? (
            <PendingIdeaCard r={r} />
          ) : (
            <PendingPoster
              number={r.number}
              title={r.title}
              board={r.board}
              review={r.state === "declined" ? "declined" : "pending"}
              declineReason={r.declineReason}
              muted={false}
              hatched={gridPending === "hatched"}
              fill={gridFill}
              description={r.description}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

// Compact cards: each idea is a full-width row, with its board color as a stripe,
// and a rule between rows. The shape of a card, at the height of a row.
function CompactList({ rows, words }: { rows: Row[]; words: WordStyle }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const pub = isPublic(r);
        return (
          <li
            key={r.number}
            data-board={BOARDS[r.board].color}
            className={pub ? "flex items-stretch bordered" : "poster-outline flex items-stretch"}
          >
            {pub && <span aria-hidden className="w-3 shrink-0" style={{ background: "var(--b)" }} />}
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-bold">
                  {BOARDS[r.board].category} #{r.number}
                </span>
                <span className="heading text-2xl">{r.title}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>{wordsFor(r.state, words)}</span>
                {pub && <span className="font-bold tabular-nums">{r.supportCount}</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// The pending card, rebuilt from the normal idea card (#193): the same layout, on the
// muted tint of its board's color, with the word PENDING or DECLINED where the support
// number sits. Buttons stay normal, and nothing about support is shown.
function PendingIdeaCard({ r }: { r: Row }) {
  const b = BOARDS[r.board];
  const word = r.state === "declined" ? "DECLINED" : "PENDING";
  return (
    <div className="flex flex-1 flex-col pt-7">
      <article
        data-board={b.color}
        className="card-stack flex flex-1 flex-col"
        style={{
          background: "color-mix(in srgb, var(--b) 22%, var(--grey))",
          color: "var(--grey-ink)",
          padding: "var(--card-pad-y) var(--card-pad)",
        }}
      >
        <div className="flex items-center justify-between gap-3 text-xs font-bold whitespace-nowrap">
          <span className="truncate">{b.category}</span>
          <span className="truncate">{r.state === "declined" ? "Not approved" : "Waiting for review"}</span>
        </div>
        <h3 className="poster-title poster-title-lines heading text-balance">{r.title}</h3>
        <p className="poster-desc text-sm">{r.description}</p>
        {r.state === "declined" && r.declineReason && (
          <p className="poster-desc text-sm">{r.declineReason}</p>
        )}
        <div className="card-stack mt-auto flex flex-col pt-1">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="heading text-4xl">{word}</p>
            {r.state === "declined" && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/me"
                  className="inline-flex border-2 px-3 py-1.5 text-sm font-bold"
                  style={{ color: "var(--grey-ink)", borderColor: "var(--grey-ink)" }}
                >
                  Edit
                </Link>
                <Link
                  href="/me"
                  className="inline-flex border-2 px-3 py-1.5 text-sm font-bold"
                  style={{ color: "var(--grey-ink)", borderColor: "var(--grey-ink)" }}
                >
                  Withdraw
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="relative z-10">
              <SupportPair
                ideaNumber={r.number}
                board={r.board}
                supported={false}
                participating={false}
                onSupportChange={() => {}}
                onParticipateChange={() => {}}
              />
            </div>
            <span className="relative z-10 text-sm font-bold whitespace-nowrap underline underline-offset-4">
              Learn more
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}

// The status label on the solid and outline rows. Both are surface boxes with a
// border, so no white text sits on a color.
// Status colors come from the palette pairs in tokens.css, not from the board.
const STATUS_LABEL: Record<Row["state"], CSSProperties> = {
  pending: { background: "var(--surface)", color: "var(--ink)", border: "var(--border) solid var(--ink)" },
  declined: {
    background: "var(--surface)",
    color: "var(--accent-text)",
    border: "var(--border) solid var(--accent-text)",
  },
  collecting_support: { background: "var(--green)", color: "var(--green-ink)" },
  under_review: { background: "var(--sky)", color: "var(--sky-ink)" },
  in_progress: { background: "var(--amber)", color: "var(--amber-ink)" },
  delivered: { background: "var(--grey)", color: "var(--grey-ink)" },
  waiting: { background: "var(--grey)", color: "var(--grey-ink)" },
};

// The status label, by the sidebar's choice. Board outline is transparent on pending
// and declined posts; solid block puts the board's text color on a white or black block.
function labelStyle(kind: LabelStyle, r: Row): CSSProperties {
  const pub = isPublic(r);
  if (kind === "neutral") return NEUTRAL_LABEL;
  if (kind === "status") return STATUS_LABEL[r.state];
  if (kind === "solid" && pub) return { background: "var(--on-b)", color: "var(--b)" };
  return {
    background: pub ? "var(--surface)" : "transparent",
    color: "var(--b-text)",
    border: "var(--border) solid var(--b-text)",
  };
}
const NEUTRAL_LABEL = {
  background: "var(--surface)",
  color: "var(--ink)",
  border: "var(--border) solid var(--ink)",
};

// Pending and declined posts: a grey-muted tint of their board's color, so they read as
// not live yet, like the cards on the Ideas page but quieter.
const MUTED_ROW: CSSProperties = {
  background: "color-mix(in srgb, var(--b) 22%, var(--grey))",
  color: "var(--grey-ink)",
};

// Solid and outline rows: approved ideas are filled in their board color, and
// pending and declined posts are the outline, so the two never look alike.
function SolidList({ rows, words, statusLabel }: { rows: Row[]; words: WordStyle; statusLabel: LabelStyle }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const pub = isPublic(r);
        return (
          <li
            key={r.number}
            data-board={BOARDS[r.board].color}
            style={pub ? { background: "var(--b)", color: "var(--on-b)" } : MUTED_ROW}
            className={
              pub
                ? "flex items-center justify-between gap-x-6 gap-y-2 px-4 py-3"
                : "flex items-center justify-between gap-x-6 gap-y-2 px-4 py-3"
            }
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-bold">
                {BOARDS[r.board].category} #{r.number}
              </span>
              <span className="heading text-2xl">{r.title}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="px-2 py-0.5 font-bold" style={labelStyle(statusLabel, r)}>
                {wordsFor(r.state, words)}
              </span>
              {pub && <span className="font-bold tabular-nums">{r.supportCount}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// A ledger: one row per idea, the facts in columns.
function Ledger({ rows, words }: { rows: Row[]; words: WordStyle }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className="py-2 pr-4 font-bold">
              Idea
            </th>
            <th scope="col" className="py-2 pr-4 font-bold">
              Board
            </th>
            <th scope="col" className="py-2 pr-4 font-bold">
              Status
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-bold">
              Supporters
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.number} className="border-b border-line align-top">
              <td className="py-3 pr-4">
                <span className="block font-bold">{r.title}</span>
                <span className="text-muted">#{r.number}</span>
              </td>
              <td className="py-3 pr-4">{r.board}</td>
              <td className={`py-3 pr-4 ${isPublic(r) ? "" : "italic"}`}>{wordsFor(r.state, words)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{isPublic(r) ? r.supportCount : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Columns by where the idea is.
const COLUMNS: { title: string; states: Row["state"][] }[] = [
  { title: "Waiting", states: ["pending", "declined"] },
  { title: "Collecting support", states: ["collecting_support", "under_review"] },
  { title: "In progress", states: ["in_progress"] },
  { title: "Delivered", states: ["delivered"] },
];

function Stages({ rows, words }: { rows: Row[]; words: WordStyle }) {
  return (
    <div className="grid gap-6 @lg:grid-cols-2">
      {COLUMNS.map((c) => {
        const inColumn = rows.filter((r) => c.states.includes(r.state));
        return (
          <div key={c.title} className="flex flex-col gap-3">
            <h2 className="border-b-2 border-ink pb-2 heading text-2xl">
              {c.title} <span className="text-muted">{inColumn.length}</span>
            </h2>
            {inColumn.length === 0 && <p className="text-sm text-muted">Nothing here yet.</p>}
            {inColumn.map((r) =>
              isPublic(r) ? (
                <div key={r.number} className="flex flex-col gap-1 border-b border-line pb-3">
                  <BoardChip board={r.board} />
                  <p className="font-bold">{r.title}</p>
                  <p className="text-sm text-muted">
                    #{r.number} · {wordsFor(r.state, words)}
                  </p>
                </div>
              ) : (
                <ApprovedWithPending key={r.number} r={r} />
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MyIdeasPageSection(options: MyIdeasOptions) {
  const rows = visibleRows(options.pendingCount);
  const label = {
    rows: "Rows (the page now)",
    grid: "Poster grid, the real idea cards",
    compact: "Compact cards",
    solid: "Solid and outline rows",
    ledger: "Ledger",
    stages: "Stages",
  }[options.list];
  return (
    <Frame label={label} switchStyle={options.switchStyle}>
      {options.list === "rows" && <RowsList rows={rows} words={options.words} />}
      {options.list === "grid" && (
        <PosterGrid
          rows={rows}
          columns={options.columns}
          gridPending={options.gridPending}
          gridFill={options.gridFill}
        />
      )}
      {options.list === "compact" && <CompactList rows={rows} words={options.words} />}
      {options.list === "solid" && (
        <SolidList rows={rows} words={options.words} statusLabel={options.statusLabel} />
      )}
      {options.list === "ledger" && <Ledger rows={rows} words={options.words} />}
      {options.list === "stages" && <Stages rows={rows} words={options.words} />}
    </Frame>
  );
}

// The final rendition: the poster grid, with the choices settled so far. Real idea
// cards for approved ideas; pending and declined posts in the muted tint with no
// counts and no big word; one column on a phone, two or three wider; every card the
// same height. Declined posts get "Edit and resubmit" (#128; a placeholder here).
export function MyIdeasFinalSection() {
  return (
    <section className="@container flex flex-col gap-6 border-2 border-line p-card">
      <p className="text-sm text-muted">Final: the poster grid, as settled</p>
      <header className="flex flex-col gap-3">
        <Image
          src="/brand/husky-prop-long.svg"
          alt="Husky Proposals"
          width={300}
          height={48}
          unoptimized
          className="h-12 w-auto self-start"
        />
        <PageTabs />
      </header>
      <h1 className="heading text-6xl">My ideas</h1>
      <SwitchLook style="chips" />
      <ul className="grid auto-rows-fr grid-cols-1 gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
        {visibleRows(ROWS.length).map((r) => (
          <li key={r.number} className="grid min-w-0">
            {isPublic(r) ? (
              <IdeaCard
                number={r.number}
                title={r.title}
                description={r.description}
                board={r.board}
                status={r.state}
                updatedDaysAgo={r.updatedDaysAgo}
                supportCount={r.supportCount}
                willingCount={r.willingCount}
              />
            ) : (
              <PendingIdeaCard r={r} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
