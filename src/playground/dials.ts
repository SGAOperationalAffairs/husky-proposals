import palettes from "@design/playground-palettes.json";
import type { Overrides } from "./templates";

// The playground's dials (#29). Each option is a set of token overrides, so
// "Copy settings" captures whatever is chosen. Shared tokens apply in both
// modes; `colors` apply to light and dark alike.
type Choice = { shared?: Overrides["shared"]; colors?: Overrides["light"]; light?: Overrides["light"] };

export const DIAL_GROUPS = ["Layout", "Card contents", "Type", "Color and lines"] as const;

export type Dial = {
  id: string;
  group: (typeof DIAL_GROUPS)[number];
  /** A select by default; a toggle is a checkbox with On and Off options. */
  kind?: "toggle";
  label: string;
  options: Record<string, Choice>;
  initial: string;
};

const PALETTES = palettes as {
  boards: Record<"Deep" | "Soft", Overrides["light"]>;
  backgrounds: Record<"White", Overrides["light"]>;
};

export const DIALS: Dial[] = [
  {
    id: "perRow",
    group: "Layout",
    label: "Cards per row",
    initial: "3",
    options: {
      "2": { shared: { "cards-per-row": "2" } },
      "3": { shared: { "cards-per-row": "3" } },
      "4": { shared: { "cards-per-row": "4" } },
    },
  },
  {
    id: "gap",
    group: "Layout",
    label: "Gap between cards",
    initial: "Standard",
    options: {
      Tight: { shared: { "card-gap": "10px" } },
      Standard: { shared: { "card-gap": "20px" } },
      Airy: { shared: { "card-gap": "36px" } },
    },
  },
  {
    id: "density",
    group: "Layout",
    label: "Padding inside cards",
    initial: "Standard",
    options: {
      Compact: { shared: { "card-pad": "16px" } },
      Standard: { shared: { "card-pad": "20px" } },
      Roomy: { shared: { "card-pad": "28px" } },
    },
  },
  {
    id: "case",
    group: "Type",
    label: "Headline case",
    initial: "All caps",
    options: {
      "All caps": { shared: { "heading-case": "uppercase" } },
      "Sentence case": { shared: { "heading-case": "none" } },
    },
  },
  {
    id: "titleSize",
    group: "Type",
    label: "Headline size",
    initial: "Medium",
    options: {
      Small: { shared: { "poster-title": "1.75rem" } },
      Medium: { shared: { "poster-title": "2.25rem" } },
      Large: { shared: { "poster-title": "3rem" } },
    },
  },
  {
    id: "weight",
    group: "Type",
    label: "Headline weight",
    initial: "Extra bold",
    options: {
      Bold: { shared: { "heading-weight": "700" } },
      "Extra bold": { shared: { "heading-weight": "800" } },
      Black: { shared: { "heading-weight": "900" } },
    },
  },
  {
    id: "number",
    group: "Type",
    label: "Support number",
    initial: "Large",
    options: {
      Medium: { shared: { "poster-number": "2.75rem" } },
      Large: { shared: { "poster-number": "3.75rem" } },
      Huge: { shared: { "poster-number": "5rem" } },
    },
  },
  {
    id: "desc",
    group: "Type",
    label: "Description length",
    initial: "Full",
    options: {
      Full: { shared: { "desc-lines": "none" } },
      "3 lines": { shared: { "desc-lines": "3" } },
      "2 lines": { shared: { "desc-lines": "2" } },
    },
  },
  {
    id: "boards",
    group: "Color and lines",
    label: "Board colors",
    initial: "Vivid",
    options: {
      Vivid: {},
      Deep: { colors: PALETTES.boards.Deep },
      Soft: { colors: PALETTES.boards.Soft },
    },
  },
  {
    id: "bg",
    group: "Color and lines",
    label: "Page background",
    initial: "Grey",
    options: { Grey: {}, White: { light: PALETTES.backgrounds.White } },
  },
  {
    id: "border",
    group: "Color and lines",
    label: "Border weight",
    initial: "2px",
    options: {
      "1px": { shared: { border: "1px" } },
      "2px": { shared: { border: "2px" } },
      "3px": { shared: { border: "3px" } },
    },
  },
  {
    id: "corners",
    group: "Color and lines",
    label: "Corners",
    initial: "Square",
    options: {
      Square: {
        shared: { "card-radius": "0", "field-radius": "0", "button-radius": "0", "chip-radius": "0" },
      },
      Small: {
        shared: { "card-radius": "4px", "field-radius": "3px", "button-radius": "3px", "chip-radius": "3px" },
      },
      Soft: {
        shared: {
          "card-radius": "12px",
          "field-radius": "8px",
          "button-radius": "999px",
          "chip-radius": "999px",
        },
      },
    },
  },
];

// On/off toggles for each part of an idea card, shown as checkboxes.
const CARD_PARTS: [part: string, label: string][] = [
  ["board", "Board and proposal number"],
  ["status", "Status"],
  ["sga", "From SGA tag"],
  ["headline", "Headline"],
  ["desc", "Description"],
  ["place", "Place and last update"],
  ["count", "Support count"],
  ["helpers", "Will help count"],
  ["learn", "Learn more link"],
  ["buttons", "Support and participate buttons"],
];
for (const [part, label] of CARD_PARTS)
  DIALS.push({
    id: `show-${part}`,
    group: "Card contents",
    kind: "toggle",
    label,
    initial: "On",
    options: {
      On: { shared: { [`card-show-${part}`]: "block" } },
      Off: { shared: { [`card-show-${part}`]: "none" } },
    },
  });

export const INITIAL_DIALS = Object.fromEntries(DIALS.map((d) => [d.id, d.initial]));

export function applyDials(overrides: Overrides, chosen: Record<string, string>): Overrides {
  for (const dial of DIALS) {
    const choice = dial.options[chosen[dial.id] ?? dial.initial] ?? {};
    Object.assign(overrides.shared, choice.shared);
    Object.assign(overrides.light, choice.colors, choice.light);
    Object.assign(overrides.dark, choice.colors);
  }
  return overrides;
}
