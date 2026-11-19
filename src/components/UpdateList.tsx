import { daysAgoText } from "./IdeaCard";

// The "Updates" list students read on an idea's page (#130): the age in words, then what
// the board wrote. Lifted from the idea page's markup so the leader's preview is the page,
// not a copy of it. Presentational; renders nothing when there are no updates.
// A `system` row is the app's own note about a status change, so it says so (#131).
export type UpdateListItem = {
  key: string;
  daysAgo: number;
  text: string;
  kind?: "board" | "check_in" | "system";
};

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function UpdateList({ updates }: { updates: UpdateListItem[] }) {
  if (updates.length === 0) return null;
  return (
    <ol aria-label="Updates" className="flex flex-col border-t border-line">
      {updates.map((u) => (
        <li key={u.key} className="flex gap-4 border-b border-line py-2.5 text-sm last:border-b-0">
          <span className="w-24 shrink-0 text-muted">{capitalize(daysAgoText(u.daysAgo))}</span>
          <span className="flex flex-col gap-0.5">
            {u.kind === "system" && <span className="text-xs font-semibold text-muted">Status change</span>}
            {u.text}
          </span>
        </li>
      ))}
    </ol>
  );
}
