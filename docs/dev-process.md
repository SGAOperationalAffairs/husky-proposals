# Development process

How work on Husky Proposals is planned, built, tested, and recorded. It draws on what worked in Luis's Resume Studio project, and on SGAuth's use of port.

**Status:** agreed October 22, 2026. Port setup is confirmed when the repository is set up.

## Who owns what

- **SGA Operations (Digital Innovation)** owns the repository (`SGAOperations/husky-proposals`) and the infrastructure.
- **Luis Sarmiento** is the primary developer and directs the product, alongside stakeholder feedback.
- All changes go through pull requests. Nothing is pushed straight to `dev` or `main`.

## Branches

- **Feature branches** are cut from `dev`, named after their issue (for example `12-review-queue`), and merged into `dev` by pull request.
- **`dev`** is the integration branch. It deploys to `proposals-dev.northeasternsga.com`, which signs in against SGAuth's dev environment.
- **`main`** is production. It deploys to `proposals.northeasternsga.com`. `dev` is released into `main` by a release pull request.
- This matches SGAuth, and port's two-branch mode: feature pull requests target `dev`, and releases go from `dev` to `main`.
- **Port reads its configuration from the default branch (`main`),** so port config changes have to reach `main`, not only `dev`.

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
- **Commit messages:** a subject ending in the issue number, such as "(#12)", then a short body saying why.
- **Rules used by both the client and the server,** such as statuses, permissions, and limits, live in one shared module and are imported, never copied.
- **Edit files with proper editing tools,** not ad hoc sed or Python scripts for multi-line changes. Use a codemod only for mechanical bulk changes.

## Keeping context between sessions

The repository is the memory. Chat history and local assistant memory do not travel between sessions or machines.

- **`docs/PRD.md`:** what and why. Every decision goes in the decision log with the date and the reason, in the same pull request that acts on it. Add "Turned down" notes so the same idea is not re-proposed.
- **`CLAUDE.md`:** working rules, how to run things, where things live (updated in the same pull request as the feature), patterns, and hard rules.
- **Issues:** findings and decisions go in the closing comment.
- **`docs/`:** longer topics such as `scalability.md`, `sgauth-integration.md`, and this file.
- **UI decisions:** `prototype/concept-2.html` is where layouts are settled. New layouts are mocked there first, and the choice is cited in code. Screens made from existing pieces do not need a mock.

## Open

- **Maintain access:** Luis has write access to the repository. Port setup and branch protection need maintain or admin. Ask Operations.
