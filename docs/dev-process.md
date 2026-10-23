# Development process

How work on Husky Proposals is planned, built, tested, and recorded. It draws on what worked in Luis's Resume Studio project, and on SGAuth's use of port.

**Status:** agreed October 22, 2026. Port setup is confirmed when the repository is set up.

## Who owns what

- **SGA Operations (Digital Innovation)** owns the repository (`SGAOperations/husky-proposals`) and the infrastructure.
- **Luis Sarmiento** is the primary developer and directs the product, alongside stakeholder feedback.
- All changes go through pull requests. Nothing is pushed straight to `dev` or `main`.

## Branches and releases

Agreed October 23, 2026. This matches SGAuth and port's two-branch mode.

### Branches

| Branch | Role | Deploys to | Database |
|---|---|---|---|
| `main` | Production | `proposals.northeasternsga.com` | Neon `main` |
| `dev` | Integration, and the default branch. Every feature lands here first | `proposals-dev.northeasternsga.com`, signing in against SGAuth dev | Neon `dev` |
| `<issue>-<slug>`, for example `12-review-queue` | One branch per issue, cut from `dev` | A Vercel preview on `vercel.app`, behind password protection, browse-only (sign-in cannot work there) | Neon `dev` |
| `hotfix-<issue>-<slug>` | Urgent production fixes only, cut from `main` | A Vercel preview | Neon `dev` |
| CI | | | A Neon test branch |

**Naming:**
- Branch names start with the issue number. Port uses `^(\d+)-` to link worktrees and pull requests back to issues.
- `dev` is the default branch (decided October 23, 2026, the same as SGAuth). Port's agents read their configuration from the default branch, and GitHub closes an issue from `Closes #N` only when the pull request merges into the default branch. Vercel's production branch is set to `main` separately. Changing the default branch needs an admin.

### Merging

- **Feature into `dev`: squash merge,** after rebasing the branch onto `dev` (port's implement agent already rebases).
  - Result: one tested commit per issue on `dev`. A feature can be reverted in one step.
  - Port's review-fix commits stay on the pull request page and do not reach `dev`.
- **`dev` into `main`: merge commit, never squash or rebase.**
  - GitHub's squash and rebase buttons rewrite commit IDs. That makes `main` and `dev` look diverged, so later releases conflict or repeat old changes.
  - Fast-forward-only releases would also be safe, but GitHub's buttons cannot do them, so we do not use them.
- **Turned down:** rebase-and-merge for features. It replays every commit, including review fixes that were never tested on their own, which breaks bisect and one-commit reverts.

### Commit messages

- Subject: `#N <imperative lowercase summary>`, for example `#12 add decline reason validation`. This is port's format.
- Body: a short paragraph saying why.
- Use `git commit -F <file>` for multi-line messages.

### Releases

- **Run `/port:release`.** It proposes the version bump from what merged, opens the `dev` to `main` pull request with a changelog, and ships on merge.
- **Versions are semver tags.** `v0.x` before launch: `v0.9.0` at the SGA soft launch (November 30), `v1.0.0` at the student launch (proposed January 20, 2027). See `timeline.md`. The soft launch runs on `proposals-dev`, which deploys from `dev`, so `v0.9.0` on `main` is a checkpoint, not the build testers use.
- **Cadence:** release when a milestone's work is verified on `proposals-dev`. Weekly during launch.

### Hotfixes

- Only for production breakage.
- Branch from `main`, open a pull request into `main`, then immediately merge `main` back into `dev`.
- Everything else goes through `dev`.

### Migrations

- Pull requests may only add to the schema (expand). Removals come in a later release (contract).
- Previews share the `dev` database, so a destructive migration in an open pull request would break every preview and `proposals-dev`.

### The sign-in stand-in

- Local and test environments only.
- The app refuses to start if the stand-in is enabled anywhere else. Otherwise anyone could choose "I'm the VP" on a deployed preview.

### Branch protection (needs admin access)

- **Both branches:**
  - pull request required;
  - `verify` must pass;
  - no force pushes;
  - no deletion.
- **`main`:** accepts only release pull requests from `dev` and `hotfix-*` pull requests.
- **No required approval.** Port opens pull requests from Luis's account, and GitHub does not let an author approve their own pull request. Luis reviews every pull request and is the only one who merges, so the merge is the human gate. He reads the full diff of anything that touches the review flow, permissions, or viewer shapes.

### Bootstrap exception

The first commit, on `docs/initial-planning`, predates the issue tracker and does not follow the naming rule. Everything after it does.

## Planning work

- **GitHub Issues are the only backlog.** No task lists in chat or in docs. When work is agreed, file it as an issue.
- **Labels:** feature, ux, ops, bug, idea, parked, refactor, epic. Port adds its own pipeline labels.
- **One issue is one pull request in the port lane.** Sidecar pull requests batch several UI issues (see "Two lanes"). Keep pull requests small, usually 2 to 15 files. A large mechanical change, such as a rename across the codebase, gets its own issue and pull request with nothing else in it.
- **Epics** group related issues with a checklist.
- **Before starting an issue,** read it. If the request has a catch, say so in two or three lines before building.
- **Close every issue with a short note:** what shipped, and which tests prove it.
- **Side tangents:** confirm once, then file an issue and move on. Do not fix unrelated problems inline.

## Two lanes

Agreed October 23, 2026. Port is built for hands-off work: plan, approve, wait for a reviewed pull request. That suits logic, but UI is a loop of look, nudge, look again, and a pull request per round is too slow. So there are two ways to get work into `dev`.

| | Port lane | Sidecar lane |
|---|---|---|
| For | Logic where a bug is costly or hard to see | Screens, layout, copy, polish, and setup work |
| Epics | E2, E9, the server and rules side of E4, E6, and E8, and most of E10 | E1 (the scaffold), the UI side of E4 to E8, E5, E7, and the playground page |
| How | Issue, plan, agent pull request, review agent, Luis merges | Luis and an interactive session on one branch, pushing often |
| Pull requests | One per issue | One batch every day or two, listing every issue it closes |
| Checks | `verify:agent`, then full `verify` in CI | The fast tier while working, then full `verify` in CI on the batch pull request |

**Sidecar rules:**
- **Branch:** named after an umbrella issue, for example `31-ui-browsing`, so port can still match it to an issue. Cut from `dev`, rebase onto `dev` daily, and merge within a day or two. A long-running branch drifts and ends in a painful merge.
- **Folders:** the sidecar owns the page and component folders. Port owns `src/core/`, `src/db/`, and the server actions. The sidecar calls port's functions but does not change them; port tickets do not restyle screens.
- **Keep port out:** label the umbrella issue `in progress` and give it a `## Changes` file list that claims the sidecar's folders, so port's file-contention check holds tickets that touch them. Confirm this works at `/port:init` before relying on it.
- **Never in the sidecar:** viewer shapes, permissions, the review state machine, migrations, and the privacy tests. They go through the port lane, test first, even when the sidecar would be faster.
- **Verify quickly:** local dev with the sign-in stand-in for signed-in screens, and the branch's Vercel preview on a phone (browse-only, since sign-in cannot work on `vercel.app`). New layouts start on the playground page.
- **Bugs found while working:** file an issue right away, or fix it in place if it is in the UI being worked on.
- **Commits:** `#N summary`, where `#N` is the issue the change is for. Nothing is pushed straight to `dev` or `main`.

## Port

Port turns GitHub issues into pull requests. A plan agent writes the plan, and an implement agent builds it. A review agent reviews, and a revise agent fixes. A person approves each plan and merges each pull request.

- **Implement agent rules:** work test-first, and run `verify` before opening a pull request.
- **Review agent rules:** check the Patterns list in `docs/ENGINEERING.md`. Most review churn in Resume Studio came from missed reuse and missing tests, not logic bugs.
- **Privacy rules and the review flow,** the riskiest parts of this product, get a human review before merge.
- **Parallel agents** only work when their files do not overlap. Port holds a ticket back on its own when an in-flight plan claims 2 or more of the same files.

### How we run port

Written October 23, 2026, from port's README, `docs/USAGE.md`, `plugins/port/docs/PIPELINE.md`, and `plugins/port/docs/FORMATS.md` in `b-at-neu/port`. Port is set up in T0.11, after the scaffold (T0.3), so it has real scripts to run.

**Day to day:**
- Run `/port:pipeline` in its own session, in `default` permission mode (not auto or accept-edits). Haiku is enough for it.
- Say `work on #N` to claim a ticket. Choose plan review for anything with a design side, or `auto plan` for small fixes.
- Approve the plan in the terminal. Implementation, review, and revision then run on their own until the pull request is labeled `approved`.
- Merge on GitHub yourself. Port never merges.
- Break an epic into tickets with `/port:scope`, on a strong model. It leaves tickets unassigned and unlabeled until someone says `work on #N`.
- Cut releases with `/port:release`.
- A ticket that edits `CLAUDE.md` or anything under `.claude/` cannot go to an agent. Its plan is marked `SESSION REQUIRED`, and you run `/port:implement N` in a separate session.

**Label lifecycle.** Labels are port's state. Changing one by hand is always a valid way to step in.

| Where | Flow |
|---|---|
| Issue | `ready` → `planning` → `plan review` (you approve, or `plan changes requested` loops back) → `plan approved` → `in progress` → `pr opened` |
| Issue, side exit | `blocked`: the implement agent needs a decision |
| Pull request | `ready for review` → `reviewing` → `needs revision` → `revising` → `ready for review`, until `approved` |
| Pull request, side exits | `needs human`: 5 review cycles, an unclear rebase conflict, or a review with nothing new to grade. Only `unblock #N` clears it. `refresh branch` → `refreshing`: rebase only |
| Markers | `claude`: port owns this item. `auto plan`: skip the plan gate |

- Each item holds at most one stage label. Port reports an item with two and leaves it alone.
- The cockpit only acts on items assigned to you.
- The review bar drops each cycle: cycle 1 blocks on anything, cycle 2 on Low and above, cycle 3 on Critical and Medium only. A red required check is always Critical.

**Our `.claude/port.config.json`** (proposed; the npm scripts are created in T0.3):

```json
{
  "$schema": "https://raw.githubusercontent.com/b-at-neu/port/main/schema/port.config.schema.json",
  "tracker": "github",
  "repo": "SGAOperations/husky-proposals",
  "branches": { "integration": "dev", "production": "main" },
  "commands": {
    "bootstrap": ["npm ci", "npx --no-install prisma generate"],
    "checks": [
      { "run": "npm run format:check", "fix": "npm run format" },
      { "run": "npm run lint", "fix": "npm run lint:fix" },
      { "run": "npm run typecheck", "fix": null },
      { "run": "npm run verify:agent", "fix": null }
    ],
    "artifacts": "node scripts/port-artifacts.mjs",
    "worktrees": "node scripts/port-worktrees.mjs",
    "budget": "node scripts/port-budget.mjs",
    "tick": null,
    "forensics": null
  },
  "docs": { "engineering": null, "design": null },
  "models": { "plan": "opus", "impl": "sonnet", "review": "sonnet", "revise": "sonnet" },
  "labels": {},
  "modules": { "approvalGate": false, "release": true, "scope": true },
  "release": { "versionSource": "tags", "postPublishHook": null },
  "reviewCycleCap": 5,
  "budget": { "wallClockMinutes": null },
  "concurrency": { "sharedFiles": [], "overlapThreshold": 2 },
  "sessionRequiredPaths": ["CLAUDE.md", ".claude/**", "port.config.json"],
  "extraAllow": [
    "Bash(node scripts/port-artifacts.mjs *)",
    "Bash(node scripts/port-worktrees.mjs *)",
    "Bash(node scripts/port-budget.mjs *)",
    "Bash(npx --no-install prisma generate *)",
    "Bash(npx --no-install prisma migrate diff *)"
  ]
}
```

- **`checks`** are objects with `run` and `fix`, never bare strings. Each must be a script in `package.json`, start with its binary, and match a step CI runs.
- **`verify:agent`** is the part of `verify` that needs no secrets: unit and component tests with fakes. Agent worktrees get no `.env`, so the build, database tests, and browser tests run only in CI, which runs the full `npm run verify`. The review agent treats a red CI check as Critical, so CI is still the gate.
- **`release.versionSource: "tags"`:** semver tags are the only version record, so a release is one pull request.
- **`approvalGate` stays off** until a ruleset on `dev` makes the check required. Without one it is advisory either way.
- **`docs.engineering` and `docs.design`** stay null until `/port:analyze` writes them.

**What `/port:init` will do** (once, by one person; it shows everything before writing):
1. Install with `claude plugin marketplace add b-at-neu/port@main --scope project` and `claude plugin install port@port --scope project`, then start a new session.
2. Detect the two-branch model (`dev` and `main`), the npm scripts, and the CI workflows. Ask which modules to turn on.
3. Write `.claude/port.config.json`, validated against port's schema.
4. Check `CLAUDE.md` for rules that contradict port's defaults, and offer to record each in a `port-overrides` block.
5. Merge the allow and deny lists into `.claude/settings.json`. The deny list blocks merging, direct pushes to `dev` and `main`, and publishing packages.
6. Create port's 18 labels.
7. Copy `scripts/port-artifacts.mjs` (with `.github/workflows/artifacts.yml`), `scripts/port-worktrees.mjs`, and `scripts/port-budget.mjs`.
8. Add `.agents/`, `.temp/`, and `.claude/worktrees/` to `.gitignore`.
9. Offer `/port:analyze`, then pin the plugin to port's latest release tag.

All of this lands through one pull request into `dev`, like any other change.

**What `/port:analyze` will do:**
- Sample the codebase and propose `docs/ENGINEERING.md`: conventions it found, inconsistencies for us to settle, and improvements to approve one by one. It merges an existing document instead of replacing it, so `CLAUDE.md`'s rules carry over. `CLAUDE.md` still wins where the two disagree.
- Because we have a UI, also propose `docs/DESIGN.md`, from `design/tokens.css` and the prototype.
- Recommend plugins for the stack, installed at project scope.
- Propose repository-specific skills (a scaffolder and an auditor), one confirmation each.
- File what it finds as issues. It never changes code.

Run it after the scaffold. On an empty repository it has nothing to sample. Re-run it as the code grows; it diffs instead of starting over.

**Access needed:**

| Step | Needs |
|---|---|
| Install, `/port:init`, `/port:analyze`, creating labels, running the cockpit | Write (Luis has it) |
| Merge-button settings: squash for features, merge commits for releases, no rebase merging, squash message from the pull request title | Maintain or admin |
| Rulesets on `dev` and `main`, required checks, the approval gate | Admin |
| Changing the default branch | Admin |
| A Projects board owned by the SGAOperations org | An org member allowed to create projects |

### Where port and our rules conflicted

Decided October 23, 2026.

1. **The default branch.** With `main` as default, config changes reached agents only after a release, and issues stayed open after merging into `dev`, so port's file-contention check held new tickets until the next release. **Decided:** `dev` is the default branch (see "Branches").
2. **`CLAUDE.md` is session-required.** Port will not let an agent edit `CLAUDE.md`, so updating its "Where things live" and "Patterns" sections in every feature pull request would send every feature to `/port:implement`. **Decided:** those two sections live in `docs/ENGINEERING.md`, which agents can edit and review cites. Until `/port:analyze` creates it, the first feature pull request that needs them creates it.
3. **`verify` needs secrets that agent worktrees do not have.** Anything in `bootstrap` or `checks` that needs a database fails on every run. Two parts of our plan needed one:
   - TypedSQL generates types from a live database, so `prisma generate --sql` cannot run in a worktree;
   - our database and browser tests use the Neon test branch.

   **Decided:** the `verify:agent` split above, and no TypedSQL. Raw queries are tagged `$queryRaw` in `src/db/sql/`, parsed with zod, each with a test against the Neon test branch in CI.

4. **The required human approval.** GitHub does not let an author approve their own pull request, and port opens pull requests from Luis's account. **Decided:** no required approval and no second reviewer. Luis's review and merge are the gate (see "Branch protection").
5. **Squash merge subjects.** A squash merge's subject comes from a GitHub setting, not from port's commits. **Decided:** set the default squash message to the pull request title, and title pull requests `#N summary`, so `dev` keeps our format.

No conflict: port's branch names (`<issue>-<slug>`), commit format, rebase onto `dev` before review, and release pull requests from `dev` to `main` already match our rules. The revise agent force-pushes only to feature branches, which branch protection does not cover.

## Testing

- **Test-first is a hard rule.** Write the failing test, see it fail for the right reason, then write the code.
- **One command, `npm run verify`,** runs everything and prints one line per suite plus the names of failing tests:
  1. type check;
  2. unit tests;
  3. component tests;
  4. build;
  5. browser tests.
- **CI runs the same `verify`,** so local and CI never disagree.
- **Faster tiers** so small changes do not pay for everything. Examples:
  - styling only: build plus the layout and browser checks for that page;
  - docs only: no tests.
- **Slow tests,** such as animation checks, are skipped by default and run in a separate `verify:all`.
- **Every external service has a fake from day one:**
  - SGAuth is replaced by the sign-in stand-in.
  - Email is replaced by a mailer that captures messages.
  - The database is a Neon test branch, with each test in its own transaction.
- **Invented test data only.** Never use real student data, and never use files ignored by git. Seed data comes from the prototype's sample ideas.
- **Read a failure before rerunning.** Rerunning until green hides flaky tests.
- **Assert on state, not on timing.** Timing-based browser checks were flaky under load in Resume Studio.
- **Guard tests for conventions,** for example:
  - the Tailwind theme matches `design/tokens.css`;
  - no arbitrary Tailwind values and no hard-coded colors in components;
  - in a real browser (Chromium and WebKit), every visible element's corner radius, border width, and colors come from the allowed token values;
  - imports do not climb more than one folder.
- **More unit and component tests, fewer browser tests.** A long browser suite did not get faster with more parallelism.

## Data from outside our code

Validate everything we do not control: SGAuth session responses, Resend webhooks, and everything students submit.

- **Repair what can be repaired, record what was repaired, and never silently drop anything.**
- Validate on read as well as on write, so old data shapes fail loudly instead of rendering nothing.
- Use one set of shared validation helpers. No local copies.

## Code conventions

- **Reuse before you build.** One component per idea (dialogs, cards, chips) and one hook per feature. `docs/ENGINEERING.md` lists the patterns, and gets a new-feature checklist before the fifth feature, not after an audit: "Which component or hook does this extend? Which test fails first?"
- **Comments explain why,** and cite the issue number. Match the comment density of the surrounding code.
- **Commit messages:** port's format, `#12 add decline reason validation`, then a short body saying why. See "Branches and releases."
- **Rules used by both the client and the server,** such as statuses, permissions, and limits, live in one shared module and are imported, never copied.
- **Edit files with proper editing tools,** not ad hoc sed or Python scripts for multi-line changes. Use a codemod only for mechanical bulk changes.

## Tools

Agreed October 23, 2026.

| Job | Tool | Notes |
|---|---|---|
| Tickets | GitHub Issues and a GitHub Projects board in this repository | Port runs on issue labels. The repository is public, so issues are public: implementation detail only, never internal deliberation. |
| Breaking features into tickets | Port's `/port:scope` | Turns an epic into dependency-ordered sub-issues. |
| Feature specs | `docs/features/<name>.md` in the repository, linked from the epic issue | Behavior, acceptance criteria, edge cases, and tests. Technical, for Luis, Eli, and SGA Operations. |
| Executive summaries and internal reasoning | Local Word documents (gitignored), later moved to SGA's shared Google Drive | Each feature spec gets a short executive summary. Internal debates stay out of the repository. |
| Data model | `prisma/schema.prisma` is the source of truth, with a generated Mermaid diagram committed next to it | The diagram renders on GitHub and updates with the schema. |
| Diagrams for review | FigJam (Luis's Figma account) | [Schema review board](https://www.figma.com/board/UVvKcZzZCOM5FvfwSBnNxf): entity relationships, UML classes, the review and idea state machines, and who sees what. [Timeline draft](https://www.figma.com/board/B0t1S7DA0LGUeHBMbqN0Hv) (superseded by `timeline.md`). Figma's MCP calls are limited on this plan, so diagrams that change often live in the repo as Mermaid. |
| UI design | `prototype/concept-2.html` for layouts, Figma when screens need comments, and the frontend-design skill for all UI code | The app must not look generated. Follow `design/tokens.css` and the prototype, not generic component-library defaults. |
| Workshops and feedback | Miro | As in the validation plan. |

## Planning order

1. **Feature map:** split the December scope into epics.
2. **Schema:** draft `schema.prisma` from `data-model.md`, generate the diagram, and review it in FigJam.
3. **State machines and viewer shapes:** diagram the review status, the idea status, and who sees what, in FigJam.
4. **Feature specs:** one per epic in `docs/features/`, each with an executive summary.
5. **Tickets:** run `/port:scope` on each epic, and put the sub-issues on the board in milestone order.

## Keeping context between sessions

The repository is the memory. Chat history and local assistant memory do not travel between sessions or machines.

- **`docs/PRD.md`:** what and why. Every decision goes in the decision log with the date and the reason, in the same pull request that acts on it. Add "Turned down" notes so the same idea is not re-proposed.
- **`CLAUDE.md`:** working rules, how to run things, and hard rules.
- **`docs/ENGINEERING.md`:** patterns and where things live, updated in the same pull request as the feature.
- **Issues:** findings and decisions go in the closing comment.
- **`docs/`:** longer topics such as `scalability.md`, `sgauth-integration.md`, and this file.
- **UI decisions:** `prototype/concept-2.html` is where layouts are settled. New layouts are mocked there first, and the choice is cited in code. Screens made from existing pieces do not need a mock.

## Open

- **Repository settings to apply.** Luis decides how the repository is run. His GitHub account has write access, which covers `/port:init`, labels, and merging. These settings need an admin account to apply, either an Operations admin or admin access granted to Luis:
  - switch the default branch to `dev`;
  - split the current `main/dev` ruleset: `dev` allows squash merges only, and `main` allows merge commits only (today both allow only merge and rebase, so squash is unavailable);
  - set the default squash message to the pull request title;
  - add `verify` as a required check once CI exists.

  Until the ruleset is split, merge feature pull requests with a merge commit, not rebase.
