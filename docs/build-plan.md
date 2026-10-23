# Build plan (proposed)

**Tracking:**
- Each task has acceptance criteria.
- Tasks are grouped into epics in `feature-map.md`, and become GitHub issues in `SGAOperations/husky-proposals` (see `dev-process.md`). This file is the plan. The issues are the live backlog.
- Task numbers stay fixed even when a task moves to another week, so references do not break.

Updated October 22, 2026: the sign-in and email spikes are answered, and scalability, testing, and governance tasks are added.

Rebaselined October 23, 2026, to launch on Thursday, December 3, 2026. The code has not started, so the old dates no longer held.

## Calendar

From the registrar's 2026-2027 academic calendar: fall break is November 25 to 29, classes resume November 30, the last day of classes is December 13, and finals run December 14 to 20. Spring classes start January 13, 2027.

| Week | Dates | Build (epics from `feature-map.md`) | Gates and decisions |
|---|---|---|---|
| 0 | Oct 23 to 25 | Planning: port runbook, this plan, the schema draft and FigJam diagrams (T0.10, steps 1 to 3) | |
| 1 | Oct 26 to Nov 1 | E1 scaffold, test harness, CI, port (T0.3, T0.4, T0.11). E2 schema and rules module (T0.5). E3 sign-in stand-in (T0.6). Specs and `/port:scope` for E4, E5, and E9 | D9 (appeals) answered, for the decline message in E4 |
| 2 | Nov 2 to 8 | E4 posting and review (T0.7, T0.8). E5 public browsing. E9 outbox and worker | Checkpoint, Sunday Nov 8 |
| 3 | Nov 9 to 15 | E6 student actions. E7 SGA queue and decisions. E9 decision emails. E10 monitoring and backups (T3.1) | D16 (who sees names) decided, for E8. SGAuth milestone 2 expected. Checkpoint, Sunday Nov 15 |
| 4 | Nov 16 to 20 | E8 updates and names. E9 digests, preferences, and bounces. Switch `proposals-dev` to SGAuth (T2.5). Student test (T2.6). Accessibility pass (T2.7) | **Feature freeze, Friday Nov 20** |
| 5 | Nov 23 to 24 | Load test (T3.2), restore test (T3.1), fixes from the student test, reviewer training (T3.4). Release `v0.9.0` to `main` | |
| Break | Nov 25 to 29 | Fall break. No planned work. Buffer only | SGAuth milestone 3 live by Sunday Nov 29 |
| 6 | Nov 30 to Dec 2 | Soft launch to SGA members and the five boards (T3.3). Fix what breaks | Data policy (D14) in place before launch |
| 6 | Thu Dec 3 | **Launch, `v1.0.0`** (T3.5, T3.6), announced to students | |
| 7 | Dec 3 to 13 | The last class days. Small fixes and hotfixes only | |
| Finals | Dec 14 to 20 | Change freeze except production breakage | |

**Why December 3:** it leaves two weeks of classes before finals for students to find and use the site. Launching during finals would get little use, and reviewers would struggle to keep the 3-day review target.

**Capacity:** about 45 pull requests in four build weeks, about 11 a week, with one developer. This fits only if port does most of the implementation and Luis's time goes to plan gates, review, and merging. The checkpoints exist to cut early instead of at the freeze.

## Checkpoints and cuts

Cut December scope in this order. Each line says what is lost.

1. **The "as it happens" email option.** Weekly digests only.
2. **The similar-idea warning** on the post form. Reviewers catch duplicates instead.
3. **Update templates and the preview** of what students see. Updates are plain text.
4. **Rank within the board.** Show the support count and squares only.
5. **Remembered signed-out taps (T1.9).** A signed-out tap goes to sign-in and returns to the idea page, and the student taps again.
6. **Follow and follower digests.** Keep emails about a student's own post and reviewer reminders. This is the last cut before moving the date, since email to followers is a Must in the PRD.

**When to cut:**
- **Sunday Nov 8:** if E4 and E5 are not merged into `dev`, cut 1 to 3.
- **Sunday Nov 15:** if E6 and E7 are not merged, also cut 4 and 5.
- **Friday Nov 20 (freeze):** anything not merged moves after launch. If follower email does not work end to end on `proposals-dev`, cut 6.

**Never cut:** the review step, anonymous posting and the privacy tests, `noindex`, backups with a tested restore, and the switch to turn off posting (see `feature-map.md`).

**Already after December, unchanged:** the volunteer check-in cadence, the monthly summary, the share image and flyer, the promoted area, export, a link to Senate, and club endorsements.

## The SGAuth gate

Students cannot sign in until SGAuth milestone 3 is live in production (`sgauth-integration.md`). As of October 23, SGAuth has pull requests open for #40, #68, #32, and #115. There are none yet for #30, #31, #114, #37, or #103.

- **If milestone 2 is not done by Monday Nov 16,** `proposals-dev` stays on the stand-in, and the switch (T2.5) moves to Nov 23 and 24.
- **If milestone 3 is not live by Sunday Nov 29,** December 3 becomes an SGA-only pilot on `proposals-dev`, with SGA members on the auth-dev allowlist. The student launch moves to the start of spring classes, the week of January 13, 2027.
- **If SGAuth is still on 100 emails a day at launch,** announce to students in stages (D17, D19).

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

**T0.4 Test harness.** Test runner, a Neon test branch, factories, invented fixtures, a mailer that captures emails, and a fake clock.
- `npm run verify` runs locally and in CI in under 5 minutes.
- No test touches a real external service.

**T0.5 Schema.** Migrations for the entities in `data-model.md`.
- Migrations apply cleanly.
- Seed data comes from the prototype's sample ideas.

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

**T2.1 Updates.** Post an update with templates and a preview of what students see. Flag in-progress ideas with no update in 14 days.

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

**T2.5 Switch to SGAuth.** When SGAuth milestone 2 lands, replace the stand-in on `proposals-dev`.
- Register the product and subdomains.
- Get test accounts on the auth-dev allowlist.

**T2.6 Test with students.** Five students on their phones, thinking out loud. Fix what confuses them.

**T2.7 Accessibility pass.** Keyboard, focus, contrast, reduced motion, and screen reader checks.

## Milestone 3: launch (Nov 23 to Dec 20)

**T3.1 Monitoring and backups.**
- Quota alerts at 50%, 70%, and 85% for Neon, email, and Vercel.
- An uptime monitor and error tracking.
- A nightly encrypted database backup, with one restore tested.

**T3.2 Load test.** k6 against `proposals-dev`:
- 2,000 visits in an hour;
- 200 supports on one idea within a minute;
- a weekly digest to 1,500 students.

Record response times, compute hours used, and SGAuth calls.

**T3.3 Soft launch** (PRD D17), staged to keep sign-ups under SGAuth's email limit unless SGAuth has moved to a paid plan. Then fix problems.

**T3.4 Train chairs and directors.** A one-page guide for reviewers and for posting updates. Include the confidentiality rules for advisory boards and for names.

**T3.5 Launch checklist.**
- SGAuth milestone 3 is done.
- The email plan is decided.
- There is a way to turn off posting.
- There is a contact address on the site.

**T3.6 Launch to all five boards.**

## After December

- The volunteer check-in cadence.
- The monthly summary, as a section of the SGA Monthly Newsletter.
- The share image and flyer.
- The promoted area.
- Export for administration.
- A safe way to merge duplicate ideas (with a reason, a notice to supporters, and undo).
- A link to Senate (Sense of the Senate or Senate Resolution).
- Club endorsements.
- Pending actions for unconfirmed accounts (rejected for version 1; revisit).
