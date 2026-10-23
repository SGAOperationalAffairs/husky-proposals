# Build plan (proposed)

**Tracking:**
- Each task has acceptance criteria.
- Tasks are grouped into epics in `feature-map.md`, and become GitHub issues in `SGAOperations/husky-proposals` (see `dev-process.md`). This file is the plan. The issues are the live backlog.
- Task numbers stay fixed even when a task moves to another week, so references do not break.

Updated October 22, 2026: the sign-in and email spikes are answered, and scalability, testing, and governance tasks are added.

Rebaselined October 23, 2026. The code has not started, so the old dates no longer held. Later the same day (#9): December became an SGA soft launch, and the student launch moved to spring.

The dates by epic, with a chart, are in `timeline.md`. Start there to see what is due.

## Calendar

From the registrar's 2026-2027 academic calendar: fall break is November 25 to 29, classes resume November 30, the last day of classes is December 13, and finals run December 14 to 20. Spring classes start January 13, 2027.

| Week | Dates | Build (epics from `feature-map.md`) | Gates and decisions |
|---|---|---|---|
| 0 | Oct 23 to 25 | Planning: port runbook, this plan, the schema draft and FigJam diagrams (T0.10, steps 1 to 3) | |
| 1 | Oct 26 to Nov 1 | E1 scaffold, test harness, CI, port (T0.3, T0.4, T0.11). E2 schema and rules module (T0.5). E3 sign-in stand-in (T0.6). Specs and `/port:scope` for E4, E5, and E9 | D9 (appeals) answered, for the decline message in E4 |
| 2 | Nov 2 to 8 | E4 posting and review (T0.7, T0.8). E5 public browsing. E9 outbox and worker | Checkpoint, Sunday Nov 8 |
| 3 | Nov 9 to 15 | E6 student actions. E7 SGA queue and decisions. E9 decision emails. E10 monitoring and backups (T3.1). SGAuth connection spike (T2.5a) as soon as the session endpoint is on auth-dev | D16 (who sees names) decided, for E8. SGAuth milestone 2 expected. Checkpoint, Sunday Nov 15 |
| 4 | Nov 16 to 20 | E8 updates and names. E9 digests, preferences, and bounces. Switch `proposals-dev` to SGAuth (T2.5) | **Feature freeze, Friday Nov 20** |
| 5 | Nov 23 to 24 | Load test (T3.2), restore test (T3.1), reviewer training (T3.4). Release `v0.9.0` to `main` | |
| Break | Nov 25 to 29 | Fall break. No planned work. Buffer only | |
| 6 to 7 | Nov 30 to Dec 13 | **SGA soft launch** (T3.3) on `proposals-dev`: SGA members and the five boards, signed in through auth-dev. Chairs try reviewing and posting updates. Fix what breaks | |
| Finals | Dec 14 to 20 | Change freeze except production breakage | |
| Winter break | Dec 21 to Jan 12 | E11 tabling form (if the estimate fits), E12 promoted area, E13 spring launch prep | |
| Spring | Wed Jan 20, 2027 | **Student launch, `v1.0.0`** (T3.5, T3.6), proposed | SGAuth milestone 3 live in production. Data policy (D14) in place |

**Why a soft launch in December and students in spring:** classes end December 13, so few students would find the site before finals, but SGA members can use it right away. A spring launch, the week after classes start, gives time for onboarding, for fixes from the soft launch, and for features raised in review, such as the tabling form.

**Capacity:** about 45 pull requests in four build weeks, about 11 a week, with one developer. This fits only if port does most of the implementation and Luis's time goes to plan gates, review, and merging. The checkpoints exist to cut early instead of at the freeze.

**Review is the bottleneck, not coding.** Port writes and self-reviews pull requests quickly; a person still approves plans and merges. To keep the queue moving:
- Review and merge within a day. Block time for it daily.
- If more than 5 pull requests are approved and waiting, start no new tickets in port until the queue clears.
- Budget about 30% of UI time for visual review rounds, and try new layouts on the playground page (T0.3) before a real screen.

**Sign-in setup is slow and fails hard.** Environment variables, secrets, product registration, the auth-dev allowlist, and test accounts all have to line up. That is why the connection spike (T2.5a) comes a week before the switch, and why the soft launch can fall back to the stand-in.

## Checkpoints and cuts

Cut soft-launch scope in this order. Each line says what is lost. A cut item moves to winter break, not out of the product.

1. **The "as it happens" email option.** Weekly digests only.
2. **Update templates and the preview** of what students see. Updates are plain text.
3. **Rank within the board.** Show the support count and squares only.
4. **Remembered signed-out taps (T1.9).** A signed-out tap goes to sign-in and returns to the idea page, and the student taps again.
5. **Follow and follower digests.** Keep emails about a student's own post and reviewer reminders.

The similar-idea check is not on the list. It is a simple word match and stays in.

**When to cut:**
- **Sunday Nov 8:** if E4 and E5 are not merged into `dev`, cut 1 and 2.
- **Sunday Nov 15:** if E6 and E7 are not merged, also cut 3 and 4.
- **Friday Nov 20 (freeze):** anything not merged moves after the soft launch. If follower email does not work end to end on `proposals-dev`, cut 5.

**Never cut:** the review step, anonymous posting and the privacy tests, `noindex`, backups with a tested restore, and the switch to turn off posting (see `feature-map.md`).

**After the soft launch:** the tabling form (E11), the promoted area (E12), the volunteer check-in cadence, the monthly summary, the share image and flyer, export, a link to Senate, and club endorsements. A basic copy-link share is in the soft launch (E5).

## The SGAuth gate

The soft launch runs on `proposals-dev` against auth-dev, with SGA members on its sign-up allowlist, so it needs only milestone 2. Students cannot sign in until milestone 3 is live in production (`sgauth-integration.md`), which gates the student launch. As of October 23, SGAuth has pull requests open for #40, #68, #32, and #115. There are none yet for #30, #31, #114, #37, or #103.

- **If milestone 2 is not done by Monday Nov 16,** `proposals-dev` stays on the stand-in, and the switch (T2.5) moves to Nov 23 and 24.
- **If milestone 2 is not done by Monday Nov 30,** the soft launch runs on the stand-in for SGA members only, with invented test accounts. Real sign-in waits.
- **If milestone 3 is not live by early January,** the student launch moves later than January 20.
- **If SGAuth is still on 100 emails a day at the student launch,** announce to students in stages (D17, D19).

## Milestone 0: foundations (Oct 13 to Nov 8)

T0.3 to T0.6 and T0.11 are week 1. T0.7 and T0.8 are week 2.

**T0.1 Spike: sign-in.** Done.
- Sign-in uses SGAuth: email and password, northeastern.edu sign-up only.
- University SSO is a long-term SGAuth spike (#111), not a launch path.
- See `sgauth-integration.md`.

**T0.2 Spike: email.** Done.
- Resend, behind a provider-neutral `sendEmail()`, with an outbox and a weekly digest by default.
- Still to do: the sending subdomain, and a test send.
- See `scalability.md`.

**T0.3 Scaffold.** Repository setup, formatting and lint, environment config validated at startup, a deploy skeleton, and port setup.
- A "hello" page deploys from the main branch.
- `npm run verify` exists, and CI runs it on every pull request.
- Every page sends `noindex`.
- A lint rule enforces import and layering rules from the start (core modules never import Next.js; no imports that climb more than one folder).
- A playground page, local only, for trying UI pieces before they go into a screen.
- Browser tests run on Chromium and WebKit (iPhone Safari). Firefox runs only in `verify:all`.

**T0.4 Test harness.** Test runner, a Neon test branch, factories, invented fixtures, a mailer that captures emails, and a fake clock.
- `npm run verify` runs locally and in CI in under 5 minutes.
- No test touches a real external service.

**T0.5 Schema.** Migrations from `prisma/schema.prisma`, plus the hand-written migration for the `idea_stats` view and the check constraints noted in the schema.
- Migrations apply cleanly.
- Seed data comes from the prototype's sample ideas.
- `prisma.config.ts` reads the URLs from the validated environment, with a placeholder URL when one is missing for offline commands (`prisma generate`, `prisma migrate diff`). Prisma 7 refuses to run those without a datasource URL, even though they never connect.
- `@updatedAt` columns get no database default; Prisma fills them in. Raw SQL inserts and seed scripts must set them.

**T0.6 Sign-in stand-in and roles.** A development-only stand-in with the same shape as SGAuth's session response, plus the position-to-board mapping module.
- A student, a chair, and the VP can each act as themselves locally and see the right things.
- Swapping in SGAuth later changes one module.

**T0.7 Post an idea.** The form with the anonymous option, a simple similar-idea check, and a limit of 3 pending posts per student.
- A post lands as `pending`. The author can see it. Other students and signed-out visitors cannot.
- Anonymous posts never expose the author in student or public responses (automated test).

**T0.8 Review queue.** Reviewers see pending posts, approve, or decline with a required reason. The author can edit and resubmit.
- Review due dates are set at 3 days. A red number on the SGA tab shows waiting posts.
- A declined post shows the reason to its author only.

**T0.9 Governance asks** (not code; run alongside).
- Ask the Parliamentarian about appeals of declined posts (D9) and the Green Initiatives Board name and chair.
- Ask the VP of Operational Affairs about a data policy that marks identities confidential (D14).
- Bring the D16 options to the Executive Board.
- See `reference/governance-notes.md` (local only).

**T0.10 Planning artifacts** (before feature tickets).
1. A feature map: the December scope split into epics.
2. A draft `prisma/schema.prisma`, with a generated diagram, reviewed in FigJam.
3. FigJam diagrams of the review and idea state machines and the viewer-shape rules.
4. A feature spec per epic in `docs/features/`, each with a local Word executive summary.
5. Each epic broken into sub-issues with `/port:scope`, on the Projects board.

Done when every December epic has a spec and sub-issues on the board.

**T0.11 Port setup.**
- Get maintain access from Operations.
- Run `/port:init` and `/port:analyze`. Commit the config, plus `docs/ENGINEERING.md` built from `CLAUDE.md`'s rules.
- Create the Projects board.

Done when port can plan a ticket end to end.

**T0.12 Move planning documents to SGA's shared Google Drive** (later, low priority).
- Upload the PRD, the executive summaries, and the governance notes.
- Point the local-only references in `CLAUDE.md` at the Drive folder.

## Milestone 1: the core loop (Nov 2 to Nov 15)

**T1.1 Ideas list.** Search, category, status, and sort. Public and cached.
**T1.2 Support.** Writes set the state, never toggle. One per student per idea. Public counts. Instant button response, with rapid taps combined. A script-level abuse limit.
**T1.3 "I'll participate".** Same pattern as support, plus a list of names for leaders.
**T1.4 Idea page.** About, details, progress text, and how to join the board. Public and cached.
**T1.5 Support display.** One square per student, plus rank. Include a text alternative. Use wording that says support helps SGA decide.
**T1.6 SGA queue.** Filters on board, status, and sort. Tab badges for what needs attention.
**T1.7 Decide.** Start working on (with the soft heads-up), mark under review, put on hold with a reason, and mark delivered. Each writes a system update.
**T1.8 Edit board.** The VP can change an idea's board. It writes a system update.
**T1.9 Remember signed-out taps.** A signed-out tap on support, participate, or follow is saved in the browser and applied after sign-in.

Across T1.1 to T1.9, the student view and the SGA view match the prototype's behavior, except where `prototype-vs-prd-gaps.md` (local only; summarized in `CLAUDE.md`) says otherwise.

## Milestone 2: keeping people informed (Nov 9 to Nov 20)

**T2.1 Updates.** Post an update with templates and a preview of what students see. Flag in-progress ideas that miss the board's update cadence (monthly by default, set per board), and offer a one-tap "Still working, no news" update that counts.

**T2.2 Follow and email.** Follow an idea, plus the email outbox, priorities, and the worker.
- Decisions on a student's own post are sent right away.
- Weekly digests are spread across weekdays, with "as it happens" (at most one a day) and "off" as options.
- Emails send once. Failures are logged and retried. Limits delay emails and never drop them.
- A bounce webhook stops sending to bad addresses.

**T2.3 In progress tab.** Students see ideas that are in progress or delivered.

**T2.4 Names for leaders.** Leaders can see who posted and who supported, under the D16 rule. Add the privacy notice for students:
- who can see their name;
- that approved ideas can be seen by anyone with the link but do not appear in search.

Add the access log if it was decided.

**T2.5a SGAuth connection spike** (week 3, as soon as SGAuth's session endpoint is on auth-dev). Prove one real sign-in end to end before the switch.
- Write the environment checklist: every variable and secret per environment (local, preview, `proposals-dev`, production), where each comes from, and who can issue it.
- Register the product and the `proposals` and `proposals-dev` subdomains. Get Luis's account and test accounts on the auth-dev allowlist.
- One signed-in request on `proposals-dev` returns the session shape the stand-in fakes. Note every difference.

**T2.5 Switch to SGAuth.** When SGAuth milestone 2 lands, replace the stand-in on `proposals-dev`.
- Swapping in SGAuth changes one module, as planned in T0.6.
- If it is not working by Friday Nov 27, the soft launch runs on the stand-in for SGA members, and the switch moves to winter break.

**T2.6 Test with students.** Five students on their phones, thinking out loud. Fix what confuses them. SGA members test during the soft launch; the five-student test runs in early January (E13), when students can act on the site.

**T2.7 Accessibility.** Keyboard, focus, contrast, reduced motion, and text alternatives are checked in every UI pull request, not saved for one week. A screen reader pass runs during the soft launch.

## Milestone 3: soft launch, then student launch (Nov 23 to Jan 20)

**T3.1 Monitoring and backups.**
- Quota alerts at 50%, 70%, and 85% for Neon, email, and Vercel.
- An uptime monitor and error tracking.
- A nightly encrypted database backup, with one restore tested.

**T3.2 Load test.** k6 against `proposals-dev`:
- 2,000 visits in an hour;
- 200 supports on one idea within a minute;
- a weekly digest to 1,500 students.

Record response times, compute hours used, and SGAuth calls.

**T3.3 SGA soft launch** (PRD D17), November 30 to December 13, on `proposals-dev`.
- SGA members and the five boards sign in through auth-dev, on its allowlist.
- Chairs and directors review real test posts and post updates. Then fix problems.
- Release `v0.9.0` to `main` before it starts.

**T3.4 Train chairs and directors.** A one-page guide for reviewers and for posting updates. Include the confidentiality rules for advisory boards and for names.

**T3.5 Launch checklist.**
- SGAuth milestone 3 is done.
- The email plan is decided.
- There is a way to turn off posting.
- There is a contact address on the site.

**T3.6 Student launch,** proposed for January 20, 2027, across all five boards. Staged to keep sign-ups under SGAuth's email limit unless SGAuth has moved to a paid plan. `v1.0.0`.

## After the soft launch

The tabling form (E11), the promoted area (E12), and spring launch prep (E13) are planned for winter break, and the monthly summary and export for after the student launch (`timeline.md`). The rest has no date yet:

- The volunteer check-in cadence.
- The share image and flyer.
- A safe way to merge duplicate ideas (with a reason, a notice to supporters, and undo).
- A link to Senate (Sense of the Senate or Senate Resolution).
- Club endorsements.
- Pending actions for unconfirmed accounts (rejected for version 1; revisit).
