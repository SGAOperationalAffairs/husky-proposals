import { LEADER_ROUTES } from "./navigation";
import { isSgaLeader, type Roles } from "./positions";

// The two questions src/proxy.ts asks before a leader page renders (#235). The page's
// own requireLeader() stays the authoritative check; this only lets the response be a
// real 404 instead of a 200 that streams first.

// An exact match, with one trailing slash tolerated. `/queue/x` is not a leader route.
export function isLeaderRoute(pathname: string): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return (LEADER_ROUTES as readonly string[]).includes(path);
}

// Null roles are a signed-out visitor.
export function leaderMayEnter(roles: Roles | null): boolean {
  return roles !== null && isSgaLeader(roles);
}
