# Husky Proposals

A website where Northeastern students post ideas for campus, support the ones they care about, offer to help, and follow what happens next. Student Government Association (SGA) Campus Affairs boards review new posts, choose ideas to work on, and post updates.

Support helps SGA decide. It is not a binding vote.

## Status

Planning. No application code yet. Version 1 targets early December 2026, for the five Campus Affairs boards:
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

## Where to start

- `CLAUDE.md`: product rules, stack, and working rules, for people and AI agents.
- `docs/`: data model, build plan, development process, SGAuth integration, and scalability.
- `prototype/concept-2.html`: a clickable prototype. Open it in a browser.
- `design/`: wireframes and design tokens.

## Contributing

- Work is tracked in GitHub Issues.
- Feature branches merge into `dev` by pull request, and `dev` is released into `main`.
- See `docs/dev-process.md`.

Owned by SGA Operations (Digital Innovation).
