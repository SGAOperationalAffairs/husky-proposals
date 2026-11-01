import { BOARDS, type BoardCode } from "@/core/boards";
import { QrCode } from "./QrCode";

// A printable flyer for an idea (#64), for tabling and bulletin boards: the
// idea as a poster band, a big QR code to its page, and what support means.
// Sized by its container, so the same component is the share dialog's small
// preview and the full printed page (/ideas/[number]/flyer). Always dark on
// light (--paper), so it prints the same in either mode.
export type FlyerData = {
  number: number;
  title: string;
  description: string;
  board: BoardCode;
};

export function Flyer({ number, title, description, board }: FlyerData) {
  const b = BOARDS[board];
  return (
    <article className="@container flex flex-1 flex-col bg-paper text-paper-ink">
      <div className="flex flex-1 flex-col">
        <div data-board={b.color} className="poster print-exact flex flex-col gap-2 @xl:gap-5">
          <p className="flex justify-between gap-3 text-xs font-bold @xl:text-lg">
            <span>{b.name}</span>
            <span>#{number}</span>
          </p>
          <h2 className="heading text-3xl text-balance @xl:text-7xl">{title}</h2>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-4 py-4 @xl:gap-8 @xl:py-10">
          <p className="text-sm @xl:text-2xl">{description}</p>
          <div className="flex items-center gap-4 @xl:gap-8">
            <QrCode path={`/ideas/${number}`} className="size-28 shrink-0 @xl:size-64" />
            <div className="flex flex-col gap-1 @xl:gap-3">
              <p className="heading text-2xl @xl:text-6xl">Scan to support this idea</p>
              <p className="text-xs @xl:text-xl">
                Read it, support it, or offer to help. Support helps SGA decide; it is not a vote.
              </p>
            </div>
          </div>
        </div>
        <p className="border-t-2 border-paper-ink pt-2 text-xs font-semibold @xl:pt-4 @xl:text-base">
          Husky Proposals, from Northeastern&rsquo;s Student Government Association
        </p>
      </div>
    </article>
  );
}
