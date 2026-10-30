import data from "@design/playground-templates.json";

// Playground templates (#29): whole-app token sets, stored as data in
// design/playground-templates.json. Shape and type are shared across modes;
// colors have a light and a dark palette.
export const SHARED_KEYS = [
  "font",
  "font-heading",
  "heading-weight",
  "heading-tracking",
  "heading-case",
  "card-radius",
  "field-radius",
  "button-radius",
  "chip-radius",
  "border",
  "accent-rule",
  "card-shadow",
  "card-pad",
  "cards-per-row",
  "card-gap",
  "poster-title",
  "poster-number",
  "desc-lines",
] as const;

export const COLOR_KEYS = [
  "bg",
  "surface",
  "ink",
  "muted",
  "line",
  "accent",
  "accent-text",
  "on-accent",
  "accent-soft",
  "sky",
  "sky-ink",
  "amber",
  "amber-ink",
  "green",
  "green-ink",
  "grey",
  "grey-ink",
  "focus",
  "board-dining",
  "on-board-dining",
  "board-planning",
  "on-board-planning",
  "board-services",
  "on-board-services",
  "board-green",
  "on-board-green",
  "board-sust",
  "on-board-sust",
  "rule-color",
] as const;

export type SharedKey = (typeof SHARED_KEYS)[number];
export type ColorKey = (typeof COLOR_KEYS)[number];
export type Mode = "light" | "dark";

export type PosterStyle = "full" | "band" | "outline";

export type Template = {
  id: string;
  name: string;
  description: string;
  poster: PosterStyle;
  shared: Record<SharedKey, string>;
  light: Record<ColorKey, string>;
  dark: Record<ColorKey, string>;
};

export type Overrides = {
  shared: Partial<Record<SharedKey, string>>;
  light: Partial<Record<ColorKey, string>>;
  dark: Partial<Record<ColorKey, string>>;
};

export const TEMPLATES = data.templates as Template[];
export const DEFAULT_TEMPLATE = TEMPLATES[0] as Template; // Full color mirrors design/tokens.css.

export const emptyOverrides = (): Overrides => ({ shared: {}, light: {}, dark: {} });

export function resolve(template: Template, overrides: Overrides, mode: Mode) {
  return {
    shared: { ...template.shared, ...overrides.shared },
    colors: { ...template[mode], ...overrides[mode] },
  };
}

// Every token as an inline CSS variable on the preview wrapper, so the
// playground's own controls keep the defaults (Resume Studio's pattern).
export function tokenStyle(template: Template, overrides: Overrides, mode: Mode): Record<string, string> {
  const { shared, colors } = resolve(template, overrides, mode);
  const style: Record<string, string> = { colorScheme: mode };
  for (const [key, value] of Object.entries({ ...shared, ...colors })) style[`--${key}`] = value;
  return style;
}

// What "Copy settings" hands back: only values that differ from the current
// defaults (Full color, which mirrors design/tokens.css), plus a ready CSS block.
export function settingsBlob(template: Template, overrides: Overrides) {
  const diff = <K extends string>(next: Record<K, string>, base: Record<K, string>) =>
    Object.fromEntries(
      (Object.keys(next) as K[]).filter((k) => next[k] !== base[k]).map((k) => [`--${k}`, next[k]]),
    );
  const light = { ...diff(resolve(template, overrides, "light").shared, DEFAULT_TEMPLATE.shared) };
  Object.assign(light, diff(resolve(template, overrides, "light").colors, DEFAULT_TEMPLATE.light));
  const dark = diff(resolve(template, overrides, "dark").colors, DEFAULT_TEMPLATE.dark);
  const block = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n");
  return {
    template: template.id,
    poster: template.poster,
    light,
    dark,
    css: `:root {\n${block(light)}\n}\n@media (prefers-color-scheme: dark) {\n  :root {\n${block(dark)
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n")}\n  }\n}\n`,
  };
}
