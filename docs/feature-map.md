# Feature map

The soft-launch scope split into epics, plus the epics planned for winter break. Each epic becomes a GitHub issue labeled `epic`, gets a spec in `docs/features/`, and is broken into sub-issues with `/port:scope` (see `dev-process.md`, "Planning order"). Task numbers (T0.3 and so on) refer to `build-plan.md`. Dates are in `timeline.md`.

Written October 23, 2026.

## Epics

| # | Epic | Goal | Build-plan tasks | Depends on | Size |
|---|---|---|---|---|---|
| E1 | Foundations | A deployed skeleton with `verify` in CI, fakes for every outside service, and port running | T0.3, T0.4, T0.11 | Nothing | M |
| E2 | Data and core rules | The schema, the `idea_stats` view, and the plain TypeScript rules every feature imports: statuses and transitions, permissions, limits, viewer shapes | T0.5, plus the shared rules module and `src/db/` helpers | E1, the schema review (T0.10) | M |
| E3 | Sign-in and roles | Act as a student, a chair, or the VP locally, and later through SGAuth | T0.6, T2.5 | E1. T2.5 waits on SGAuth milestone 2 | S, then S |
| E4 | Posting and review | A student posts (anonymously if they choose), a reviewer approves or declines with a reason, and the author edits and resubmits | T0.7, T0.8 | E2, E3 | L |
| E5 | Public browsing | Anyone with the link browses approved ideas: list, idea page, In progress tab, support display, "Updated N days ago", "From SGA" tags, and a copy-link share with a QR code (drawn in the browser; the first thing dropped if E5 runs late), cached and `noindex` | T1.1, T1.4, T1.5, T2.3 | E2. Seed data stands in for real posts | M |
| E6 | Student actions | Support, "I'll participate," and follow, set-state and idempotent, with the abuse limit and remembered signed-out taps | T1.2, T1.3 (the tap), T1.9, follow from T2.2 | E3, E5 (the buttons live on its pages) | M |
| E7 | SGA queue and decisions | Leaders open onto the queue, filter it, and start, review, hold, or deliver ideas; the VP changes boards | T1.6, T1.7, T1.8 | E3, E4 (the review tab shares the queue) | M |
| E8 | Updates and names for leaders | Updates with a one-tap "still working, no news" option and a flag when an idea misses its board's cadence (monthly by default), the People list, and who posted and who supported, with the privacy notice for students | T2.1, T2.4, T1.3 (the list of names) | E7, the D16 decision | M |
| E9 | Email | The outbox, the worker and its schedule, decision emails, weekly digests, preferences, and bounces | T2.2 (email), the rest of T0.2 | E2. Decision emails need E4, digests need E8 | L |
| E10 | Launch readiness | Monitoring, backups with a tested restore, the load test, the student test, the accessibility pass, a switch to turn off posting, training, and the SGA soft launch | T2.6, T2.7, T3.1 to T3.6 | Everything; monitoring and backups can start after E1 | M |
| E11 | Tabling form | A short form on each idea page that boards use while tabling. No sign-in; responses stay separate from verified support | New. Estimated at the Nov 20 freeze | E5, E7 | To estimate |
| E12 | Promotion switch | An admin switch, off by default, that lets leaders feature ideas at the top, always labeled. Built only if feedback asks for it | S13, L6 | E5, E7 | S |
| E13 | Spring launch prep | Onboarding for boards, comms for students, and fixes from the soft launch | T3.6 | E10 | S |

Sizes are rough: S is 1 to 3 pull requests, M is 4 to 6, L is 7 or more. E1 to E10 total about 45 pull requests before the soft launch. E11 to E13 are after it.

**Not an epic:** the governance asks (T0.9), the planning artifacts (T0.10), and moving documents to the shared Drive (T0.12). They run alongside the build. Several have deadlines, listed in `build-plan.md`.

## Order and parallel work

```
E1 ──> E2 ──┬──> E4 ──> E7 ──> E8 ──┐
E1 ──> E3 ──┘                       │
       E2 ──> E5 ──> E6             ├──> E10
       E2 ──> E9 (outbox first; decision emails after E4, digests after E8)
```

After week 1, three streams can run at the same time:

| Stream | Epics | Mostly touches |
|---|---|---|
| Student side | E5, then E6 | Public pages, support and follow actions |
| SGA side | E4, then E7, then E8 | Posting, review, the queue, updates |
| Email | E9 | `src/email/`, the outbox, the scheduled job |

E10's monitoring and backups can run in any gap after E1.

**Port lane or sidecar** (`dev-process.md`, "Two lanes"): E1 is built in the sidecar, since it is setup work and port needs it first. E2 and E9 go through port. E4, E6, E7, and E8 split: rules and server actions through port, screens in the sidecar. E5 and the playground page are mostly sidecar. E10 is mostly port, plus the soft launch itself.

**Keeping streams from colliding.** Port holds a ticket when an in-flight plan claims 2 or more of the same files. Two files are shared by almost everything:
- `prisma/schema.prisma`: land every soft-launch table in E2, up front. Later epics add columns only when they must.
- The shared rules module: E2 defines every status, transition, permission, and limit before the streams start. Streams import it and rarely change it.

## Never cut

These protect students or the data, so they ship even if the date moves:
- the review step, with written decline reasons;
- anonymous posting, separate viewer shapes, and the tests that private fields never reach the student shape;
- `noindex` on every page;
- nightly encrypted backups and one tested restore;
- a switch to turn off posting.

The ordered cut list for everything else is in `build-plan.md`.
