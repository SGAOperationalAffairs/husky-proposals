# Engineering

Patterns and where things live. Port's agents read this file and its review agent cites it, and unlike `CLAUDE.md` they can edit it. Update it in the same pull request as the feature that adds a pattern or a folder.

`/port:analyze` will later merge its findings into this file instead of replacing it. Where this file and `CLAUDE.md` disagree, `CLAUDE.md` wins.

Created with the scaffold (#26).

## Patterns

None yet. Fill this in as the first features land, and no later than the fifth feature:
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
| `scripts/check-styles.mjs` | The style guard: no arbitrary Tailwind values, no radius or shadow classes outside the tokens, no hex colors |
| `design/tokens.css` | The single source of design tokens, mapped into Tailwind in `src/app/globals.css` |
| `prisma/schema.prisma` | The data model's source of truth |
