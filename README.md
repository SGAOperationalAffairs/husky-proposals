# Husky Proposals

A website where Northeastern students post ideas for campus, support the ones they care about, offer to help, and follow what happens next. Student Government Association (SGA) Campus Affairs boards review new posts, choose ideas to work on, and post updates.

Support helps SGA decide. It is not a binding vote.

## Status

The scaffold is in. The ideas list and the idea page run on invented sample data (`src/app/_ideas/`). There is no database, sign-in, or email yet. Dates are in `docs/timeline.md`: SGA soft launch November 30, 2026, and a proposed student launch January 20, 2027.

Version 1 covers the five Campus Affairs boards:
- the Dining Advisory Board;
- the Campus Planning Advisory Board;
- the Campus Services Committee;
- the Green Initiatives Board;
- the Sustainability Committee.

## Stack

- Next.js (App Router) with TypeScript
- Prisma on Neon Postgres
- Vercel
- SGAuth, SGA's shared sign-in
- Resend for email

## Requirements

- Node 22 (`.nvmrc`). `package.json` allows `>=22.12 <23 || >=24`, and `.npmrc` sets `engine-strict=true`, so `npm install` refuses Node 23. Prisma 7 does not support 23.
- To switch versions, run `nvm use`. Or, with Homebrew: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`.
- npm. The repo uses `package-lock.json`.

## First-time setup

1. Clone the repository and check out `dev`, the default branch.
2. Run `npm install`. Its `postinstall` runs `prisma generate` into `src/generated/prisma/`, which is not committed.
3. Run `cp .env.example .env.local`.
4. Optional, for browser tests only: `npx playwright install chromium webkit`. Add `firefox` if you will run `verify:all`.

## Environment variables

| Variable | Values | Default in `.env.example` | What it does |
|---|---|---|---|
| `APP_ENV` | `local`, `test`, `preview`, `dev`, `production` | `local` | Says where the app is running. It also turns on `/playground` at build time (`next.config.ts`). |
| `AUTH_STAND_IN` | `0`, `1` | `1` | Turns on the development sign-in stand-in. Only allowed when `APP_ENV` is `local` or `test`. The stand-in lands with T0.6, so today the flag is checked but does nothing. |

`src/env.ts` is the source of truth. If a variable is missing or invalid, the server stops at startup with "Refusing to start. Fix the environment:" and a list (`src/instrumentation.ts`).

`DATABASE_URL` and `DIRECT_URL` are not needed yet. `prisma.config.ts` uses a placeholder for offline commands, and the real ones arrive with T0.4 and T0.5.

Never commit `.env.local` or real values.

## Run it

```
npm run dev
```

Then open http://localhost:3000.

Pages that exist today:

| Path | What it is |
|---|---|
| `/` | The ideas wall |
| `/in-progress` | Ideas the boards are working on |
| `/ideas/<number>` | One idea |
| `/playground` | The style playground. Only when `APP_ENV` is `local` or `test`. It is a 404 in production builds. |

`design/playground-templates.json` must match `design/tokens.css`. A test checks this.

For a production-like run, use `npm run build`, then `npm start`.

## Scripts

| Script | What it does |
|---|---|
| `dev` | Starts the development server |
| `build` | Makes a production build |
| `start` | Serves the production build |
| `lint` | Runs ESLint |
| `lint:fix` | Runs ESLint and fixes what it can |
| `format` | Formats every file with Prettier |
| `format:check` | Checks formatting without changing files |
| `typecheck` | Generates Next.js types, then runs `tsc --noEmit` |
| `check:styles` | Fails on hardcoded values that a design token covers |
| `test` | Runs unit and component tests once (Vitest) |
| `test:watch` | Runs Vitest in watch mode |
| `test:browser` | Runs browser tests (Playwright) |
| `verify` | Full check, as in CI |
| `verify:agent` | The same without the build or browser tests |
| `verify:all` | `verify` plus Firefox |
| `db:validate` | Validates `prisma/schema.prisma` |
| `db:generate` | Generates the Prisma client |

## Checks

`scripts/verify.mjs` has three tiers:

- `verify:agent` runs format, lint, types, styles, schema, and the unit and component tests.
- `verify` adds the production build and browser tests on Chromium and iPhone WebKit. The browser tests run against `next start` on port 3100.
- `verify:all` adds Firefox.

CI (`.github/workflows/verify.yml`) runs `npm run verify` on every pull request. Run it before you open one.

## Versions

| Tool | Version |
|---|---|
| Node | 22 |
| Next.js | 16.4.3 |
| React | 19.3.0 |
| Prisma | 7.10.1 |
| TypeScript | 5 (strict) |
| Tailwind | 4 |
| zod | 4 |
| Vitest | 5 |
| Playwright | 1.64 |

Prisma is pinned to 7.10.x. npm's `latest` tag points at an 8.0 release candidate, so never install Prisma unpinned. If this table and `package.json` disagree, `package.json` is right.

## Troubleshooting

- **`npm install` fails with `EBADENGINE`.** You are on the wrong Node version. Switch to Node 22.
- **The server prints "Refusing to start".** Fix `.env.local` against the variables table above.
- **`/playground` is a 404.** `APP_ENV` is not `local` (or `test`).

## Where to start

- `CLAUDE.md`: product rules, stack, and working rules, for people and AI agents.
- `docs/ENGINEERING.md`: patterns, and the "Where things live" table.
- `docs/timeline.md`: dates by epic.
- `docs/`: data model, build plan, development process, SGAuth integration, and scalability.
- `prototype/concept-2.html`: a clickable prototype. Open it in a browser.
- `design/`: wireframes and design tokens.

## Contributing

- Work is tracked in GitHub Issues.
- Branches are named `<issue>-<slug>` and cut from `dev`.
- Commit subjects look like `#N <imperative lowercase summary>`.
- Run `npm run verify` before you open a pull request.
- Never push straight to `dev` or `main`. Feature branches merge into `dev` by pull request, and `dev` is released into `main`.
- Docs-only changes go through the docs sidecar (#22).
- See `docs/dev-process.md`.

Owned by SGA Operations (Digital Innovation).
