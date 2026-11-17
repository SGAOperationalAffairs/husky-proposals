import { Combobox } from "@base-ui/react/combobox";

// A search and select for one idea (#129). Type to narrow the ideas, then pick one. Base UI
// handles the keyboard and the list, so arrow keys, Enter, and Escape work without extra code.
// Used by the People page (#129).
export function IdeaSearch({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const labels = new Map(options.map((o) => [o.value, o.label]));
  return (
    <Combobox.Root
      items={options.map((o) => o.value)}
      value={value}
      onValueChange={(v) => onChange(v ?? "all")}
      itemToStringLabel={(v) => labels.get(v) ?? ""}
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
              {(id: string) => (
                <Combobox.Item
                  key={id}
                  value={id}
                  className="block cursor-pointer px-2 py-1.5 text-sm data-highlighted:bg-accent data-highlighted:text-on-accent"
                >
                  {labels.get(id)}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
