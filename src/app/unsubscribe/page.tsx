import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { UNSUBSCRIBE_COPY } from "@/app/_email/messages";
import { UnsubscribeForm } from "@/app/_email/UnsubscribeForm";
import { usesSampleIdeas } from "@/app/_ideas/source";
import { Button } from "@/components/Button";
import { PAGE } from "@/components/pageTransition";
import { verifyUnsubscribeToken } from "@/email/unsubscribeToken";
import { env } from "@/env";

export const metadata: Metadata = { title: "Weekly digest" };

type Props = { searchParams: Promise<{ t?: string | string[] }> };

// The page the digest's "Stop the weekly digest" link opens (#212). It needs no sign-in,
// and it only reads: it checks the link's signature to choose which state to show, and
// writes nothing, because mail scanners open links. The change happens on the confirm
// button (UnsubscribeForm). Never cached: it depends on the link. Outside the (tabs)
// layout, like /me/notifications.
export default function UnsubscribePage({ searchParams }: Props) {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 @lg:px-8 @lg:pt-8 @lg:pb-12">
      <Suspense fallback={null}>
        <UnsubscribeBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function UnsubscribeBody({ searchParams }: Props) {
  await connection();
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";
  const settings = env();
  // A run with no database (local and browser tests): any link shows the confirm state, so
  // the screen can be tried, and the action saves nothing.
  const sample = usesSampleIdeas(settings);
  const valid =
    token !== "" &&
    (sample ||
      (settings.EMAIL_LINK_SECRET !== undefined &&
        verifyUnsubscribeToken(settings.EMAIL_LINK_SECRET, token) !== null));

  return (
    <>
      <h1 className="heading text-6xl @3xl:text-8xl">{UNSUBSCRIBE_COPY.heading}</h1>
      {valid ? (
        <UnsubscribeForm token={token} sample={sample} />
      ) : (
        <div className="flex max-w-2xl flex-col items-start gap-6">
          <p>{UNSUBSCRIBE_COPY.invalid}</p>
          <Button variant="line" href="/me/notifications" transitionTypes={PAGE}>
            {UNSUBSCRIBE_COPY.openSettings}
          </Button>
        </div>
      )}
    </>
  );
}
