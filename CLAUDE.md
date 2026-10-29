# Husky Proposals (working title)

Read this file first. It is the short version. The full detail is in `docs/` and `reference/`.

## What this is

A website where any student at Northeastern can post an idea for campus (anonymously if they choose), support ideas they care about, offer to help, and follow what happens next. Student Government Association (SGA) boards and committees pick ideas to work on, usually one or two at a time, post updates, and reach out to students who offer to help.

It is an executive-side tool for SGA. It builds evidence of student demand and a path from interested student to SGA member. It does not replace Senate resolutions. Support is information and leverage for a board, not a binding vote.

## Who you are working with

Luis Sarmiento, Vice President of Campus Affairs at SGA, is the primary developer and directs the product, alongside stakeholder feedback.

- He is a computer science student and a working developer.
- Be direct. Note concerns briefly instead of belaboring them.
- Ask before making big structural choices.
- Do not use em dashes in docs or user-facing copy.

The repository, `SGAOperations/husky-proposals`, is owned by SGA Operations (Digital Innovation). All changes go through pull requests.

## Read these, in this order

**In the repository:**
1. This file. It holds the product rules, stack, and working rules.
2. `docs/data-model.md` has the proposed entities, states, rules, viewer shapes, and permissions.
3. `docs/timeline.md` has the dates by epic and the checkpoints. **To answer "what's due today," read it first** (its "Today, in short" section says how).
4. `docs/feature-map.md` has the epics. `docs/build-plan.md` has the tasks with acceptance criteria.
5. `docs/dev-process.md` explains how work is planned, built, tested, and recorded.
6. `docs/sgauth-integration.md` covers sign-in through SGAuth and what SGAuth must finish.
7. `docs/scalability.md` covers design targets, email, database, and limits.
8. `prototype/concept-2.html` is a clickable prototype. Open it in a browser, and use the switch at the top to flip between the student view and the SGA view. It is the reference for layout and wording.
9. `design/wireframes/` and `design/tokens.css` are for look and feel.
10. `reference/` has the SGA Constitution and Bylaws.

**Local only:** these are gitignored and kept by Luis, because they hold internal deliberation. Ask him when you need a decision from them.
- `docs/PRD.md` is the source of truth for what to build and why, with the decision log.
- `reference/governance-notes.md` covers what the Constitution and Bylaws require.
- `docs/prototype-vs-prd-gaps.md` lists where the prototype is out of date. Its key points are summarized below.

If the PRD and the prototype disagree, the PRD wins.

### Prototype caveats

The prototype predates several decisions. Reuse its layout, spacing, components, and wording. Do not copy its logic, which uses sample data held in memory.

- **Missing from the prototype:**
  - the review step: pending and declined posts, with edit and resubmit;
  - anonymous posting and its notice;
  - leaders seeing names;
  - email;
  - real sign-in;
  - the "From SGA" tag and "Updated N days ago";
  - a reviewer badge.
- **Behavior to change:**
  - flag in-progress ideas that miss their board's update cadence (monthly by default, set per board), not a fixed 30 days, and offer a one-tap "Still working, no news" update;
  - rank wording must not read as a promise;
  - the "ready for review" threshold is a guide, not a rule;
  - the board guideline is soft: 2 ideas, where a large idea counts as 2, with a heads-up and a confirm.
- **Removed on purpose:** merge, reroute, and flag buttons. Do not add them back.

## Product rules that must not be broken

- **Support informs, it does not bind.** Never write copy that promises action. Say that support helps SGA decide. Never call ideas or support "petitions."
- **Every new post is reviewed before it shows.** The board's chair or director, or the VP of Campus Affairs, reviews within 2 to 3 days. A declined post gets a written reason, and the student can edit and resubmit.
- **Privacy.**
  - Support counts are public.
  - Which students supported an idea, and who posted, is visible to SGA leaders only.
  - A student can post "anonymous to students": other students see no name. Only the board's reviewer and the VP of Campus Affairs see who posted it, and the form says so.
  - Tell students this plainly on the site.
- **Public, but not searchable.** Anyone with the link can browse approved ideas without signing in. Every page sends `noindex`. Pending and declined posts are never public.
- **No dashboards.** SGA leaders open straight onto the list. Small red numbers on the tabs show what needs attention.
- **Plain language.** Say "in progress," never "slots." Say boards usually work on 1 to 2 ideas at a time. This is a soft guideline with a heads-up, not a hard limit.
- **Honest status.** Students always see where an idea stands and why it is waiting. Advisory boards (DAB, CPAB) must not reveal confidential administrative initiatives in updates.
- **Support is unlimited.** One support per student per idea. Students act freely. The only visible limit is 3 pending posts per student.
- **The board is the only thing SGA can change on a posted idea.** No merge, reroute, or flag buttons in the app.
- **Ideas that matter to a smaller group** get extra consideration, handled by leaders outside the app.

## Statuses

- Review status of a post: `pending`, `approved`, `declined`.
- Idea status once approved: `collecting_support`, `under_review`, `in_progress`, `delivered`, `waiting` (with a reason students see).

## Scope

Version 1 covers the five Campus Affairs boards:
- DAB (Dining Advisory Board)
- CPAB (Campus Planning Advisory Board)
- CSC (Campus Services Committee)
- GIB (Green Initiatives Board)
- SC (Sustainability Committee)

Targets (see `docs/timeline.md`):
- **SGA soft launch,** November 30 to December 13, 2026, on `proposals-dev` for SGA members and the five boards.
- **Student launch,** proposed for January 20, 2027, the week after spring classes start.

**Soft launch scope:**
- sign-in;
- posting with the anonymous option;
- the review queue with reasons;
- the ideas list and filters;
- support;
- the idea page;
- status and updates;
- the SGA queue;
- start, hold, and deliver;
- update reminders (flag an in-progress idea that misses its board's cadence);
- email to followers;
- the "I'll participate" tap with a simple list of names;
- a copy-link share.

**Winter break, before the student launch:** the tabling form on each idea page (estimated at the November 20 freeze), the promotion switch (off by default, only if feedback asks for it), and spring launch prep.

**Later:**
- the volunteer check-in cadence (cut first if time runs short);
- the monthly summary (in the SGA Monthly Newsletter);
- the share image and flyer;
- export;
- a link to Senate;
- club endorsements.

## Roles

Roles come from SGAuth positions. See `docs/sgauth-integration.md` for the key-to-board table.

- **Visitor:** anyone with the link can browse approved ideas.
- **Student:** any signed-in undergraduate.
- **SGA leader:** can see who posted and who supported. Exactly who counts is still open (PRD D16). Only the Executive Board has a written confidentiality duty, so see `reference/governance-notes.md`.
- **Reviewer:** the chair or director of a board for that board's posts, and the VP of Campus Affairs for all boards.
- **VP of Campus Affairs:** sees all five boards. A chair or director sees only their own board.

## Stack

Decided October 22, 2026 (PRD D20, with reasons and what was turned down in the decision log).

| Layer | Choice |
|---|---|
| App | Next.js App Router, TypeScript (strict) |
| Database | Neon Postgres, a project in the SGAOperations Neon org |
| Database access | Prisma 7 with the Postgres adapter: pooled connection at runtime, direct connection for migrations |
| Sign-in | SGAuth, through `@sgaoperations/sgauth`. A dev-only stand-in until the SDK ships |
| Email | Resend, behind a provider-neutral `sendEmail()` and an outbox |
| Hosting | Vercel at `proposals.northeasternsga.com`, with previews at `proposals-dev.northeasternsga.com`. The plan (Hobby or a team plan) is still to confirm with Eli |
| Scheduled jobs | GitHub Actions calling secret-protected routes (no Vercel cron) |
| Styling | Tailwind 4 with its default theme reset, so only our tokens exist (`design/tokens.css` mapped through `@theme`). Base UI for unstyled, accessible primitives. No shadcn styling. Decided October 23, 2026 (#20) |
| Validation | zod for every input and every outside response |
| Tests | Vitest (logic and components), Playwright (browser), k6 (load) |
| Backlog | GitHub Issues with port |

SGAuth's repository is a useful reference for plumbing (environment validation, Neon connections, scheduled jobs, test branches), but not automatically the model to copy.

### Architecture rules

- **Core logic lives outside the framework.** The review state machine, permissions, viewer shapes, and the email queue are plain TypeScript modules with plain unit tests. Next.js routes and server actions only receive requests and call them.
- **Viewer shapes.** What a viewer may see is decided by one function of the viewer and the idea. Visitors and students get the student shape. Leaders get more depending on their role (a chair sees their board, the VP sees all). Every shape is built from an explicit Prisma field list, never a whole row. A test fails if a private field reaches the student shape.
- **Explicit caching only.** Public pages are cached with named tags, refreshed when the data changes. Signed-in and SGA pages are never cached. Do not rely on implicit fetch caching.
- **Writes go through server actions** with zod-validated input. The SGAuth cookie is shared by every SGA subdomain, so state-changing requests must come from our own origin.
- **Environment variables** are read only through one validated module. The app refuses to start if one is missing.

### Database rules (Prisma)

- **Reuse before you write a query.** Shared field lists per viewer (`studentIdeaSelect` and so on), shared filters (`isPublic`), and named queries as client extensions all live in `src/db/`. Check them with `satisfies Prisma.<Model>Select` or `WhereInput`.
- **Counts and rank come from a database view** (`idea_stats`), created in a hand-written migration and mapped as a read-only Prisma model. Do not compute rank with raw SQL in app code.
- **Raw SQL only in `src/db/sql/`, as tagged `$queryRaw`** with results parsed by zod, for example `claimOutboxBatch.ts` (`FOR UPDATE SKIP LOCKED`). Never use `$queryRawUnsafe`. No `$queryRaw` outside `src/db/sql/`. A lint rule enforces this. Each query has a test against the Neon test branch. We do not use TypedSQL: it needs a live database to generate types, which port's agents do not have (decided October 23, 2026).
- **Validate untyped results with zod.**
- **Watch the SQL.** Log queries in development. A test counts queries per page, so one query per idea fails.
- **Migrations are reviewed and committed.** Never edit a committed migration. Changes are additive first: add a column, then drop the old one in a later release.
- **Prisma is pinned to 7.10.x.** npm's `latest` tag points to an 8.0 release candidate, so never install it unpinned. Prisma 7 needs Node 20.19+, 22.12+, or 24+ (not 23).
- **If Prisma's gaps grow,** the Kysely extension for Prisma is the planned fallback. Ask before adding it.

## Working rules

- **GitHub Issues are the only backlog.** File agreed work as an issue. One issue is one small pull request in the port lane. UI work can go through the sidecar lane, batched into one pull request every day or two. Viewer shapes, permissions, the review state machine, migrations, and privacy tests never go through the sidecar. See `docs/dev-process.md`, "Two lanes."
- **Before starting an issue,** read it. If it has a catch, say so in two or three lines first.
- **Side tangents:** confirm once, then file an issue and move on. Do not fix unrelated problems inline.
- **Test-first:** write the failing test, see it fail for the right reason, then write the code.
- **Run `npm run verify` before opening a pull request.** CI runs the same command.
- **Reuse before you build.** Check the Patterns list in `docs/ENGINEERING.md` before adding a component, hook, or helper.
- **Comments explain why,** and cite the issue number.
- **Read a failure before rerunning.**
- **The UI must not look generated.**
  - Use the frontend-design skill for all UI work.
  - Build from `design/tokens.css` and the prototype's layouts, not component-library defaults.
  - Never hardcode a value a token covers: no arbitrary Tailwind values (`rounded-[7px]`, `p-[13px]`), no hex colors in components. Corners come only from the radius tokens. A guard test enforces this.
  - Try new layouts and looks on the playground page (T0.3b) before building a screen.
  - Avoid generic AI-app patterns: gradient heroes, rounded pill cards, emoji icons, filler copy.
- **Tools and planning order:** see `docs/dev-process.md`.
  - Tickets are GitHub Issues.
  - Feature specs go in `docs/features/`.
  - The data model's source of truth is `prisma/schema.prisma`.
  - Review diagrams live in FigJam.
  - Executive summaries are local Word documents.
- **Issues are public.** Write them at the implementation level. Internal reasoning stays in local documents.
- **After opening a pull request in an interactive session,** open it in Luis's browser right away (`gh pr view <n> --web`). Do not open issues; give the link. Port's background agents skip this.
- **Docs-only changes go through the docs sidecar** (umbrella issue #22): commit to its branch and merge in a batch pull request every day or two. No separate issue and pull request per docs change.

## Run it

- **Node 22** (`.nvmrc`). Prisma 7 does not support Node 23, and npm refuses to install on it here. If your default Node is another version: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`, or use nvm.
- **First time:** `npm install` (also generates the Prisma client), then `cp .env.example .env.local`. The server refuses to start if `src/env.ts` finds a variable missing or invalid.
- **Develop:** `npm run dev`, then open http://localhost:3000.
- **Style playground:** with `APP_ENV=local` (the `.env.local` default), open http://localhost:3000/playground. It is compiled only for local and test, never into a production build. Templates are data in `design/playground-templates.json`.
- **Check:** `npm run verify` (everything, as in CI), `npm run verify:agent` (no build or browser tests; what port's agents run), `npm run verify:all` (adds Firefox).
- **Fix formatting and lint:** `npm run format` and `npm run lint:fix`.

## Hard rules

- Never commit secrets or real student data. Test data is invented.
- No test touches a real external service. SGAuth, email, and the database have fakes or test branches.
- Student and leader responses are different shapes. Private fields must not be reachable from the student shape. Test this.
- **Branches:** see `docs/dev-process.md`, "Branches and releases."
  - One branch per issue, named `<issue>-<slug>` and cut from `dev`.
  - Features are rebased, then squash-merged into `dev`.
  - Releases go `dev` to `main` as a merge commit, through `/port:release`, never squashed or rebased.
  - Hotfixes branch from `main`, then `main` is merged back into `dev`.
  - Never push straight to `dev` or `main`.
- **Commit subjects:** `#N <imperative lowercase summary>`.
- **Migrations only add in a pull request.** Removals come in a later release.
- **The sign-in stand-in** runs only in local and test. The app refuses to start with it enabled anywhere else.
- This repository is public. Anything committed is public. Never commit the local-only files listed in `.gitignore`, and never quote private conversations or internal budget details in committed files.

## Patterns and where things live

Both live in `docs/ENGINEERING.md`, not here, because port's agents cannot edit this file (see `docs/dev-process.md`, "How we run port"). Update them in the same pull request as the feature.

`docs/ENGINEERING.md` does not exist yet. The scaffold (T0.3) creates it with both sections empty, and `/port:analyze` later merges into it. Until it exists, check the prototype and `design/tokens.css`, and answer the new-feature checklist below yourself.

Patterns are filled in as the first features land, and no later than the fifth feature. List:
- one component per idea;
- one hook per feature;
- the shared rules module;
- the validation helpers;
- a new-feature checklist ("Which component or hook does this extend? Which test fails first?").

## Conventions

- **Keep `docs/PRD.md` current** (local only). When a decision is made or changed, Luis updates these, and the committed docs in the same pull request:
  - the decision log (section 14), with the date and the reason;
  - the open questions (section 8);
  - the changelog (section 16).
- **Plain language.** Write copy in short sentences, with no jargon.
- **Accessibility baseline:**
  - the keyboard works everywhere;
  - focus is visible;
  - WCAG AA contrast;
  - reduced motion is respected;
  - any visual-only display, such as the support squares, has a text alternative.
- **Match `design/tokens.css`, the Poster direction (#29):** each idea reads as a poster in its board's color (Dining red, Planning blue, Services teal, Green green, Sustainability yellow), with big condensed Big Shoulders headlines and Public Sans text. Support and I'll participate are one matched button style. No tape, tilt, or tear-off tabs. Light and dark mode. The poster style (full color, color band, or outline), headline case, corners, and density are being tuned in the playground; once picked, the allowed radii are listed here.
- **Test the review flow and the privacy rules carefully.** They are the riskiest parts.

## Current state (October 29, 2026)

- The scaffold is in (#26): Next.js 16, Tailwind on our tokens, lint and style guards, `verify` with tests on Chromium and WebKit, CI, the environment module, and Prisma generating offline.
- **Next:** the playground (T0.3b), the test harness with a Neon test branch (T0.4), migrations (T0.5), and the sign-in stand-in (T0.6). Dates are in `docs/timeline.md`.
- **To confirm with Eli:** the Vercel plan, the product registration, and the subdomains.
- **Waiting on SGAuth:** see the milestones in `docs/sgauth-integration.md`.
- **Waiting on Luis to raise with Eli:** the email limit proposal (PRD D19).
