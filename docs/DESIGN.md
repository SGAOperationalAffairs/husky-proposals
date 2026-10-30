# Design

What the interface looks like and the words for building it. Port's plan, implement, review, and revise agents read this file for interface work, and review cites it. Accessibility rules live in `docs/ENGINEERING.md` only; this file records the contrast values they are checked against.

Where this file and `CLAUDE.md` disagree, `CLAUDE.md` wins. The look is the Poster direction, picked in the playground (#29). `prototype/concept-2.html` is the reference for layout and wording, not for logic.

Written with `/port:analyze` (#32).

**Stack:** Tailwind 4 with its default colors, radii, shadows, and fonts cleared (`src/app/globals.css`, `@theme`), so only our tokens exist. Tokens are CSS custom properties in `design/tokens.css`, mapped into Tailwind with `@theme inline`. Base UI for unstyled primitives when one is needed (CLAUDE.md; not installed yet); no shadcn styling.

## 1. Tokens

All values are declared in `design/tokens.css`. Change a value there, never in a component. Set every token directly; never derive one token from another on `:root`, so the playground's live overrides work.

**Colors** (light / dark). Tailwind names are the token name: `bg-surface`, `text-muted`, `text-accent-text`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#ebebe8` | `#161616` | Page background |
| `--surface` | `#ffffff` | `#222222` | Panels, fields, plain buttons |
| `--ink` | `#111111` | `#f2f2f2` | Body text |
| `--muted` | `#4a4a4a` | `#b5b5b5` | Secondary text, hints |
| `--line` | `#111111` | `#f2f2f2` | Borders and dividers |
| `--accent` | `#c8102e` | `#d92b48` | Primary buttons, badges, active tab |
| `--accent-text` | `#b00d28` | `#ff7a8e` | Accent-colored text and links, errors |
| `--on-accent` | `#ffffff` | `#ffffff` | Text on `--accent` |
| `--accent-soft` | 14% accent on surface | same mix | Row hover |
| `--focus` | `#1f5fbf` | `#7aa7f0` | Focus outline |

**Status chips** (`src/components/StatusLabel.tsx`): collecting support `bg-grey text-grey-ink`, under review `bg-sky text-sky-ink`, in progress `bg-amber text-amber-ink`, delivered `bg-green text-green-ink`, waiting an outline (`bordered`) on a transparent background with `text-grey-ink`.

**Board colors** (`--board-<name>` / `--on-board-<name>`), reached through `data-board` as `--b` / `--on-b`:

| Board | Name | Color | Text on it |
|---|---|---|---|
| DAB | `dining` | `#c8102e` | `#ffffff` |
| CPAB | `planning` | `#ef7d1a` (orange) | `#111111` |
| CSC | `services` | `#f2c230` (yellow) | `#111111` |
| GIB | `green` | `#2e7d32` | `#ffffff` |
| SC | `sust` | `#213f99` (blue; dark `#3355c4`) | `#ffffff` |

**Contrast, computed from the tokens (WCAG ratio, light / dark).** AA needs 4.5 for normal text. `src/app/contrast.test.ts` checks every pairing below in both modes (#37).

| Pairing | Light | Dark |
|---|---|---|
| ink on bg / surface | 15.81 / 18.88 | 16.16 / 14.21 |
| muted on bg / surface | 7.42 / 8.86 | 8.83 / 7.76 |
| accent-text on surface / bg | 7.16 / 5.99 | 6.38 / 7.26 |
| on-accent on accent | 5.88 | 4.78 (dark accent darkened from `#e0334f`, #37) |
| chip inks on their chips | 8.08 to 11.43 | 8.30 to 10.29 |
| focus on bg / surface | 5.10 / 6.09 | 7.42 / 6.53 |
| text on board colors | 5.13 (green) to 11.27 (services) | 5.13 to 11.27 (sustainability 6.49) |

**Shape and depth:**
- Corners: `--card-radius`, `--field-radius`, `--button-radius`, `--chip-radius`, all `0`. Use only `rounded-card`, `rounded-field`, `rounded-button`, `rounded-chip` (style guard and browser guard).
- Borders: `--border: 2px` (the `bordered` utility), `--accent-rule: 5px` in `--rule-color` (`#c8102e`, dark `#d92b48`; the `accent-rule` utility), and Tailwind's 1px `border` for hairlines. Which to use is in `docs/ENGINEERING.md`, "Borders by role."
- Shadow: `--card-shadow: none` (`shadow-card`). No other shadow class exists.
- Spacing: Tailwind's default scale, plus `--card-pad: 20px` (`p-card`), `--card-pad-y: 20px`, `--card-stack: 12px` (`.card-stack`), `--card-gap: 20px`.

## 2. Typography

- **Public Sans** for reading (`--font`, Tailwind `font-sans`), **Big Shoulders** for headlines and big numbers (`--font-heading`). Both load through `next/font` in `src/app/layout.tsx`; Big Shoulders uses its optical-size axis for the condensed display cut.
- **Headlines** use the `heading` utility: weight `800`, tracking `0.005em`, uppercase, line height `0.92`. Page titles are `heading text-4xl` to `text-8xl`; queue rank is `heading text-3xl`.
- **Poster sizes:** headline `--poster-title: 2.25rem`, shrinking to `15cqi` on a narrow poster; support count `--poster-number: 3.75rem`, shrinking to `28cqi`. Both via `.poster-title` and `.poster-number`.
- **Line caps:** poster headlines at `--title-lines: 3`, descriptions at `--desc-lines: 2`, through `.poster-title-lines` and `.poster-desc`.
- **Small text:** `text-xs font-bold` for the poster's top line and tags, `text-xs font-semibold` for chips, `text-sm` for secondary lines. Numbers that line up use `tabular-nums`.

## 3. Layout and responsive behaviour

- **The wall of posters** is `.card-grid`: up to `--cards-per-row: 3` columns, falling back to fewer whenever a card would be narrower than `12rem`, so a phone shows one. Every row is as tall as its tallest card (`grid-auto-rows: 1fr`).
- **Inside a poster** the count and buttons sit at the bottom (`mt-auto`), so they line up across a row.
- **Components respond to their container** (`@container`, then `@2xs:`, `@lg:`, `@2xl:`); screen breakpoints (`md:`, `lg:`) are for page layout only. `QueueRow` stacks into two columns (`queue-cols`) and spreads into six at `@2xl` (`queue-cols-wide`).
- **Page width:** content pages use `mx-auto max-w-2xl px-4` (`src/app/page.tsx`); the playground preview goes to `max-w-6xl`.

## 4. Component treatments

- **Poster** (`IdeaCard`): the whole card in its board's color (`.poster`). The top line, always one line with ellipsis: board category, `#103`, From SGA, status. Then headline, description, support count with "students want this / N will help", then `SupportPair` and Learn more. No place line, tape, tilt, or tear-off tabs.
- **Support and I'll participate** (`SupportPair`) are always shown together. `look="icons"` on the wall: an outline heart and raised hand that fill in when pressed. `look="buttons"` on an idea's page: `.poster-btn` labeled buttons with the same icons, reading "Supported" and "Participating" when pressed. Pressed inside a poster is the board's text color as background; outside a poster, ink on the page.
- **Buttons** (`Button`): `primary` (accent fill) for the one main action on a screen, `line` (accent outline) for a secondary action that matters, `plain` (surface) for the rest. Sizes `md` and `sm`. Disabled is `aria-disabled` at 55% opacity.
- **Fields** (`TextField`, `TextArea`, `SelectField`): label above, then the control (`rounded-field bordered bg-surface`), then a muted hint or an `accent-text` error, never both.
- **Tabs and badges** (`Tabs`, `Badge`): the active tab is `accent-text` with an accent underline; the badge is accent when its count is above 0, grey at 0.
- **Queue row** (`QueueRow`): accent-soft on hover; a stale idea shows "Needs an update" in `accent-text` beside its status.
- **Tags** (`BoardTag`, `FromSgaTag`): a square board swatch with the category; From SGA as an outlined label.

## 5. Motion and feedback

- No animations or transitions exist yet. Pressed state is shown by fill (icons fill, buttons invert), not motion.
- Any motion added must respect `prefers-reduced-motion`; `globals.css` already reduces all durations under it.

## 6. Copy and tone

- **Short sentences, plain words, no jargon.** No em dashes.
- **Support informs, it does not bind.** Say support helps SGA decide; never promise action. Never say "petition" or "vote" for support. `SupportSquares` says: "Support helps SGA decide; it is not a vote."
- **Say "in progress," never "slots."** Boards usually work on 1 to 2 ideas at a time.
- **Rank wording must not read as a promise:** "Ranked 2 of 14 ideas for Dining."
- **Proposal numbers:** visible text is always `#103`; screen-reader labels say "proposal 103" (`SupportPair`'s group label).
- **Status words** are the labels in `src/core/` ("Collecting support," "Under review," "In progress," "Delivered," "Waiting"), and a waiting idea always shows why.
- **Dates read as people say them:** "updated today," "updated yesterday," "updated 4 days ago" (`updatedText` in `IdeaCard.tsx`).
- **Errors say what to fix,** in the field's error line.

## 7. Agent quick reference

- [ ] Every color, radius, border width, and shadow comes from a token; never an arbitrary value or a hex color in a component.
- [ ] A board-colored element sets `data-board` and uses `--b` / `--on-b` (`.poster`, `.board-swatch`); never pick a board color by hand.
- [ ] Corners are square: only `rounded-card`, `rounded-field`, `rounded-button`, `rounded-chip`.
- [ ] Headlines use `heading`; posters use `.poster-title` and `.poster-number`, with line caps.
- [ ] Components respond with container queries, not screen breakpoints.
- [ ] Support and I'll participate appear together, through `SupportPair`, with the right `look`.
- [ ] Copy promises nothing, numbers read `#103`, and status words come from `src/core/`.
- [ ] Check the screen in light and dark mode and at phone width (the playground's phone preview), and try new layouts on `/playground` first.
- [ ] No gradient heroes, rounded pill cards, emoji icons, or filler copy.
