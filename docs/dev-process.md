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
| `main` | Production, and the default branch | `proposals.northeasternsga.com` | Neon `main` |
| `dev` | Integration. Every feature lands here first | `proposals-dev.northeasternsga.com`, signing in against SGAuth dev | Neon `dev` |
| `<issue>-<slug>`, for example `12-review-queue` | One branch per issue, cut from `dev` | A Vercel preview on `vercel.app`, behind password protection, browse-only (sign-in cannot work there) | Neon `dev` |
| `hotfix-<issue>-<slug>` | Urgent production fixes only, cut from `main` | A Vercel preview | Neon `dev` |
| CI | | | A Neon test branch |

**Naming:**
- Branch names start with the issue number. Port uses `^(\d+)-` to link worktrees and pull requests back to issues.
- `main` stays the default branch, because port reads its configuration from there. Port config changes have to reach `main`, not only `dev`.

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
- **Versions are semver tags.** `v0.x` before launch, `v1.0.0` at the December launch.
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

### Branch protection (needs maintain or admin access)

- **Both branches:**
  - pull request required;
  - `verify` must pass;
  - no force pushes;
  - no deletion.
- **`main`:** accepts only release pull requests from `dev` and `hotfix-*` pull requests.
- **`dev`:** one human approval for pull requests that touch the review flow, permissions, or viewer shapes.

### Bootstrap exception

The first commit, on `docs/initial-planning`, predates the issue tracker and does not follow the naming rule. Everything after it does.

## Planning work

- **GitHub Issues are the only backlog.** No task lists in chat or in docs. When work is agreed, file it as an issue.
- **Labels:** feature, ux, ops, bug, idea, parked, refactor, epic. Port adds its own pipeline labels.
- **One issue is one pull request.** Keep pull requests small, usually 2 to 15 files. A large mechanical change, such as a rename across the codebase, gets its own issue and pull request with nothing else in it.
- **Epics** group related issues with a checklist.
- **Before starting an issue,** read it. If the request has a catch, say so in two or three lines before building.
- **Close every issue with a short note:** what shipped, and which tests prove it.
- **Side tangents:** confirm once, then file an issue and move on. Do not fix unrelated problems inline.

## Port

Port turns GitHub issues into pull requests. A plan agent writes the plan, and an implement agent builds it. A review agent reviews, and a revise agent fixes. A person approves each plan and merges each pull request.

- **Implement agent rules:** work test-first, and run `verify` before opening a pull request.
- **Review agent rules:** check the Patterns list in `CLAUDE.md`. Most review churn in Resume Studio came from missed reuse and missing tests, not logic bugs.
- **Privacy rules and the review flow,** the riskiest parts of this product, get a human review before merge.
- **Parallel agents** only work when their files do not overlap. Merge and verify centrally.
- `/port:init` is run once, by whoever sets up the repository. It needs maintain or admin access to create labels.

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
  - design tokens match `design/tokens.css`;
  - no rounded corners;
  - imports do not climb more than one folder.
- **More unit and component tests, fewer browser tests.** A long browser suite did not get faster with more parallelism.

## Data from outside our code

Validate everything we do not control: SGAuth session responses, Resend webhooks, and everything students submit.

- **Repair what can be repaired, record what was repaired, and never silently drop anything.**
- Validate on read as well as on write, so old data shapes fail loudly instead of rendering nothing.
- Use one set of shared validation helpers. No local copies.

## Code conventions

- **Reuse before you build.** One component per idea (dialogs, cards, chips) and one hook per feature. `CLAUDE.md` lists the patterns, and gets a new-feature checklist before the fifth feature, not after an audit: "Which component or hook does this extend? Which test fails first?"
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
| Diagrams for review | FigJam (Luis's Figma account) | Entity diagrams, the review and idea state machines, and viewer-shape rules. |
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
- **`CLAUDE.md`:** working rules, how to run things, where things live (updated in the same pull request as the feature), patterns, and hard rules.
- **Issues:** findings and decisions go in the closing comment.
- **`docs/`:** longer topics such as `scalability.md`, `sgauth-integration.md`, and this file.
- **UI decisions:** `prototype/concept-2.html` is where layouts are settled. New layouts are mocked there first, and the choice is cited in code. Screens made from existing pieces do not need a mock.

## Open

- **Maintain access:** Luis has write access to the repository. Port setup and branch protection need maintain or admin. Ask Operations.
