# Build plan (proposed)

**Dates and cuts:**
- Dates follow the PRD timeline and assume work began on October 13, 2026. Shift them if the start moved.
- Allow for Thanksgiving week and exam season.
- If time runs short, cut in this order: the volunteer check-in cadence, then the monthly summary, the share image and flyer, and the promoted area.

**Tracking:**
- Each task has acceptance criteria.
- Tasks become GitHub issues in `SGAOperations/husky-proposals` (see `dev-process.md`). This file is the plan. The issues are the live backlog.

Updated October 22, 2026: the sign-in and email spikes are answered, and scalability, testing, and governance tasks are added.

## Milestone 0: foundations (Oct 13 to Oct 27)

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

## Milestone 1: the core loop (Oct 28 to Nov 10)

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

## Milestone 2: keeping people informed (Nov 11 to Nov 24)

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

## Milestone 3: launch (Nov 25 to Dec 8)

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
