import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSession } from "@/auth/session";
import { NavTabs } from "@/components/NavTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { isSgaLeader } from "@/core/positions";
import type { NavTab } from "@/core/navigation";

// A page whose tab exists before its screen is built (#156). The page checks the
// viewer's access itself, so the tab being hidden is never the only guard: a leader
// page returns not-found to students and visitors.
export function PlaceholderPage({
  title,
  current,
  access,
  issue,
}: {
  title: string;
  current: NavTab["id"];
  access: "student" | "leader";
  issue: number;
}) {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 @lg:px-8 @lg:pt-8 @lg:pb-12">
      <SiteHeader
        nav={
          <Suspense fallback={null}>
            <NavTabs current={current} />
          </Suspense>
        }
      />
      <h1 className="heading text-6xl @3xl:text-8xl">{title}</h1>
      <Suspense fallback={null}>
        <Gate access={access} issue={issue} />
      </Suspense>
    </main>
  );
}

async function Gate({ access, issue }: { access: "student" | "leader"; issue: number }) {
  await connection();
  const session = await getSession();
  const allowed = access === "leader" ? !!session && isSgaLeader(session.roles) : !!session;
  if (!allowed) notFound();
  return <p className="text-muted">Coming soon. This page is built in #{issue}.</p>;
}
