# Timeline

Updated November 18, 2026. Dates are set in the project's Target date field once #279 lands. Until then, this file is the source. Each section starts with what to do. Tickets are GitHub issues; `#N` is the issue number.

## What to do now

Wednesday, November 18, to Friday, November 20 (feature freeze)

- **Work on the pre-launch bugs (#259).** Plan and build #255 (follow limit), #256 (live pages and pending count), #257 (post and email data), #258 (sign-out and hold rule), and #273 (day arithmetic). Each merges by Friday or moves after the soft launch.
- **Merge #253, then #254** (decision emails, split from #211). #251 is superseded. Close it without merging.
- **Merge #249** (error floater). It is ready for review.
- **Finish #126** (leader panel: start, hold, finish, reopen). It is on the Feature freeze milestone. Merge by Friday or move.
- **Finish #131** (idea page updates and the still-working button). E8 ends Friday.
- **Merge #275** (the docs batch: timeline, SGAuth status, refactor rules).
- **Write the send route (#210).** Decision emails queue until it exists. It goes on the Feature freeze milestone, with #211.
- **Set the milestones (needs a go-ahead):** move the E10 readiness milestone to December 13 and put #210 on Feature freeze.

## What to do next

Monday, November 23, to Friday, November 27

- **Work on hardening and training (E10, Nov 23 to 24).** Switch (#213), quota alerts (#214), backups (#215), load test (#216), reviewer guide and training (#217), release checklist (#218). The E10 end date is December 13. These are readiness work, so they may slip into the soft launch week.
- **Check that SGA members can sign in on dev with their own SGAuth accounts (#180).** No allowlist requests. First check: does an existing member account reach `dev.auth`? Due Friday, November 27. If not, the soft launch waits. The stand-in does not run on dev.
- **Work on Target dates (#279).** Start with the tickets this timeline names. This is what makes `npm run due` work.

## What to do during the soft launch

Monday, November 30, to Sunday, December 13

- **Launch the SGA soft launch** on dev. SGA members sign in with their own SGAuth accounts.
- **Finish the E6 leftovers (#95, #102).** Both are late; E6 ended November 15.
- **Fix only, on dev.** Until December 13, dev takes fixes only.
- **Start post-launch hygiene (#272) on December 1.** This is an exception to the fixes-only rule: refactors may merge on dev during the soft launch, one pattern per pull request, each passing the full test suite. Nothing else lands unless it is a fix.

## What to do after

- **Finals, December 14 to 20.** Production breakage only.
- **Winter break, from December 21.** Build the tabling form (E11, estimated; only if it fits). Build the promotion switch (E12) only if feedback asks for it.
- **Spring prep, January 4 to 17 (E13).** Onboarding, comms, fixes from the soft launch. Run the five-student test January 13 to 17.
- **Student launch, Wednesday, January 20.** Tag v1.0.0 (proposed).

## Decisions

- **November 18:** E10 readiness ends December 13 (not the freeze). #210 sits on the Feature freeze milestone.
- **November 18:** Hygiene opens December 1, as an exception to the fixes-only rule above.
- **November 18:** #126 and #211 merge by November 20, or move after the soft launch.
- **November 18:** No dev allowlist requests. SGA members sign in on dev with their own SGAuth accounts (option 1). Not yet verified: that existing member accounts can reach `dev.auth`. If they cannot, the soft launch waits. The stand-in does not run on dev.

## Chart

```mermaid
gantt
    title Husky Proposals timeline
    dateFormat YYYY-MM-DD
    section Calendar
    Fall break                    :2026-11-25, 5d
    Finals                        :2026-12-14, 7d
    Winter break                  :2026-12-21, 23d
    Spring classes start          :milestone, 2027-01-13, 0d
    section Foundations
    E1 Foundations                :done, e1, 2026-10-26, 7d
    E2 Data and core rules        :done, e2, 2026-10-26, 7d
    E3 Sign-in stand-in           :done, e3a, 2026-10-26, 7d
    E3 SGAuth test on dev         :crit, e3t, 2026-11-18, 9d
    section Student side
    E4 Posting and review         :done, e4, 2026-11-02, 16d
    E5 Browsing and share link    :done, e5, 2026-11-02, 7d
    E6 Student actions            :active, e6, 2026-11-09, 10d
    section SGA side
    E7 SGA queue and decisions    :active, e7, 2026-11-09, 14d
    E8 Updates and names          :active, e8, 2026-11-16, 5d
    section Email
    E9 Email                      :active, e9, 2026-11-02, 19d
    section Readiness
    E10 Launch readiness          :active, e10, 2026-11-09, 35d
    Pre-launch bug fixes          :crit, bugs, 2026-11-18, 12d
    Feature freeze                :milestone, 2026-11-20, 0d
    SGA soft launch               :crit, soft, 2026-11-30, 14d
    section After the soft launch
    E11 Tabling form              :e11, 2026-12-21, 21d
    E12 Promotion switch          :e12, 2026-12-21, 7d
    E13 Spring launch prep        :e13, 2027-01-04, 9d
    E13 Five-student test         :e13t, 2027-01-13, 5d
    Student launch                :milestone, crit, 2027-01-20, 0d
    Post-launch hygiene           :hyg, 2026-12-01, 30d
    Monthly summary and export    :2027-01-25, 21d
```

## By epic

| Epic | Start | End | Status and notes |
|---|---|---|---|
| E1 Foundations | Oct 26 | Nov 1 | **Done.** Scaffold, test harness, CI, Poster direction (#29) |
| E2 Data and core rules | Oct 26 | Nov 1 | **Done.** Schema, `idea_stats`, rules, viewer shapes |
| E3 Sign-in and roles | Oct 26 | Nov 27 | **Partly done.** SGAuth session endpoint closed Oct 23. Dev sign-in uses members' own SGAuth accounts (#180). The stand-in runs in local and test only |
| E4 Posting and review | Nov 2 | Nov 8 | **Done, late.** Post, review, and resubmit (#128, PR #240), edit page |
| E5 Public browsing | Nov 2 | Nov 8 | **Done.** Queries, caching, ideas list, idea page, share dialog, poster and flyer |
| E6 Student actions | Nov 9 | Nov 15 | **Active, late.** Support and follow merged. Follow's abuse limit (#255) is pre-launch. "I'll participate" (#95) and signed-out taps (#102) open |
| E7 SGA queue and decisions | Nov 9 | Nov 22 | **Active.** Queue and status actions merged. Closed status (#237, PR #250) merged November 18. Finish and reopen (#126) open |
| E8 Updates and names | Nov 16 | Nov 20 | **Active.** Leader Updates tab merged. Idea page updates and still-working button (#131) open |
| E9 Email | Nov 2 | Nov 20 | **Active, at risk.** Resend mailer and bounce webhook merged. Decision and status emails split into #253 and #254. Send route (#210) not started |
| E10 Launch readiness | Nov 9 | Dec 13 | **Active.** Dev migrations merged (#248, PR #252). Switch (#213), alerts (#214), backups (#215), load test (#216), reviewer guide (#217), release checklist (#218) open |
| Pre-launch bug fixes | Nov 18 | Nov 29 | **Active.** Epic #259. Must merge before the soft launch |
| E11 Tabling form | Dec 21 | Jan 10 | Estimated. Built over winter break if it fits |
| E12 Promotion switch | Dec 21 | Dec 27 | Off by default. Only if feedback asks for it |
| E13 Spring launch prep | Jan 4 | Jan 17 | Onboarding, comms, fixes, five-student test Jan 13 to 17 |
| Post-launch hygiene | Dec 1 | Dec 31 | **Planned.** Epic #272. About one refactor a week. Exception to fixes-only, see above |

## Checkpoints and gates

| Date | What | If missed |
|---|---|---|
| Nov 1 | D9 (appeals) answered | Decline message ships without an appeal line |
| Nov 8 | E4 and E5 merged | Cut list items 1 to 2 |
| Nov 9 to 15 | SGAuth connection spike; manual sign-in test (#180) open | Switch starts late |
| Nov 16 | SGAuth session endpoint (done early, Oct 23) | None |
| Wed Nov 18 | Merged today: #250, #252, #236, #234, #233, #240, #239, #241. At risk: send route (#210) | Decision emails wait for #210 |
| Fri Nov 20 | Feature freeze. #255 to #258 and #273 merge or move. #126 and #211 merge or move | Anything unmerged moves after the soft launch |
| Fri Nov 27 | SGA members can sign in on dev with their own SGAuth accounts (#180) | Soft launch waits. The stand-in does not run on dev |
| Mon Nov 30 | Soft launch starts on dev. dev takes fixes only until Dec 13 | |
| Dec 14 to 20 | Finals: production breakage only | |
| Before Jan 20 | SGAuth milestone 3 live in production; D14 data policy in place | Student launch waits |
| Wed Jan 20 | Student launch, v1.0.0 (proposed) | |
