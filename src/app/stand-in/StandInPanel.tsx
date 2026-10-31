import { Button } from "@/components/Button";
import type { Session } from "@/auth/contract";
import type { STAND_IN_USERS } from "@/auth/standIn";
import { BOARDS, BOARD_CODES } from "@/core/boards";
import { boardsRun, isSgaLeader } from "@/core/positions";

type Action = (formData: FormData) => void | Promise<void>;

type Props = {
  enabled: boolean;
  session: Session | null;
  users: typeof STAND_IN_USERS;
  // Passed in, so a test can stub them (#45).
  signInAs: Action;
  signOut: Action;
};

function boardsText(session: Session): string {
  const boards = boardsRun(session.roles);
  if (boards.length === 0) return "no boards";
  if (boards.length === BOARD_CODES.length) return "all five boards";
  return boards.map((code) => BOARDS[code].name).join(", ");
}

// The dev-only stand-in: shows what a test user's session grants (#45). Plain
// form posts, so it works without JavaScript.
export function StandInPanel({ enabled, session, users, signInAs, signOut }: Props) {
  if (!enabled) {
    return (
      <section className="bordered bg-surface p-4">
        <p>The stand-in is off. Set AUTH_STAND_IN=1 in .env.local and restart the server.</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2 bordered bg-surface p-4" aria-labelledby="stand-in-current">
        {session ? (
          <>
            <h2 id="stand-in-current" className="font-bold">
              Signed in as {session.user.name}
            </h2>
            <p>
              Positions:{" "}
              {session.positions.length > 0 ? session.positions.map((p) => p.name).join(", ") : "none"}
            </p>
            <p>Reviews posts and runs: {boardsText(session)}</p>
            <p>SGA leader (sees who posted and who supported): {isSgaLeader(session.roles) ? "Yes" : "No"}</p>
            <form action={signOut}>
              <Button type="submit">Sign out</Button>
            </form>
          </>
        ) : (
          <h2 id="stand-in-current" className="font-bold">
            You are signed out. You see what a visitor sees.
          </h2>
        )}
      </section>

      <section aria-labelledby="stand-in-users">
        <h2 id="stand-in-users" className="mb-2 font-bold">
          Test users
        </h2>
        <ul className="bordered bg-surface">
          {users.map((user) => (
            <li
              key={user.slug}
              className="flex items-center justify-between gap-4 border-b border-line p-4 last:border-b-0"
            >
              <div>
                <p className="font-bold">{user.name}</p>
                <p className="text-muted">{user.description}</p>
              </div>
              {session?.user.id === user.id ? (
                <span className="text-muted">Signed in</span>
              ) : (
                <form action={signInAs}>
                  <input type="hidden" name="user" value={user.slug} />
                  <Button type="submit" variant="line" size="sm" aria-label={`Sign in as ${user.name}`}>
                    Sign in
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
