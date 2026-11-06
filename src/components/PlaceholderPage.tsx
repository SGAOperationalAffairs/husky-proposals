import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireLeader } from "@/auth/gate";
import { getSession } from "@/auth/session";
import { NavTabs } from "@/components/NavTabs";
import { SiteHeader } from "@/components/SiteHeader";
import type { NavTab } from "@/core/navigation";

// A page whose tab exists before its screen is built (#156). The page checks the
// viewer's access itself, so the tab being hidden is never the only guard: a leader
// page returns not-found to students and visitors. The title sits inside the
// check, so nothing of the page shows before it passes.
export function PlaceholderPage({
  title,
  current,
  access,
}: {
  title: string;
  current: NavTab["id"];
  access: "student" | "leader";
}) {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 @lg:px-8 @lg:pt-8 @lg:pb-12">
      <SiteHeader nav={<NavTabs current={current} />} />
      <Suspense fallback={null}>
        <Gate title={title} access={access} />
      </Suspense>
    </main>
  );
}

async function Gate({ title, access }: { title: string; access: "student" | "leader" }) {
  await connection();
  if (access === "leader") await requireLeader();
  else if (!(await getSession())) notFound();
  return (
    <>
      <h1 className="heading text-6xl @3xl:text-8xl">{title}</h1>
      <p className="text-muted">Coming soon.</p>
    </>
  );
}
