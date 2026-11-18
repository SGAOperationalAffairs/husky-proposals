import { Suspense } from "react";
import { connection } from "next/server";
import { requireLeader } from "@/auth/gate";
import { BOARDS, BOARD_CODES, type BoardCode } from "@/core/boards";
import { boardsFor } from "@/core/permissions";
import { UpdatesView } from "./UpdatesView";
import { sampleUpdateRows } from "./sample";

// Updates, for leaders (#130). The check runs per request inside a boundary, as the queue
// does, so the page can stream its shell. It draws the tab from sample rows until the
// update queries land.
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
  // The boards this leader may update: all five for the VP, the board's own for a chair.
  const allowed = new Set<BoardCode>(boardsFor(viewer, "review"));
  const boards = BOARD_CODES.filter((code) => allowed.has(code)).map((code) => ({
    value: code,
    label: BOARDS[code].name,
  }));
  const rows = sampleUpdateRows().filter((r) => allowed.has(r.board));
  return <UpdatesView rows={rows} boards={boards} />;
}
