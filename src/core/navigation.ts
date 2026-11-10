import type { Viewer } from "./permissions";
import { isSgaLeader } from "./positions";

// The site's tabs for one viewer (#156), as in the prototype. Everyone sees Ideas.
// Signed-in people also see My ideas. Leaders also see the leader pages. A tab's
// page enforces the same rule itself, so a hidden tab is never the only guard.
export type NavTab = {
  id: "ideas" | "me" | "queue" | "people" | "updates";
  label: string;
  href: string;
};

export function navTabsFor(viewer: Viewer): NavTab[] {
  const tabs: NavTab[] = [{ id: "ideas", label: "Ideas", href: "/" }];
  if (!viewer) return tabs;
  tabs.push({ id: "me", label: "My ideas", href: "/me" });
  if (isSgaLeader(viewer.roles)) {
    tabs.push(
      { id: "queue", label: "Queue", href: "/queue" },
      { id: "people", label: "People", href: "/people" },
      { id: "updates", label: "Updates", href: "/updates" },
    );
  }
  return tabs;
}
