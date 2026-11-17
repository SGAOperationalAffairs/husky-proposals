import { Suspense } from "react";
import { PeopleView } from "@/app/_people/PeopleView";
import { requireLeader } from "@/auth/gate";
import { BOARDS, BOARD_CODES } from "@/core/boards";
import { peopleForViewer } from "@/core/people";
import { boardsFor } from "@/core/permissions";
import { listPeople } from "@/db/peopleStore";
import { db } from "@/db/runtime";

// People, for leaders (#129). Leaders only: a student gets the not-found page, as the queue does.
// Never cached: the rows depend on who is signed in, so the check runs per request.
export default function People({ searchParams }: { searchParams: Promise<{ idea?: string | string[] }> }) {
  return (
    <Suspense fallback={null}>
      <PeopleContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PeopleContent({ searchParams }: { searchParams: Promise<{ idea?: string | string[] }> }) {
  const session = await requireLeader();
  const viewer = { user: { id: session.user.id }, roles: session.roles };

  // The boards this leader may see: all five for the VP, the board's own for a chair.
  const allowed = boardsFor(viewer, "see_people");
  const rows = peopleForViewer(viewer, await listPeople(db(), allowed));
  const boards = BOARD_CODES.filter((code) => allowed.includes(code)).map((code) => ({
    value: code,
    label: BOARDS[code].name,
  }));

  // A link with ?idea=103 opens the list on that idea.
  const { idea } = await searchParams;
  const initialIdea = typeof idea === "string" ? idea : "all";

  return <PeopleView rows={rows} boards={boards} now={new Date().toISOString()} initialIdea={initialIdea} />;
}
