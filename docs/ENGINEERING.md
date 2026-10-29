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
| `design/tokens.css` | The single source of design tokens, mapped into Tailwind in `src/app/globals.css` |
| `prisma/schema.prisma` | The data model's source of truth |
