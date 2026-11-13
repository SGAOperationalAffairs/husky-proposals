import { getSession } from "@/auth/session";
import { LeaderIdeaPanel } from "@/components/LeaderIdeaPanel";
import { boardsFor } from "@/core/permissions";
import { leaderIdeaByNumber } from "@/db/leaderIdea";
import { db } from "@/db/runtime";
import { env } from "@/env";
import { parseIdeasNumber } from "@/app/_ideas/data";
import { usesSampleIdeas } from "@/app/_ideas/source";
import { IdeaStatusControls } from "@/app/_status/IdeaStatusControls";
import { LeaderIdeaControls } from "./LeaderIdeaControls";
import { toLeaderPanel } from "./present";

// The leader's extras on a public idea page (#59). It sits in its own <Suspense>
// boundary, outside the cached idea read: the session is read per request and the
// leader read is never cached, so the public part stays identical for everyone. For a
// student, a visitor, or a leader with nothing extra to see here, it renders nothing.
export async function LeaderIdeaSection({ params }: { params: PageProps<"/ideas/[number]">["params"] }) {
  const number = parseIdeasNumber((await params).number);
  // Local runs without a database have no leader data to show.
  if (number === undefined || usesSampleIdeas(env())) return null;

  const session = await getSession();
  if (!session) return null;
  const viewer = { user: { id: session.user.id }, roles: session.roles };
  const result = await leaderIdeaByNumber(db(), viewer, number);
  if (!result) return null;

  const panel = toLeaderPanel(result, boardsFor(viewer, "review"));
  return (
    <LeaderIdeaPanel
      poster={panel.poster}
      reviewerLabel={panel.reviewerLabel}
      mayManageStatus={panel.mayManageStatus}
      mayTakeDown={panel.mayTakeDown}
      status={
        <IdeaStatusControls
          ideaId={panel.ideaId}
          number={panel.number}
          board={panel.boardId}
          status={panel.status}
          waitingReason={panel.waitingReason}
        />
      }
      takeDown={<LeaderIdeaControls ideaId={panel.ideaId} number={panel.number} board={panel.boardId} />}
    />
  );
}
