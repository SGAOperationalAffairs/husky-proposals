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
3. `docs/build-plan.md` has milestones and tasks with acceptance criteria.
4. `docs/dev-process.md` explains how work is planned, built, tested, and recorded.
5. `docs/sgauth-integration.md` covers sign-in through SGAuth and what SGAuth must finish.
6. `docs/scalability.md` covers design targets, email, database, and limits.
7. `prototype/concept-2.html` is a clickable prototype. Open it in a browser, and use the switch at the top to flip between the student view and the SGA view. It is the reference for layout and wording.
8. `design/wireframes/` and `design/tokens.css` are for look and feel.
9. `reference/` has the SGA Constitution and Bylaws.

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
  - the promoted area;
  - a reviewer badge.
- **Behavior to change:**
  - flag in-progress ideas after **14 days** without an update, not 30;
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
  - A student can post anonymously: other students see no name, SGA leaders do.
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

Target: live by early December 2026, with the exact date still to be set.

**December scope:**
- sign-in;
- posting with the anonymous option;
- the review queue with reasons;
- the ideas list and filters;
- support;
- the idea page;
- status and updates;
- the SGA queue;
- start, hold, and deliver;
- update reminders (flag any in-progress idea with no update in 14 days);
- email to followers;
- the "I'll participate" tap with a simple list of names.

**After December:**
- the volunteer check-in cadence (cut first if time runs short);
- the monthly summary (in the SGA Monthly Newsletter);
- the share image and flyer;
- the promoted area for leader ideas;
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
- **Raw SQL only in `src/db/sql/`, as TypedSQL files**, for example `claimOutboxBatch.sql` (`FOR UPDATE SKIP LOCKED`). Never use `$queryRawUnsafe`. No `$queryRaw` outside `src/db/`. A lint rule enforces this.
- **Validate untyped results with zod.**
- **Watch the SQL.** Log queries in development. A test counts queries per page, so one query per idea fails.
- **Migrations are reviewed and committed.** Never edit a committed migration. Changes are additive first: add a column, then drop the old one in a later release.
- **TypedSQL needs a live database to generate types,** so CI uses the Neon test branch.
- **If Prisma's gaps grow,** the Kysely extension for Prisma is the planned fallback. Ask before adding it.

## Working rules

- **GitHub Issues are the only backlog.** File agreed work as an issue. One issue is one small pull request. See `docs/dev-process.md`.
- **Before starting an issue,** read it. If it has a catch, say so in two or three lines first.
- **Side tangents:** confirm once, then file an issue and move on. Do not fix unrelated problems inline.
- **Test-first:** write the failing test, see it fail for the right reason, then write the code.
- **Run `npm run verify` before opening a pull request.** CI runs the same command.
- **Reuse before you build.** Check the Patterns section before adding a component, hook, or helper.
- **Comments explain why,** and cite the issue number.
- **Read a failure before rerunning.**
- **The UI must not look generated.**
  - Use the frontend-design skill for all UI work.
  - Build from `design/tokens.css` and the prototype's layouts, not component-library defaults.
  - Avoid generic AI-app patterns: gradient heroes, rounded pill cards, emoji icons, filler copy.
- **Tools and planning order:** see `docs/dev-process.md`.
  - Tickets are GitHub Issues.
  - Feature specs go in `docs/features/`.
  - The data model's source of truth is `prisma/schema.prisma`.
  - Review diagrams live in FigJam.
  - Executive summaries are local Word documents.
- **Issues are public.** Write them at the implementation level. Internal reasoning stays in local documents.

## Hard rules

- Never commit secrets or real student data. Test data is invented.
- No test touches a real external service. SGAuth, email, and the database have fakes or test branches.
- Student and leader responses are different shapes. Private fields must not be reachable from the student shape. Test this.
- **Branches:** feature branches merge into `dev` through pull requests. `dev` is released into `main`, which is production. Never push straight to `dev` or `main`.
- This repository is public. Anything committed is public. Never commit the local-only files listed in `.gitignore`, and never quote private conversations or internal budget details in committed files.

## Patterns

To be filled in as the first features land, and no later than the fifth feature. List:
- one component per idea;
- one hook per feature;
- the shared rules module;
- the validation helpers;
- a new-feature checklist ("Which component or hook does this extend? Which test fails first?").

## Where things live

To be filled in once the code is scaffolded. Update this section in the same pull request as the feature.

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
- **Match `design/tokens.css`:** Husky red `#C8102E`, square corners, the system font, flat bordered cards with a 5px accent rule across the top, and light and dark mode.
- **Test the review flow and the privacy rules carefully.** They are the riskiest parts.

## Current state (October 22, 2026)

- The planning docs are written, and the stack is decided. The repository has no code yet.
- **Next:**
  1. Make the first commit (the docs).
  2. Do T0.3 (scaffold) and T0.4 (test harness).
- **To confirm with Eli:** the Vercel plan, the product registration, and the subdomains.
- **Waiting on SGAuth:** see the milestones in `docs/sgauth-integration.md`.
- **Waiting on Luis to raise with Eli:** the email limit proposal (PRD D19).
