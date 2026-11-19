import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/Button";
import { PAGE } from "@/components/pageTransition";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Reveal } from "@/components/Reveal";
import { LocalSupportPair } from "@/app/_ideas/LocalSupportPair";
import { LeaderIdeaSection } from "@/app/_review/LeaderIdeaSection";
import { getIdea, parseIdeasNumber, type IdeaPageData } from "@/app/_ideas/data";
import { CopyLink } from "@/components/CopyLink";
import { IdeaPlaceholder } from "@/components/Placeholder";
import { ShareDialog } from "@/components/ShareDialog";
import { daysAgoText, updatedText } from "@/components/IdeaCard";
import { NavTabs } from "@/components/NavTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { FromSgaTag } from "@/components/Tag";
import { SupportSquares } from "@/components/SupportSquares";
import { UpdateList } from "@/components/UpdateList";
import { BOARDS, JOIN } from "@/core/boards";
import { takesSupport } from "@/core/statuses";

// One idea's page (#62): the poster from the playground (#29) beside where the
// idea stands, then the details and how to join the board (prototype sPage).
// Anyone with the link can see it; no sign-in.
export default function IdeaPage({ params }: PageProps<"/ideas/[number]">) {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 @lg:px-8 @lg:py-12">
      <SiteHeader nav={<NavTabs />} />
      <Button
        variant="text"
        href="/"
        transitionTypes={PAGE}
        className="self-start"
        icon={<ChevronLeft aria-hidden className="size-4" />}
      >
        Back to ideas
      </Button>
      {/* The number comes from the URL, which is request data, so it waits in a boundary. */}
      <Suspense
        fallback={
          <Reveal.Out>
            <IdeaPlaceholder />
          </Reveal.Out>
        }
      >
        <Reveal>
          <Idea params={params} />
        </Reveal>
      </Suspense>
    </main>
  );
}

async function Idea({ params }: { params: PageProps<"/ideas/[number]">["params"] }) {
  const number = parseIdeasNumber((await params).number);
  const idea = number === undefined ? undefined : await getIdea(number);
  if (!idea) notFound();
  const board = BOARDS[idea.board];

  return (
    // The page's accent takes the idea's board color (#64); `contents` keeps the layout.
    <div data-board={board.color} className="board-accent contents">
      {/* One order for every reader: poster, where it stands, about, join. On wide
          screens the right column runs beside the other three (idea-rows). */}
      <div className="grid items-start gap-6 @3xl:grid-cols-5 @3xl:idea-rows">
        <article data-board={board.color} className="poster relative flex flex-col gap-4 @3xl:col-span-3">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold">
            <span>{board.name}</span>
            <span>#{idea.number}</span>
            {idea.fromSga && <FromSgaTag look="poster" />}
          </p>
          <h1 className="heading text-5xl text-balance @3xl:text-7xl">{idea.title}</h1>
          <p className="max-w-prose">{idea.description}</p>
          <p className="text-sm font-semibold">
            Posted by {idea.author ?? "a student"}, {daysAgoText(idea.proposedDaysAgo)}
          </p>
          <p className="flex items-end gap-3">
            <span className="heading text-8xl tabular-nums">{idea.supportCount}</span>
            <span className="pb-2 leading-tight font-semibold">
              {takesSupport(idea.status) ? "students want this" : "students supported this"}
              <br />
              {idea.willingCount} will help
            </span>
          </p>
          {takesSupport(idea.status) && (
            <>
              <LocalSupportPair ideaNumber={idea.number} board={idea.board} />
              <p className="text-sm">
                &ldquo;I&rsquo;ll participate&rdquo; tells SGA you would help work on this if it moves
                forward.
              </p>
            </>
          )}
          {/* A plain note, not disabled buttons (#237). Counts above stay as history. */}
          {idea.status === "closed" && (
            <p className="text-sm font-semibold">
              This idea is closed, so it is not taking support or offers to help.
            </p>
          )}
        </article>

        <aside aria-label="Where it stands" className="flex flex-col gap-6 @3xl:col-span-2 @3xl:row-span-3">
          {/* Leader extras (#59): nothing for anyone else, and outside the cached read above. */}
          <Suspense fallback={null}>
            <LeaderIdeaSection params={params} />
          </Suspense>
          <section className="flex flex-col gap-3 bg-surface p-card surface-float">
            <h2 className="heading text-3xl">Where it stands</h2>
            <p>{standing(idea)}</p>
            <p className="text-sm text-muted">{capitalize(updatedText(idea.updatedDaysAgo))}.</p>
            {(idea.status === "in_progress" || idea.status === "delivered") && <Steps idea={idea} />}
          </section>
          <section
            aria-labelledby="updates-heading"
            className="flex flex-col gap-3 bg-surface p-card surface-float"
          >
            <h2 id="updates-heading" className="heading text-3xl">
              Updates
            </h2>
            {idea.updates.length === 0 ? (
              <p className="text-sm text-muted">No updates yet.</p>
            ) : (
              // Two check-ins can share their words and their day, so the index is part of the key.
              <UpdateList
                updates={idea.updates.map((u, i) => ({
                  key: `${i}-${u.text}`,
                  daysAgo: u.daysAgo,
                  text: u.text,
                  kind: u.kind,
                }))}
              />
            )}
          </section>
          <section className="flex flex-col gap-3 bg-surface p-card surface-float">
            <h2 className="heading text-3xl">{idea.supportCount} supporters</h2>
            <SupportSquares count={idea.supportCount} board={idea.board} rank={idea.rank} />
          </section>
          <section className="flex flex-col gap-3 bg-surface p-card surface-float">
            <h2 className="heading text-3xl">Share this idea</h2>
            <p className="text-sm text-muted">Anyone with the link can see this idea without signing in.</p>
            <div className="flex flex-wrap items-start gap-3">
              <CopyLink board={idea.board} />
              <ShareDialog
                number={idea.number}
                title={idea.title}
                description={idea.description}
                board={idea.board}
              />
            </div>
            <p className="text-sm text-muted">Share also makes a poster image and a flyer with a QR code.</p>
          </section>
        </aside>

        <section className="flex flex-col gap-4 bg-surface p-card surface-float @3xl:col-span-3">
          <h2 className="heading text-3xl">About this idea</h2>
          {idea.about.map((p) => (
            <p key={p} className="max-w-prose">
              {p}
            </p>
          ))}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-sm">
            <Fact term="Scale" value={idea.scale} />
            <Fact term="Rough cost" value={idea.cost} />
            <Fact term="Timing" value={idea.timing} />
            <Fact term="Where" value={idea.location} />
            <Fact term="Handled by" value={board.name} />
          </dl>
        </section>
        <Join idea={idea} />
      </div>
    </div>
  );
}

// Where the idea stands, in plain words. Never a promise (CLAUDE.md, "Honest status").
function standing(idea: IdeaPageData) {
  const board = BOARDS[idea.board].name;
  switch (idea.status) {
    case "collecting_support":
      return `This idea is collecting support. The ${board} looks at its ideas regularly and usually works on 1 to 2 at a time.`;
    case "in_progress":
      return `The ${board} is working on this now.`;
    case "delivered":
      return `The ${board} delivered this idea.`;
    case "waiting":
      return `On hold. ${idea.waitingReason ?? "The board will come back to it"}. It stays on the list and keeps its support.`;
    case "closed":
      return `Closed. ${idea.closedReason ?? "The board closed this idea"}. The ${board} is not moving it forward right now. Its support stays on record.`;
  }
}

// The steps once a board takes an idea on. A real sequence, so a numbered list.
function Steps({ idea }: { idea: IdeaPageData }) {
  const reached = idea.status === "delivered" ? 3 : 2;
  const steps = ["Collected support", "In progress", "Delivered"];
  return (
    <ol aria-label="Progress" className="grid grid-cols-3 gap-1 text-xs font-semibold">
      {steps.map((step, i) => {
        const done = i < reached;
        return (
          <li key={step} className="flex flex-col gap-1.5">
            <span aria-hidden className={`h-1.5 ${done ? "bg-ink" : "bg-grey"}`} />
            <span className={done ? "" : "text-muted"}>
              {step}
              <span className="sr-only">{done ? ", done" : ", not yet"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Join({ idea }: { idea: IdeaPageData }) {
  const board = BOARDS[idea.board];
  const join = JOIN[idea.board];
  const working = idea.status === "in_progress";
  return (
    <section className="flex flex-col gap-4 bg-surface p-card surface-float @3xl:col-span-3">
      <h2 className="heading text-3xl">{working ? "Join the board working on this" : "Want to help?"}</h2>
      <p className="max-w-prose">
        {working
          ? `The ${board.name} is working on this now. ${join.does}`
          : `If this idea moves forward, the ${board.name} would take it on. ${join.does} You can join whether or not this idea moves forward.`}
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-sm">
        <Fact term="Meets" value={join.meets} />
        <Fact term="Time" value={join.time} />
        <Fact term="Open seats" value={join.seats} />
        <Fact term="How to apply" value={join.apply} />
      </dl>
    </section>
  );
}

function Fact({ term, value }: { term: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted">{term}</dt>
      <dd className="font-semibold">{value ?? "Not sure"}</dd>
    </div>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
