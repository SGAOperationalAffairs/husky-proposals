import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PAGE } from "@/components/pageTransition";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getIdea, parseIdeasNumber } from "@/app/_ideas/data";
import { PrintButton } from "@/app/_share/PrintButton";
import { Flyer } from "@/components/Flyer";

// A printable flyer for one idea (#64), opened from the share dialog. On
// screen it sits on a sheet of paper with a print button; printed, it is the
// flyer alone on letter paper (globals.css, @media print).
export default function FlyerPage({ params }: PageProps<"/ideas/[number]/flyer">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 print:max-w-none print:p-0">
      <Suspense fallback={null}>
        <FlyerFor params={params} />
      </Suspense>
    </main>
  );
}

async function FlyerFor({ params }: { params: PageProps<"/ideas/[number]/flyer">["params"] }) {
  const number = parseIdeasNumber((await params).number);
  const idea = number === undefined ? undefined : getIdea(number);
  if (!idea) notFound();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          transitionTypes={PAGE}
          href={`/ideas/${idea.number}`}
          className="inline-flex items-center gap-2 font-semibold underline underline-offset-4"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to the idea
        </Link>
        <PrintButton />
      </div>
      <p className="text-sm text-muted print:hidden">To get a PDF, choose Save as PDF in the print dialog.</p>
      <div className="flyer-sheet flex min-h-240 flex-col bordered bg-paper p-10 print:border-0 print:p-0">
        <Flyer number={idea.number} title={idea.title} description={idea.description} board={idea.board} />
      </div>
    </>
  );
}
