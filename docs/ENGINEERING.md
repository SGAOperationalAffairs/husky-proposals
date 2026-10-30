# Engineering

Patterns and where things live. Port's agents read this file and its review agent cites it, and unlike `CLAUDE.md` they can edit it. Update it in the same pull request as the feature that adds a pattern or a folder.

Where this file and `CLAUDE.md` disagree, `CLAUDE.md` wins. Product rules (privacy, review, copy) live in `CLAUDE.md` and are not repeated here. `docs/DESIGN.md` covers how the interface looks; accessibility lives here only.

Created with the scaffold (#26). Merged with `/port:analyze` (#32).

**Stack:** Next.js 16 App Router, TypeScript (strict), Prisma 7.10 on Neon Postgres, zod, Tailwind 4 on our tokens, Vitest and Playwright. Node 22.

## 1. Architecture

- **Layers are enforced by lint** (`eslint.config.mjs`):
  - `src/core/` never imports Next.js, React, `@/db`, routes, or components.
  - Only `src/db/` imports `@prisma/client` or `@/generated/*`.
  - Raw SQL (`$queryRaw`, `$executeRaw`) appears only in `src/db/sql/`. `$queryRawUnsafe` and `$executeRawUnsafe` are banned everywhere.
  - Imports climb at most one folder. Use the `@/` alias (or `@design/` for `design/`) beyond that.
- **Routes are thin.** `src/app/` receives requests and calls core modules. Rules (statuses, transitions, permissions, limits, viewer shapes) are plain TypeScript in `src/core/` with plain unit tests.
- **Domain words live in `src/core/`.** A type or the student-facing label for a domain value (a status, a board) is defined once in `src/core/` and imported. Presentation for it (chip colors, icons) stays in the component. Examples: `src/core/boards.ts` holds board codes, names, and color names; `BoardTag` only renders them. `src/core/statuses.ts` holds the idea status type and labels; `StatusLabel` holds only the chip colors.
- **A core type that mirrors a Prisma enum is pinned by a test** that reads the enum out of `prisma/schema.prisma` as text, the way `src/playground/templates.test.ts` reads `design/tokens.css`. Core cannot import Prisma, so the test is the link. Example: `src/core/statuses.test.ts`. Use the shared reader, `prismaEnum()` in `src/core/testing/prismaEnum.ts` (test-only), as `statuses.test.ts` and `review.test.ts` do.
- **Dev-only routes** use the `.dev.tsx` extension and compile only when `APP_ENV` is `local` or `test` (`next.config.ts`). A browser test checks `/playground` is a 404 in a production build.

### Where things live

| Path | What |
|---|---|
| `src/app/` | Next.js routes, layouts, and server actions. Thin: they receive requests and call core modules |
| `src/core/` | Plain TypeScript rules: statuses and transitions, permissions, limits, viewer shapes. Never imports Next.js, React, or the database (lint rule) |
| `src/db/` (planned, T0.5) | The only place that talks to Prisma: shared field lists, filters, and named queries |
| `src/db/sql/` (planned) | The only place for raw SQL, as tagged `$queryRaw` parsed with zod (lint rule) |
| `src/auth/` (planned, T0.6) | The sign-in module: SGAuth session, the development stand-in, and positions to boards |
| `src/email/` (planned) | `sendEmail()`, the outbox worker, and templates |
| `src/env.ts` | The only reader of `process.env`, validated with zod. Checked at server start by `src/instrumentation.ts` |
| `src/generated/prisma/` | The generated Prisma client. Not committed; `npm install` rebuilds it |
| `prisma/schema.prisma` | The data model's source of truth. `prisma/views/` holds the `idea_stats` view SQL |
| `prisma.config.ts` | Prisma CLI config: migrations path and the direct URL, with a placeholder for offline commands |
| `scripts/verify.mjs` | `npm run verify` and its tiers |
| `scripts/check-styles.mjs` | The style guard: no arbitrary Tailwind values, no radius or shadow classes outside the tokens, no hex colors |
| `scripts/port-*.mjs` | Port's scripts, copied verbatim from the plugin. Excluded from lint and Prettier; never edit by hand |
| `tests/browser/` | Playwright tests against the production build (Chromium, iPhone WebKit; Firefox in `verify:all`) |
| `src/components/` | The real UI components, presentational: state comes in as props. Idea card, status label, tags, support pair and squares, button, fields, tabs and badges, queue row, board filter chips, ideas list filters, site header with the list links (its tab look comes from `tabLook.ts`, a plain module so server components can call it), copy link |
| `src/app/_ideas/` | The ideas list's stand-in data (#61): the playground's sample ideas behind `listIdeas()`, `parseIdeasQuery()`, and `getIdea()` (#62), plus `Wall.tsx`, the poster wall and filters shared by Ideas and In progress (#63). Replaced by the public queries (#60) |
| `src/playground/` | The style playground (#29): templates, sample content, and the page itself. Local only |
| `src/app/playground/*.dev.tsx` | The playground route. `.dev.tsx` files compile only when `APP_ENV` is local or test (`next.config.ts`) |
| `design/tokens.css` | The single token source. `src/app/globals.css` maps it into Tailwind with `@theme inline` |
| `design/playground-templates.json` | Whole-app style templates as token sets. Full color must match `design/tokens.css` (a test checks) |

## 2. Patterns

- **Board color:** put `data-board="dining"` (or planning, services, green, sust) on an element; it and its children get `--b` and `--on-b`. `.poster` is an idea in its board's color, `.poster-btn` is the matched Support / I'll participate button, `.board-swatch` is a square of the color (`src/app/globals.css`). Board codes, names, and colors live in `src/core/boards.ts`; idea statuses and their labels in `src/core/statuses.ts`.
- **Responsive components use container queries** (`@container` on a parent, `@lg:` and `@2xl:` on the component), not screen breakpoints, so they fit narrow columns, drawers, and the playground's phone preview. Screen breakpoints (`md:`, `lg:`) are for page layout only (#29).
- **Components are presentational.** State comes in as props. A toggle's handler receives the state the student wants, never "toggle": `onSupportChange(!supported)` in `SupportPair`. Add `"use client"` only to a component with event handlers (`SupportPair`, `Tabs`).
- **One component per visual element.** An element shown in two places is one component, with a prop for a variant (for example, on a poster versus on the page). Do not inline a copy.
- **Tailwind first, a named class when it must.** Write layout and spacing as Tailwind classes in the component. Add a class to `@layer components` in `globals.css` only when it needs token arithmetic, attribute selectors (`[aria-pressed="true"]`), or line clamping (`.poster-title-lines`, `.support-icon`). Add a `@utility` for a reusable single-purpose rule (`bordered`, `heading`, `queue-cols`).
- **Borders by role (a convention, not a guarded rule).** `bordered` (the 2px `--border` token) for outlines of controls, cards, and tags; `accent-rule` (5px) for the rule across the top of a card; Tailwind's 1px `border` (with `border-line`) for hairline dividers between rows and under tab lists. Pick by role, not by taste.
- **Core rules return a result, never throw.** A rule returns `{ ok: true, ... }` or `{ ok: false, error: { code } }`, with `code` a closed union the caller can switch on. The function says what to write and the caller writes it (`src/core/review.ts`).
- **Everything clickable shows the pointer,** even before it does anything (a Support button before E6). One global rule in `globals.css` covers links, buttons, dropdowns, tabs, and `role="button"`; disabled controls show `not-allowed`. `tests/browser/site.spec.ts` checks every page in `PAGES`. A new kind of clickable element joins the rule's selector, never a per-component `cursor-pointer`.
- **Exported shapes:** a component's data type is exported as `<Name>Data` (`IdeaCardData`, `QueueRowData`); its props type stays local as `Props`.

- **Core rules return a result and the rows to write.** A rule in `src/core/` takes plain input and `now`, returns `{ ok, value | error }` with the patch and any rows to write, and never throws, writes, or reads the clock (`src/core/ideaStatus.ts`).

Still to add, no later than the fifth feature: one hook per feature and the validation helpers.

## 3. Data and integrity

- **Environment:** read only through `env()` in `src/env.ts`. Add each variable to the zod schema, to `.env.example`, and to `src/env.test.ts` with the feature that first needs it. The one exception is `next.config.ts`'s build-time `APP_ENV` check (commented there).
- **Validate everything from outside our code with zod:** SGAuth responses, Resend webhooks, and every student submission. Validate on read as well as on write. Repair what can be repaired, record what was repaired, never silently drop anything. One set of shared validation helpers; no local copies (`docs/dev-process.md`).
- **Prisma rules** (shared selects, `idea_stats` for counts and rank, additive migrations, no TypedSQL) are in `CLAUDE.md`, "Database rules." Each raw query in `src/db/sql/` has a test against the Neon test branch, named `*.db.test.ts`, which runs only in CI.

## 4. Security

- **The sign-in stand-in runs only when `APP_ENV` is `local` or `test`.** `src/env.ts` refuses to start otherwise, and `src/env.test.ts` checks every other environment.
- **Public, but not searchable.** Every response sends `X-Robots-Tag: noindex` (`next.config.ts`) and the root layout sets `robots: { index: false }`. `tests/browser/site.spec.ts` checks both for every path in `PAGES`.
- **Viewer shapes and same-origin writes** are in `CLAUDE.md`, "Architecture rules." A test must fail if a private field reaches the student shape.

## 5. Accessibility

- **Every field has a visible `<label>`.** Hints and errors are linked with `aria-describedby`, and an error sets `aria-invalid` (`src/components/Field.tsx`). Errors say what to fix.
- **Toggle buttons use `aria-pressed`;** icon-only buttons have `aria-label` and `title` (`SupportPair`). Decorative icons are `aria-hidden`.
- **A visual-only display has a text alternative:** `SupportSquares` is `role="img"` with an `aria-label` and the count in text; `Badge` has an `aria-label`.
- **Tabs** use `role="tablist"`, `role="tab"`, and `aria-selected` (`src/components/Tabs.tsx`).
- **Focus and motion are global** in `globals.css`: a 2px `--focus` outline on `:focus-visible`, and near-zero animation under `prefers-reduced-motion`. Do not remove an outline or add motion that ignores the media query.
- **Contrast:** every text and background pairing meets WCAG AA in light and dark mode. The pairings are in `docs/DESIGN.md`.

## 6. Performance

- **Explicit caching only.** `cacheComponents` is on (`next.config.ts`), so data is dynamic unless cached with `use cache` and a named cache tag. Signed-in and SGA pages are never cached.
- **Query count is tested per page** once `src/db/` exists: one query per idea fails.

## 7. Quality bar

- **TypeScript is strict** with `noUncheckedIndexedAccess`, `noImplicitOverride`, and `noFallthroughCasesInSwitch` (`tsconfig.json`). Map a closed set with `Record<Union, ...>` so a new member fails to compile (`STATUS_LABELS`, `BOARDS`, `VARIANTS`).
- **Prettier** at width 110 with the Tailwind class sorter; ESLint with zero warnings. `npm run format` and `npm run lint:fix` fix most of it.
- **Comments explain why and cite the issue,** for example `// ... (#29)`. Match the comment density around them.
- **Tests sit beside the code:** `*.test.ts` (unit, Node), `*.test.tsx` (component, jsdom), `*.db.test.ts` (database, CI only), `tests/browser/*.spec.ts` (Playwright). The top `describe` names the feature and cites the issue: `describe("environment (#26)", ...)`.
- **Test data is invented.** Seed data comes from the prototype's sample ideas.
- **Assert on state, not on timing.** No retries in Playwright (`retries: 0`).

## 8. Pre-pull-request self-check

- [ ] Which component or hook does this extend? Which test fails first? (Write that test before the code.)
- [ ] A domain type or label (status, board) is imported from `src/core/`, not redefined in a component or route.
- [ ] An element already built in `src/components/` is reused, not copied inline.
- [ ] No arbitrary Tailwind values, hex colors, or radius and shadow classes outside the tokens (`npm run check:styles`). A new token is added to `design/tokens.css`, to `@theme inline` in `globals.css` if a class needs it, and to `design/playground-templates.json`.
- [ ] A new route is added to `PAGES` in `tests/browser/site.spec.ts`.
- [ ] Anything clickable shows the pointer cursor (the browser guard checks it).
- [ ] Copy promises nothing, never says "petition" or "slots," and new user-facing copy has a test like `src/app/page.test.tsx`'s.
- [ ] A visual-only display has a text alternative; every control works by keyboard.
- [ ] Nothing private reaches the student shape, and a test proves it.
- [ ] A new environment variable is in `src/env.ts`, `.env.example`, and `src/env.test.ts`.
- [ ] `npm run verify:agent` passes (agents), or `npm run verify` (sessions).
