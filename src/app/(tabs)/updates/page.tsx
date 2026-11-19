import { Suspense } from "react";
import { connection } from "next/server";
import { usesSampleIdeas } from "@/app/_ideas/source";
import { toUpdateRow } from "@/app/_updates/present";
import { requireLeader } from "@/auth/gate";
import { BOARDS, BOARD_CODES } from "@/core/boards";
import { boardsFor } from "@/core/permissions";
import { db } from "@/db/runtime";
import { listUpdatableIdeas } from "@/db/updatesList";
import { env } from "@/env";
import { UpdatesView } from "./UpdatesView";
import { sampleUpdateRows } from "./sample";

// Updates, for leaders (#130). The check runs per request inside a boundary, as the queue
// does, so the page can stream its shell. Never cached: it depends on who is signed in and
// on what was posted a moment ago.
export default function Updates() {
  return (
    <Suspense fallback={null}>
      <UpdatesContent />
    </Suspense>
  );
}

async function UpdatesContent() {
  await connection();
  const session = await requireLeader();
  const viewer = { user: { id: session.user.id }, roles: session.roles };
  // The boards this leader may post updates on, the same row as start, hold, and deliver:
  // all five for the VP, the board's own for a chair or director.
  const allowed = boardsFor(viewer, "manage_status");
  const boards = BOARD_CODES.filter((code) => allowed.includes(code)).map((code) => ({
    value: code,
    label: BOARDS[code].name,
  }));

  // Local runs and browser tests have no database (usesSampleIdeas): sample rows, and db()
  // is never touched.
  const now = new Date();
  const records = usesSampleIdeas(env())
    ? sampleUpdateRows(now).filter((r) => allowed.includes(r.boardId))
    : await listUpdatableIdeas(db(), allowed);
  return <UpdatesView rows={records.map((record) => toUpdateRow(record, now))} boards={boards} />;
}
