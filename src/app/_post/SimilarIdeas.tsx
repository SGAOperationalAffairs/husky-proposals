"use client";

import { useDeferredValue } from "react";
import { similarIdeas } from "@/core/postIdea";
import { STATUS_LABELS } from "@/core/statuses";
import type { SimilarIdeaData } from "./present";

// "Similar ideas already posted" under the Title field (#55). The match is the plain word
// match in src/core/postIdea.ts, run in the browser on the public wall's titles, so typing
// never sends a request. The deferred title keeps each keystroke cheap.
type Props = {
  title: string;
  category: string;
  ideas: SimilarIdeaData[];
};

export function SimilarIdeas({ title, category, ideas }: Props) {
  const deferredTitle = useDeferredValue(title);
  // Every card on the public wall is approved.
  const matches = similarIdeas(
    { title: deferredTitle, category },
    ideas.map((idea) => ({ ...idea, reviewStatus: "approved" })),
  );
  const count = `${matches.length} similar ${matches.length === 1 ? "idea" : "ideas"} already posted.`;

  return (
    <>
      {/* Always in the page, so a screen reader hears the count change. The block below is
          not live: it would read the whole list on every keystroke. */}
      <p aria-live="polite" className="sr-only">
        {matches.length > 0 ? count : ""}
      </p>
      {matches.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 bordered p-card">
          <p className="font-semibold">Similar ideas already posted</p>
          <ul className="flex flex-col gap-1">
            {matches.map((idea) => (
              <li key={idea.number}>
                {/* A new tab keeps the half-written form. */}
                <a
                  href={`/ideas/${idea.number}`}
                  target="_blank"
                  rel="noopener"
                  className="text-accent-text underline"
                >
                  #{idea.number} {idea.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>{" "}
                <span className="text-sm text-muted">{STATUS_LABELS[idea.status]}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted">
            You can still post yours. If one of these is the same idea, you can support it instead. Links open
            in a new tab.
          </p>
        </div>
      )}
    </>
  );
}
