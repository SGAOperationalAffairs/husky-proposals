import { ChevronLeft } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmailSettingsView } from "@/app/_email/EmailSettingsView";
import { usesSampleIdeas } from "@/app/_ideas/source";
import { requireSignedIn } from "@/auth/gate";
import { Button } from "@/components/Button";
import { PAGE } from "@/components/pageTransition";
import { SETTABLE_EMAIL_TYPES } from "@/core/emailSettings";
import { prismaEmailSettingsStore, type EmailSettings } from "@/db/emailSettingsStore";
import { db } from "@/db/runtime";
import { env } from "@/env";

const ALL_ON: EmailSettings = {
  settings: Object.fromEntries(SETTABLE_EMAIL_TYPES.map((type) => [type, true])) as EmailSettings["settings"],
  stopped: false,
};

// The notification settings (#211): which emails a signed-in student gets. Every own-post
// and follower email links here. Never cached: it depends on who is signed in. The shell
// streams with a 200 before the sign-in redirect can run, so only the layout and the way
// back sit outside the boundary, and the heading renders after the check (#158). It sits
// outside the (tabs) layout, like the edit page.
export default function NotificationSettingsPage() {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 @lg:px-8 @lg:pt-8 @lg:pb-12">
      <Button
        variant="text"
        href="/me"
        transitionTypes={PAGE}
        className="self-start"
        icon={<ChevronLeft aria-hidden className="size-4" />}
      >
        Back to my ideas
      </Button>
      <Suspense fallback={null}>
        <NotificationSettings />
      </Suspense>
    </main>
  );
}

async function NotificationSettings() {
  await connection();
  const session = await requireSignedIn("/me/notifications");
  const sample = usesSampleIdeas(env());
  // Local runs and browser tests have no database: every row on and locked, and db() is
  // never touched.
  const { settings, stopped } = sample ? ALL_ON : await prismaEmailSettingsStore(db()).read(session.user.id);
  return (
    <>
      <h1 className="heading text-6xl @3xl:text-8xl">Notification settings</h1>
      <EmailSettingsView settings={settings} stopped={stopped} sample={sample} />
    </>
  );
}
