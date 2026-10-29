# Engineering

Patterns and where things live. Port's agents read this file and its review agent cites it, and unlike `CLAUDE.md` they can edit it. Update it in the same pull request as the feature that adds a pattern or a folder.

`/port:analyze` will later merge its findings into this file instead of replacing it. Where this file and `CLAUDE.md` disagree, `CLAUDE.md` wins.

Created with the scaffold (#26).

## Patterns

- **Responsive components use container queries** (`@container` on a parent, `@lg:` and `@2xl:` on the component), not screen breakpoints, so they fit narrow columns, drawers, and the playground's phone preview. Screen breakpoints (`md:`, `lg:`) are for page layout only (#29).

None yet. Fill this in as the first features land (the rest), and no later than the fifth feature:
- one component per idea (cards, chips, dialogs);
- one hook per feature;
- the shared rules module;
- the validation helpers;
- the new-feature checklist: "Which component or hook does this extend? Which test fails first?"

## Where things live

| Path | What |
|---|---|
| `src/app/` | Next.js routes, layouts, and server actions. Thin: they receive requests and call core modules |
| `src/core/` | Plain TypeScript rules: statuses and transitions, permissions, limits, viewer shapes. Never imports Next.js, React, or the database (lint rule) |
| `src/db/` | The only place that talks to Prisma: shared field lists, filters, and named queries |
| `src/db/sql/` | The only place for raw SQL, as tagged `$queryRaw` parsed with zod (lint rule) |
| `src/auth/` | The sign-in module: SGAuth session, the development stand-in, and positions to boards |
| `src/email/` | `sendEmail()`, the outbox worker, and templates |
| `src/env.ts` | The only reader of `process.env`, validated with zod. Checked at server start by `src/instrumentation.ts` |
| `src/generated/prisma/` | The generated Prisma client. Not committed; `npm install` rebuilds it |
| `prisma.config.ts` | Prisma CLI config: migrations path and the direct URL, with a placeholder for offline commands |
| `scripts/verify.mjs` | `npm run verify` and its tiers |
| `tests/browser/` | Playwright tests against the production build (Chromium, iPhone WebKit; Firefox in `verify:all`) |
| `scripts/check-styles.mjs` | The style guard: no arbitrary Tailwind values, no radius or shadow classes outside the tokens, no hex colors |
| `src/components/` | The real UI components, presentational: state comes in as props. Idea card, status label, tags, support pair and squares, button, fields, tabs and badges, queue row |
| `src/playground/` | The style playground (#29): templates, sample content, and the page itself. Local only |
| `src/app/playground/*.dev.tsx` | The playground route. `.dev.tsx` files compile only when `APP_ENV` is local or test (`next.config.ts`) |
| `design/playground-templates.json` | Whole-app style templates as token sets. Civic must match `design/tokens.css` (a test checks) |
| `design/tokens.css` | The single source of design tokens, mapped into Tailwind in `src/app/globals.css` |
| `prisma/schema.prisma` | The data model's source of truth |
