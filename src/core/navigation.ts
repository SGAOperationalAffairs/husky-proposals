import { boardsFor, type Viewer } from "./permissions";

// The site's tabs for one viewer (#156), as in the prototype. Everyone sees Ideas.
// Signed-in people also see My ideas. Leaders also see the leader pages. A tab's
// page enforces the same rule itself, so a hidden tab is never the only guard.
export type NavTab = {
  id: "ideas" | "me" | "queue" | "people" | "updates";
  label: string;
  href: string;
};

// The leader pages, in tab order. src/proxy.ts answers 404 to non-leaders on exactly
// these paths before anything renders. Its matcher must be a literal, so it repeats
// this list, and src/proxy.test.ts fails if the two drift apart (#235).
export const LEADER_ROUTES = ["/queue", "/people", "/updates"] as const;

export function navTabsFor(viewer: Viewer): NavTab[] {
  const tabs: NavTab[] = [{ id: "ideas", label: "Ideas", href: "/" }];
  if (!viewer) return tabs;
  tabs.push({ id: "me", label: "My ideas", href: "/me" });
  // Each tab asks what its page shows (#100), never isSgaLeader: an Executive Board
  // member is a leader but reviews and manages nothing, so they get no empty tabs.
  const [queue, people, updates] = LEADER_ROUTES;
  if (boardsFor(viewer, "review").length > 0) tabs.push({ id: "queue", label: "Queue", href: queue });
  if (boardsFor(viewer, "see_people").length > 0) tabs.push({ id: "people", label: "People", href: people });
  if (boardsFor(viewer, "manage_status").length > 0)
    tabs.push({ id: "updates", label: "Updates", href: updates });
  return tabs;
}
