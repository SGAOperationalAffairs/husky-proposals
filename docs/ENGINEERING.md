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
| `src/db/` | The only place that talks to Prisma. `client.ts` builds a client with the Postgres adapter, and `runtime.ts` is the app's one client (`db()`). `publicIdeas.ts` holds the public reads, `publicIdeaQueries(db).list()` and `.byNumber(n)` (#60). `seed.ts` writes the invented development data (#44) |
| `src/db/sql/` | The only place for raw SQL, as tagged `$queryRaw` parsed with zod (lint rule). `ping.ts` is the first |
| `src/db/safeTarget.ts` | The host guard, `assertSafeDatabaseTarget`: only localhost or an allowlisted test branch. The seed calls it too (#104) |
| `src/db/testing/` | Database test helpers (`describeWithDatabase`, `withRollback`), `globalSetup.ts` (creates, migrates, and drops each run's database), `runDatabase.ts` (names and the run registry), factories, and invented fixtures |
| `src/testing/` | Framework-free test fakes, such as the fake clock |
| `src/core/permissions.ts` | Who may do what (`can`, `boardsFor`, `canSeeWhoPosted`, `isAuthor`), built from the table in `docs/data-model.md`, which a test pins. "Open" cells go through `otherLeaderMay` (D16) |
| `src/auth/` | The sign-in module (#45): `contract.ts` (zod schema for SGAuth's session body, `Session`, `toSession`), `standIn.ts` (invented test users in SGAuth's shape), and `session.ts`, the one module the app calls (`getSession()`) |
| `src/core/positions.ts` | SGAuth position keys to boards and roles (`rolesFromPositions`, `boardsRun`), and `isSgaLeader`, the one function for PRD D16. A test pins its keys to `docs/sgauth-integration.md` |
| `src/auth/gate.ts` | The sign-in gate (#93): `requireSignedIn` for pages, `withSession` for server actions, `signInDestination` for `/sign-in` |
| `src/core/nextPath.ts` | `safeNextPath`: only same-site relative paths survive, the open-redirect guard for every `next` |
| `src/app/sign-in/` | The `/sign-in` route and its "Sign-in isn't open yet." panel. The one place that knows how sign-in starts |
| `src/app/stand-in/` | The dev-only sign-in stand-in page (`page.dev.tsx`), its actions, and a presentational panel |
| `src/email/` | The `sendEmail()` contract and the capturing mailer. The Resend mailer, the secret-protected drain route, and its schedule still come with E9 |
| `src/email/ideaEvent.ts` | The follower email (#101), pure: the `IdeaEvent` type, its dedupe key, `IDEA_EVENT_PRIORITY`, the strict payload schema (no author field), and `renderIdeaEventEmail` (plain text) |
| `src/app/_follow/` | Following (#101): `setFollow.ts` (the rules with `FollowStore` behind an interface; sets the state, never toggles) and `actions.ts`, the `setFollowing` server action: same origin, then `withSession`, then the rules |
| `src/db/followStore.ts` | The Prisma `FollowStore` (#101): `findPublicIdea` uses `isPublic`, `follow` upserts the user and writes with `skipDuplicates`, `unfollow` uses `deleteMany` |
| `src/db/outbox.ts` | The outbox (#101): `queueFollowerEmails(tx, event)` writes one `idea_event` row per eligible follower in the caller's transaction, and `drainOutbox(db, mailer, now, { siteUrl })` sends claimed rows of the types it can render, marking each sent, or leaving a provider error for a retry after a backoff. An invalid payload or a missing recipient stops at once for a human |
| `src/db/sql/claimOutboxBatch.ts` | The outbox claim (#101): one tagged `$queryRaw` with `FOR UPDATE SKIP LOCKED`, filtered to the `types` the caller can render, that sets `locked_until` and counts the attempt, so no lock is held during the send. Rows past `MAX_ATTEMPTS` stay unsent for a human |
| `src/env.ts` | The only reader of `process.env`, validated with zod. Checked at server start by `src/instrumentation.ts` |
| `src/generated/prisma/` | The generated Prisma client. Not committed; `npm install` rebuilds it |
| `prisma/schema.prisma` | The data model's source of truth. `prisma/views/` holds the `idea_stats` view SQL |
| `prisma/migrations/` | The migrations (#44): `*_init` is generated from the schema; `*_idea_stats_view_and_checks` is hand-written for the view and the check constraints; `*_board_review_due_days` (#58) adds the per-board review due time and its 1 to 14 check; `*_action_counts` (#94) adds the abuse limit's counter table. Committed migrations are never edited |
| `src/app/_review/` | The review actions (#58): `decidePost.ts` (approve, decline, take down; the rules with the store behind an interface), `changeReviewDueDays.ts` (a board's review due time, `change_review_due`), and `actions.ts`, the four server actions: same origin, then `withSession`, then the rules in one transaction, then the public cache tags. The review screens (#59) add `present.ts` (leader rows as plain client data; a hidden author never carries a name), `messages.ts` (copy for every failed decision), `useReviewActions.ts` (the feature's one hook: run the action, toast, refresh), and the idea page's leader extras, `LeaderIdeaSection.tsx` (server boundary) with `LeaderIdeaControls.tsx` (Take down) |
| `src/db/reviewStore.ts` | The Prisma `ReviewStore` (#58): finds the target, assigns the next public number (highest plus one under an advisory lock), and writes the idea patch and the Review row together, guarded on the status the rules read |
| `src/app/_post/` | The post actions (#54, #56): `submitPost.ts` (a new post, and `postFields`, the form-to-stored mapping), `ownPost.ts` (the author's resubmit of a declined post and withdraw of a pending or declined one; a non-author gets `not_found`), and `actions.ts`, the server actions: same origin, then the session, then the rules (resubmit and withdraw in one transaction) |
| `src/db/ownPostStore.ts` | The Prisma `OwnPostStore` (#56): finds the target and its latest version, and writes resubmit (idea patch plus the next revision) and withdraw, each guarded on the status the rules read |
| `src/app/_support/` | The support action (#94): `setSupport.ts` (the rules with the `SupportStore` behind an interface: input, the public idea, open for support, the abuse limit, then the write) and `actions.ts`, the server action `setSupport`: same origin, then `withSession`, then the rules and the limit's bump in one transaction, then the public cache tags |
| `src/db/supportStore.ts` | The Prisma `SupportStore` (#94): finds a public idea by number, copies the user, bumps the counter, and sets or removes the support (`createMany` with `skipDuplicates`, so double taps leave one row) |
| `src/core/actionLimit.ts` | The abuse limit shared by support, participate, and follow (#94): `ACTION_LIMIT` (60 a minute), `windowStart(now)`, `checkActionCount(count)` |
| `src/db/actionLimit.ts` | `bumpActionCount(db, userId, now)` (#94): counts a change in the student's current minute with an upsert-and-increment, trims older rows, returns the count |
| `src/db/boardSettingsStore.ts` | The Prisma `BoardSettingsStore` (#58): writes a board's `reviewDueDays` |
| `src/db/reviewQueue.ts` | `reviewQueue` and `reviewQueueCount` (#58): pending posts for `boardsFor(viewer, "review")`, oldest first, with each post's `dueAt` from its board's setting. The count is the red number on the tab. `recentlyApproved` (#59) lists ideas approved in a window on those boards, for Take down from the queue |
| `src/db/leaderIdea.ts` | `leaderIdeaByNumber` (#59): an approved idea read for a leader, or null for anyone who would get the student shape. Never cached; the idea page's "For SGA leaders" panel reads it |
| `src/core/reviewText.ts` | `dueText` and `reviewerLabel` (#59): the queue's due text and the reviewer badge words |
| `src/core/cacheTags.ts` | The public cache tag names, `ideas` and `idea:<number>` (#58). The public pages (#60) cache under them and the review actions refresh them |
| `src/db/sql/lockIdeaNumbers.ts` | The transaction-scoped advisory lock that serializes public number assignment (#58) |
| `prisma/seed.ts` | `npm run db:seed` (`prisma db seed`): invented data for local and test only, through `src/db/seed.ts` |
| `src/db/testing/seededTransaction.ts` | `withSeed()`: a rolled-back transaction with the seed written in, for database tests (#44) |
| `src/db/testing/countQueries.ts` | `withCountedSeed()`: the same, on a client that counts queries, for "a fixed number of queries, not one per idea" tests (#60) |
| `prisma.config.ts` | Prisma CLI config: migrations path, the seed command, and the direct URL read through `databaseUrls()` in `src/env.ts`, with a placeholder for offline commands |
| `scripts/verify.mjs` | `npm run verify` and its tiers |
| `scripts/check-styles.mjs` | The style guard: no arbitrary Tailwind values, no radius or shadow classes outside the tokens, no hex colors |
| `scripts/check-deps.mjs` | The dependency check (#119): high or critical advisories fail, major-version gaps are listed. `npm run deps:check` |
| `.github/workflows/dependencies.yml` | Runs the dependency check weekly and by hand. Not on pull requests, not in `verify` |
| `scripts/port-*.mjs` | Port's scripts, copied verbatim from the plugin. Excluded from lint and Prettier; never edit by hand |
| `tests/browser/` | Playwright tests against the production build (Chromium, iPhone WebKit; Firefox in `verify:all`) |
| `src/components/` | The real UI components, presentational: state comes in as props. Idea card, status label, tags, support pair and squares, button, fields, tabs and badges, queue row, board filter chips, ideas list filters, site header with the list links (its tab look comes from `tabLook.ts`, a plain module so server components can call it), copy link, the share dialog (`ShareDialog`: link, poster, flyer) with `Flyer` and `QrCode`, the participate confirmation (`ParticipateDialog`, on Base UI), and the loading placeholders. `useOrigin` gives the site address in the browser. For the review screens (#59): `DecisionSheet` (the queue's decision drawer), `TakeDownDialog`, `LeaderIdeaPanel`, `PosterLine` (who posted, one wording everywhere), and `ReviewerTag` in `Tag.tsx` |
| `src/app/_ideas/` | `useLocalTaps`, which holds Support and I'll participate taps in the page and shows their toasts until E6 saves them. `data.ts` is the pages' one entry: `listWall()` and `getIdea(n)`, cached with named tags, reading the database through `src/db/publicIdeas.ts` (#60). `sample.ts` is the stand-in (the playground's sample ideas), used only when `APP_ENV` is local or test and `DATABASE_URL` is unset (`source.ts`, `usesSampleIdeas`). `present.ts` turns a record into card and page data, `tags.ts` names the cache tags, and `refresh.ts` has `refreshPublicIdea()` for writers. `filter.ts` has the filter and sort rules, plain functions the browser and server share, and `Wall.tsx` with `IdeaWall.tsx`: the server loads the public ideas once and the wall filters them in the browser, so search, sort, and chips redraw only the cards with no request (#61, #63) |
| `src/app/_share/` | The share poster image (#64): `posterImage()` draws it with `next/og` from the idea's text, with the vendored fonts in `fonts/` (OFL) and board colors read from `design/tokens.css`. Served by `/ideas/[number]/poster`; the printable flyer is `/ideas/[number]/flyer` |
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
- **Overlays use Base UI, styled by us.** Base UI gives focus trapping, Escape, and focus return; the look is a named class in `globals.css` (`.sheet`, `.sheet-backdrop`). A dialog that confirms an action opens only when the action has a handler, so it never confirms a tap that does nothing (`SupportPair`, #67).
- **Loading placeholders are transparent text in the real element's classes** (`Placeholder.tsx`, #73), so each bar has that element's line height. The region sets `aria-busy`, the shapes are `aria-hidden`, and a `sr-only` line says what is loading.
- **A link to another page carries `transitionTypes={PAGE}`** (`src/components/pageTransition.ts`), so it rises into place (#73). Filter links and chips do not: they update the URL without animating the page. Next keeps the previous page in the DOM, hidden, for Back, so browser tests scope duplicated controls with `.filter({ visible: true })`.
- **Small confirmations are toasts.** Call `useToast()` (`src/components/Toast.tsx`, on Base UI) with a title, an optional description, an optional action such as Undo, and the idea's board. Never write an inline "Copied" message or a new popup. `ToastProvider` is in the root layout.
- **An idea's accent is its board's color.** Put `data-board` and `board-accent` on the element, and everything inside that uses the accent (`bg-accent`, `text-accent-text`, the tab underline) takes the board's color. Dialogs are portaled out of the page, so a dialog about an idea sets them on its own popup (`ShareDialog`, `ParticipateDialog`).
- **Streamed content rises in with `Reveal`.** Wrap a Suspense boundary's content in `<Reveal>` and its fallback in `<Reveal.Out>` (#73).
- **Exported shapes:** a component's data type is exported as `<Name>Data` (`IdeaCardData`, `QueueRowData`); its props type stays local as `Props`.

- **Core rules return a result and the rows to write.** A rule in `src/core/` takes plain input and `now`, returns `{ ok, value | error }` with the patch and any rows to write, and never throws, writes, or reads the clock (`src/core/ideaStatus.ts`).

- **Who is signed in:** call `getSession()` from `src/auth/session.ts` inside `<Suspense>` (it reads cookies, so the page is never cached). Never read the cookie, positions, or SGAuth directly. Roles come from `session.roles`; who counts as a leader comes only from `isSgaLeader` (#45).
- **A leader-only page names itself only inside the boundary.** Outside `<Suspense>`, keep only `<SiteHeader />` and layout. The heading, copy, and fallback text that say what the page is render after the role check, because the static shell streams with a 200 before `notFound()` runs (`/queue`, #158).

- **Signed-in pages and actions:** a signed-in page calls `requireSignedIn("<its path>")` from `src/auth/gate.ts` inside `<Suspense>` (a server component cannot read its own URL, so it passes the path). A signed-in server action is exported as `withSession(async (session, ...args) => ...)`, and its caller switches on the `signed_out` code. Only `/sign-in` and `src/auth/` know how sign-in starts. Any `next` value is untrusted and goes through `safeNextPath` (#93).

- **Who may do what:** call `can()` from `src/core/permissions.ts`. Never check `roles.leads`, `roles.vpCampusAffairs`, or `isSgaLeader` directly to allow an action. Who posted goes through `canSeeWhoPosted`, never `see_names` alone (#52).

- **Core takes a `Clock`,** or a plain `now: Date`, and never reads the time (`src/core/clock.ts`). Lint bans `Date.now()` and `new Date()` with no argument in `src/core/` except in `clock.ts`. Tests pass `createFakeClock()` from `src/testing/fakeClock.ts` and `advance` it (#43).
- **Tests send email only through a capturing mailer.** Call `sendEmail(mailer, message)` with `createCapturingMailer()` and read `mailer.sent`; `failNext(error)` makes the next send fail for retry tests (#43).
- **Database tests** use `describeWithDatabase` and `withRollback` from `src/db/testing/database.ts`, and never commit. Each run gets its own database, made and dropped by `globalSetup.ts`. Never point a test, migration, or seed at a host `assertSafeDatabaseTarget` does not allow, and drop only through the run registry (#104). Build rows with the factories in `src/db/testing/factories.ts`, which are typed as Prisma create inputs (#43).

- **Leader extras on a public page** sit in their own `<Suspense>` boundary that reads the session and an uncached leader read, rendering nothing for students, so the public part stays cached and identical for everyone (#59).

- **A student action (support, participate, follow) calls `bumpActionCount` and `checkActionCount` in the same transaction as its write** (#94), so every change shares one limit.

- **Notifying followers:** a write that should email followers (a status change, an update) calls `queueFollowerEmails(tx, event)` from `src/db/outbox.ts` inside its own transaction, and passes one event per change. Starting or delivering an idea also writes a system update; pass only the status event so followers get one email, not two (#101).

Still to add, no later than the fifth feature: one hook per feature and the validation helpers.

## 3. Data and integrity

- **Migrations (#44):** additive only, and a committed migration is never edited. To change the schema, run `npx --no-install prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --output prisma/migrations/<timestamp>_<name>/migration.sql` against a migrated database, or write the file by hand. A view change needs a new `CREATE OR REPLACE VIEW` migration and the same edit to `prisma/views/public/idea_stats.sql`; `src/db/migrations.test.ts` fails until they match. Run `npm run db:migrate` and `npm run db:seed` with `DIRECT_URL` (or `DATABASE_URL`) exported in the shell, like the database tests. The seed refuses any `APP_ENV` but `local` or `test`.
- **Environment:** read only through `env()` in `src/env.ts`. Add each variable to the zod schema, to `.env.example`, and to `src/env.test.ts` with the feature that first needs it. The one exception is `next.config.ts`'s build-time `APP_ENV` check (commented there).
- **Validate everything from outside our code with zod:** SGAuth responses, Resend webhooks, and every student submission. Validate on read as well as on write. Repair what can be repaired, record what was repaired, never silently drop anything. One set of shared validation helpers; no local copies (`docs/dev-process.md`).
- **Prisma rules** (shared selects, `idea_stats` for counts and rank, additive migrations, no TypedSQL) are in `CLAUDE.md`, "Database rules." Each raw query in `src/db/sql/` has a test named `*.db.test.ts`. These skip, with a printed reason, when `TEST_DATABASE_URL` is unset, and run in CI's own `database` job against the Neon test branch, one at a time. To run them locally, use a local Postgres that matches the Neon major version:
  1. `brew install postgresql@17`, then `brew services start postgresql@17`.
  2. `export TEST_DATABASE_URL=postgresql://localhost:5432/postgres` in your shell; Vitest does not read `.env.local`.
  3. `npm run test:database`.

  Each run creates `hp_test_<worktree>_<random>`, migrates it, checks it for drift against `prisma/schema.prisma`, and drops it, so worktrees can run at once. Only localhost is accepted locally. A killed run leaves its database behind and nothing sweeps it: `dropdb hp_test_...` by hand.

## 4. Security

- **The sign-in stand-in runs only when `APP_ENV` is `local` or `test`.** `src/env.ts` refuses to start otherwise, and `src/env.test.ts` checks every other environment. The stand-in page is `.dev.tsx`, and `startStandInSession` also refuses when `AUTH_STAND_IN` is off.
- **Public, but not searchable.** Every response sends `X-Robots-Tag: noindex` (`next.config.ts`) and the root layout sets `robots: { index: false }`. `tests/browser/site.spec.ts` checks both for every path in `PAGES`.
- **Viewer shapes and same-origin writes** are in `CLAUDE.md`, "Architecture rules." A test must fail if a private field reaches the student shape.

- **Dependencies (#119):**
  - High and critical advisories fail the weekly run. Fix each in its own pull request (bump, or an `overrides` entry for a transitive one when no parent release fixes it yet), and file an issue the same day the run fails.
  - Moderate and low advisories are counted in the report and do not block. Look at them when the package is updated for another reason.
  - Major-version gaps are information. A major update, or replacing a deprecated package (shown in `npm install` warnings or as out of support upstream), gets its own issue and pull request, one package or one tightly coupled family per pull request (for example, `eslint` with `eslint-config-next`).
  - Exact pins stay exact: update by changing the pinned version, never by switching to a range. Prisma stays on 7.10.x; never install it unpinned (see `CLAUDE.md`, "Database rules").
  - Run it locally with `npm run deps:check`. It needs the network, so it is not part of `verify`.

## 5. Accessibility

- **Every field has a visible `<label>`.** Hints and errors are linked with `aria-describedby`, and an error sets `aria-invalid` (`src/components/Field.tsx`). Errors say what to fix.
- **Toggle buttons use `aria-pressed`;** icon-only buttons have `aria-label` and `title` (`SupportPair`). Decorative icons are `aria-hidden`.
- **A visual-only display has a text alternative:** `SupportSquares` is `role="img"` with an `aria-label` and the count in text; `Badge` has an `aria-label`.
- **Tabs** use `role="tablist"`, `role="tab"`, and `aria-selected` (`src/components/Tabs.tsx`).
- **Focus and motion are global** in `globals.css`: a 2px `--focus` outline on `:focus-visible`, and near-zero animation under `prefers-reduced-motion`. Do not remove an outline or add motion that ignores the media query.
- **Contrast:** every text and background pairing meets WCAG AA in light and dark mode. The pairings are in `docs/DESIGN.md`.

## 6. Performance

- **Explicit caching only.** `cacheComponents` is on (`next.config.ts`), so data is dynamic unless cached with `use cache` and a named cache tag. Signed-in and SGA pages are never cached.
- **Query count is tested per page:** one query per idea fails. `publicIdeas.db.test.ts` counts the list's queries with `withCountedSeed()` and checks the count does not grow with more ideas (#60).
- **Caching pattern for public reads (#60):** `use cache` with named tags lives in `src/app/` (`src/app/_ideas/data.ts`), never in `src/db/`. The cached function returns plain data with ISO times. Read `now` outside the cache, after the caller's dynamic access, so "updated N days ago" never freezes. A server action that changes what the public sees calls `refreshPublicIdea(number)` (`src/app/_ideas/refresh.ts`).

## 7. Quality bar

- **TypeScript is strict** with `noUncheckedIndexedAccess`, `noImplicitOverride`, and `noFallthroughCasesInSwitch` (`tsconfig.json`). Map a closed set with `Record<Union, ...>` so a new member fails to compile (`STATUS_LABELS`, `BOARDS`, `VARIANTS`).
- **Prettier** at width 110 with the Tailwind class sorter; ESLint with zero warnings. `npm run format` and `npm run lint:fix` fix most of it.
- **Comments explain why and cite the issue,** for example `// ... (#29)`. Match the comment density around them.
- **Tests sit beside the code:** `*.test.ts` (unit, Node), `*.test.tsx` (component, jsdom), `*.db.test.ts` (database, needs `TEST_DATABASE_URL`; required in CI's `database` job), `tests/browser/*.spec.ts` (Playwright). The top `describe` names the feature and cites the issue: `describe("environment (#26)", ...)`.
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
