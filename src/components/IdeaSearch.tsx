import { Combobox } from "@base-ui/react/combobox";
import type { BoardCode } from "@/core/boards";
import { BOARDS } from "@/core/boards";

// A search and select for one idea (#129). Type to narrow the ideas, then pick one. Base UI
// handles the keyboard and the list, so arrow keys, Enter, and Escape work without extra code.
// An option with a board shows that board's colour square.
export function IdeaSearch({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; board?: BoardCode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const byValue = new Map(options.map((o) => [o.value, o]));
  return (
    <Combobox.Root
      items={options.map((o) => o.value)}
      value={value}
      onValueChange={(v) => onChange(v ?? "all")}
      itemToStringLabel={(v) => byValue.get(v)?.label ?? ""}
    >
      <Combobox.Input
        aria-label="Idea"
        placeholder="Search ideas"
        className="h-9 w-60 max-w-full bordered bg-surface px-3 text-sm"
      />
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-20">
          <Combobox.Popup className="max-h-72 w-(--anchor-width) overflow-y-auto bordered bg-surface p-1">
            <Combobox.Empty className="p-2 text-sm text-muted">No idea matches that search.</Combobox.Empty>
            <Combobox.List>
              {(id: string) => {
                const o = byValue.get(id);
                return (
                  <Combobox.Item
                    key={id}
                    value={id}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm data-highlighted:bg-accent data-highlighted:text-on-accent"
                  >
                    {o?.board && (
                      <span
                        aria-hidden
                        data-board={BOARDS[o.board].color}
                        className="board-swatch size-3 shrink-0"
                      />
                    )}
                    {o?.label}
                  </Combobox.Item>
                );
              }}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
