import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireLeader } from "@/auth/gate";
import { getSession } from "@/auth/session";

// A page whose tab exists before its screen is built (#156). The page checks the
// viewer's access itself, so the tab being hidden is never the only guard: a leader
// page returns not-found to students and visitors. The title sits inside the
// check, so nothing of the page shows before it passes.
export function PlaceholderPage({ title, access }: { title: string; access: "student" | "leader" }) {
  return (
    <Suspense fallback={null}>
      <Gate title={title} access={access} />
    </Suspense>
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
