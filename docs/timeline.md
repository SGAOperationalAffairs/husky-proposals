# Timeline

When each epic is planned, mapped to `feature-map.md`. Read this to find what is due. The task detail is in `build-plan.md`. The issues are the live backlog.

Updated October 23, 2026 (#9). Dates are inclusive. The chart renders on GitHub.

## Today, in short

To find what is due on a given day:
1. Find the rows in "By epic" whose dates include today. Those epics are in flight.
2. Check "Checkpoints and gates" for anything dated this week.
3. An epic past its end date that is not done is late. Say so, and apply the cut list in `build-plan.md`.

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
    E1 Foundations                :e1, 2026-10-26, 7d
    E2 Data and core rules        :e2, 2026-10-26, 7d
    E3 Sign-in stand-in           :e3a, 2026-10-26, 7d
    section Student side
    E5 Browsing and share link    :e5, 2026-11-02, 7d
    E6 Student actions            :e6, 2026-11-09, 7d
    section SGA side
    E4 Posting and review         :e4, 2026-11-02, 7d
    E7 SGA queue and decisions    :e7, 2026-11-09, 7d
    E8 Updates and names          :e8, 2026-11-16, 5d
    section Email
    E9 Email                      :e9, 2026-11-02, 19d
    section Readiness
    E10 Monitoring and backups    :e10a, 2026-11-09, 7d
    E3 Switch to SGAuth           :e3b, 2026-11-16, 5d
    E10 Student test, accessibility :e10b, 2026-11-16, 5d
    Feature freeze                :milestone, 2026-11-20, 0d
    E10 Hardening and training    :e10c, 2026-11-23, 2d
    SGA soft launch               :crit, soft, 2026-11-30, 14d
    section After the soft launch
    E11 Tabling form              :e11, 2026-12-21, 21d
    E12 Promoted area             :e12, 2026-12-21, 7d
    E13 Spring launch prep        :e13, 2027-01-04, 9d
    Student launch                :milestone, crit, 2027-01-20, 0d
    Monthly summary and export    :2027-01-25, 21d
```

## By epic

| Epic | Start | End | Notes |
|---|---|---|---|
| E1 Foundations | Oct 26 | Nov 1 | Scaffold, test harness, CI, port |
| E2 Data and core rules | Oct 26 | Nov 1 | Schema, `idea_stats`, rules module |
| E3 Sign-in and roles | Oct 26 | Nov 1 | Stand-in. The switch to SGAuth is Nov 16 to 20 |
| E4 Posting and review | Nov 2 | Nov 8 | |
| E5 Public browsing | Nov 2 | Nov 8 | Includes the copy-link share |
| E9 Email | Nov 2 | Nov 20 | Outbox first, decision emails, then digests |
| E6 Student actions | Nov 9 | Nov 15 | |
| E7 SGA queue and decisions | Nov 9 | Nov 15 | |
| E10 Launch readiness | Nov 9 | Dec 13 | Monitoring and backups Nov 9 to 15; student test and accessibility Nov 16 to 20; hardening and training Nov 23 to 24; soft launch Nov 30 to Dec 13 |
| E8 Updates and names | Nov 16 | Nov 20 | |
| E11 Tabling form | Dec 21 | Jan 11 | Estimated at the freeze. Built over winter break if it fits |
| E12 Promoted area | Dec 21 | Dec 27 | |
| E13 Spring launch prep | Jan 4 | Jan 12 | Onboarding, comms, fixes from the soft launch |

## Checkpoints and gates

| Date | What | If missed |
|---|---|---|
| Nov 1 | D9 (appeals) answered | The decline message ships without an appeal line |
| Sun Nov 8 | E4 and E5 merged into `dev` | Cut list items 1 to 2 (`build-plan.md`) |
| Sun Nov 15 | E6 and E7 merged. D16 (who sees names) decided | Cut list items 3 to 4 |
| Mon Nov 16 | SGAuth milestone 2 done | Stay on the stand-in; the switch moves to Nov 23 to 24 |
| Fri Nov 20 | Feature freeze. Estimate the tabling form (E11) | Anything unmerged moves after the soft launch |
| Mon Nov 30 | Soft launch starts on `proposals-dev`, SGA members on the auth-dev allowlist | |
| Dec 14 to 20 | Finals: production breakage only | |
| Before Jan 20 | SGAuth milestone 3 live in production. D14 data policy in place | The student launch waits |
| Wed Jan 20 | Student launch, `v1.0.0` (proposed) | |
