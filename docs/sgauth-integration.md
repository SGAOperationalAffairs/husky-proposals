# SGAuth integration

How Husky Proposals signs people in through SGAuth, SGA's shared sign-in service, and what we depend on SGAuth to finish.

- **SGAuth repository:** `SGAOperations/auth`. Its `docs/ENVIRONMENTS.md` and `docs/sgauth-design/` are the source of truth. This file summarizes them for us.
- **SGAuth maintainers:** SGA Operations (Digital Innovation).
- **Last checked:** October 23, 2026 (staleness model and ticket status). Recheck the ticket status before relying on it.

## How it works

- **One sign-in for every SGA product.** Students sign in at `auth.northeasternsga.com` with a northeastern.edu email and a password. Self sign-up is limited to northeastern.edu addresses, and the email must be verified before the first sign-in.
- **A shared cookie.** The session cookie is set on `northeasternsga.com`, so every SGA subdomain receives it. We must live on a subdomain: `proposals.northeasternsga.com`.
- **Session checks on our server.** Our server forwards the cookie to SGAuth's session endpoint, `GET /api/sgauth/session`. The answer gives the user's id, email, name, and positions. The SDK (`@sgaoperations/sgauth`) caches the answer for 60 seconds, and serves a stale answer for up to 5 minutes if SGAuth is down.
- **We key every table on the SGAuth user id** (a UUID). We store no passwords.
- **Signing out anywhere signs out everywhere.**

## Positions and permissions

SGAuth only says which positions a user holds. Husky Proposals decides what each position may do. The keys come from SGAuth's curated list of 82 positions.

| Board | Reviews posts and runs the board | Board members |
|---|---|---|
| All five | `vice-president-of-campus-affairs` | |
| DAB | `chair-of-dining-advisory-board` | `dining-advisory-board-member` |
| CPAB | `chair-of-campus-planning-advisory-board` | `campus-planning-advisory-board-member` |
| CSC | `director-of-campus-services` | `campus-services-committee-member` |
| GIB | `director-of-green-initiatives` | `green-initiatives-board-member` |
| SC | `director-of-sustainability` | `sustainability-committee-member` |

- Keep this mapping in one module, with one function deciding who counts as an SGA leader for seeing names (PRD D16).
- DAB and CPAB chairs serve six-month terms, so these positions change at least twice a year (see `reference/governance-notes.md` (local only)).

## Environments

| Our environment | Our address | SGAuth address (`SGAUTH_URL`) | Cookie name (`SGAUTH_COOKIE_NAME`) |
|---|---|---|---|
| Production | `proposals.northeasternsga.com` | `https://auth.northeasternsga.com` | `__Secure-sgauth.session_token` |
| Dev and previews | `proposals-dev.northeasternsga.com` (a branch domain) | `https://auth-dev.northeasternsga.com` | `__Secure-sgauth-dev.session_token` |
| Local | `proposals.sga.localhost:3001` | `http://auth.sga.localhost:3000` | `sgauth-local.session_token` |

- **Ad hoc `*.vercel.app` previews cannot use sign-in.** The browser never sends a `northeasternsga.com` cookie there.
- **auth-dev is invite-only:** sign-up there needs an allowlist entry (SGAuth #134), and browser pages are behind a password gate.
- **Local development:**
  - Run SGAuth locally at `auth.sga.localhost:3000`, using a personal Neon branch.
  - Never use bare `localhost`. The cookie will not be set there.
  - Chrome resolves `*.localhost` on its own. Firefox and Safari need a hosts-file entry.
- **Until SGAuth's session endpoint ships,** we build against a development-only stand-in. It lets a developer pick a fake user and positions, and returns the same shape as the session endpoint. Swapping in the real SGAuth changes one module.

## What SGAuth must finish

Status as of October 15, 2026.

| Milestone | SGAuth tickets | What it changes for us | Status |
|---|---|---|---|
| **1. Cookie verdict** | #115 | Proves the shared cookie works across browsers. A failure changes our sign-in plan. | Open |
| **2. Ready to connect** | #40 session endpoint, #68 product registry, #43 safe redirects | Real sign-in on `proposals-dev`. The SDK (#69 to #71) is nice to have. Without it, we write a small client against #40's documented response. | Open |
| **3. Students can sign up** | #30 verification, #31 reset, #32 email, #114 scanner-safe links, #37 login pages, #103 production launch | The launch gate. Students cannot sign in until verification email works and SGAuth is live in production. | Open |

Already done in SGAuth:
- #29: email and password sign-in for northeastern.edu.
- #38: the shared cookie.
- #39: session lifetime.
- #22 and #56: the positions schema and seed.
- #26: the product registry schema.
- #46: the dev, preview, and local setup.
- #134: the auth-dev gate.
- Rate limiting, audit logging, structured logs, and security headers.

## Email limits

As of October 15, 2026:

- **SGAuth's email account is on Resend's free plan:** 100 emails a day. The 3,000-a-month cap only matters after a month of full days.
- **The 500-a-day cap in #32 is a setting in SGAuth's own code,** set with a future paid plan in mind. On the free plan, Resend's 100 a day is the real limit.
- **When the limit is hit, sends fail.** Nothing queues or retries the email. The student has to come back and ask again, and resends are limited to 3 an hour per address.
- #32 also caps each address at 10 emails an hour and 30 a day. That stops abuse and does not affect normal sign-ups.
- **Effect on launch:** 1,000 sign-ups in a week means about 10 days of waiting at 100 a day.

**Our side:**
- A staged rollout.
- Remembering a signed-out student's tap until they finish signing in.
- Never asking SGAuth to send email on our behalf.

## Asks for SGAuth

| Ask | Why | Status |
|---|---|---|
| Queue verification and reset emails past the daily limit, instead of failing. Send them oldest first after the reset, ahead of other email. Show "high demand, your email may take until tomorrow" the same way for every address, so it does not reveal which emails have accounts (#82). | #53 already batches invites under the caps. Failures today are silent. | Proposed |
| Move to Resend Pro (about $20 a month) before student volume. Consider one shared SGA account with separate sending domains. | 100 a day is a throughput ceiling, even with a queue. | Proposed |
| Is SGAuth sized for student traffic on the session endpoint? | Every signed-in student action is a live read of SGAuth's database. | To ask |
| Could products verify SGAuth's signed tokens themselves? | Would cut session calls, if SGAuth's design allows it. | To ask |
| Register Husky Proposals in the product registry, and add the `proposals` and `proposals-dev` subdomains. | Needed for redirects, origin checks, and the cookie. | To ask |
| Add our test accounts to the auth-dev sign-up allowlist. | Needed to test on `proposals-dev`. | To ask |
| A deactivation feed, or a batch "are these user ids active" lookup, for registered products. | So we stop emailing deleted or deactivated accounts (see "Stale data"). | To ask (#8) |
| A read-only "current holders of these position keys" lookup for registered products. | So reviewer reminders reach the current chair, not the last one who signed in. | To ask (#8) |
| Can the SDK skip its cache for one call? | For leader actions, which should never run on a stale answer. | To ask (#8) |
| Why Neon? | Every SGA project can be owned in one org. Supabase's free tier was too limited on orgs and projects. | Answered October 15 |

## Stale data

We copy a little of SGAuth's data and cache the rest, so some of it can go stale. Full analysis and decisions in #8.

What SGAuth guarantees (checked October 23, 2026): the session endpoint reads positions and account status live, so a removed position or a deactivated account shows on the very next call (SGAuth #40, #57). Position keys never change, and deleted keys cannot be reused for 365 days (SGAuth #54). Products get no change events and no "who holds this position" lookup.

| What goes stale | Effect | Plan |
|---|---|---|
| Positions in the SDK cache (60 seconds, up to 5 minutes stale while SGAuth is down) | A chair whose term ended keeps powers briefly | Accept 60 seconds. Leader-only actions never use a stale-on-error answer: they fail closed with "SGA tools are unavailable, try again shortly." Students may use the stale answer |
| Name and email copied into `users` | Emails go to an old address; a student who never returns is never refreshed | Refresh on each session check, at most once a day |
| Deactivated or deleted accounts | They cannot act (SGAuth returns 401), but digests keep going | Ask SGAuth for a deactivation feed; until then, stop digests to users not seen in 120 days |
| Who holds a board's chair position | We only learn positions at sign-in, so reminders can reach a former chair and miss a new one | Keep last-seen positions for routing reminders only, never for permissions; always copy the VP; ask SGAuth for a holders lookup |
| Board position keys in `boards` | A retired key leaves a board with no reviewer | Daily check: alert the VP if no chair has been seen in 30 days |
| Open SGA tabs after a role ends | Leader data already loaded stays on screen | Every action and leader page load re-checks the session; leader pages are never cached |
| Taps saved before sign-in, on a shared computer | They could apply to whoever signs in next | Expire after 24 hours, clear on sign-out, and ask before applying |

## How SGAuth is built (useful patterns)

SGAuth uses Next.js 16, Better Auth 1.7, Prisma 7 on Neon, Upstash Redis for rate limits, Resend, and Vercel. It is developed with port, which turns GitHub issues into pull requests through plan, implement, review, and revise agents.

Patterns worth reusing:
- one environment file validated at startup;
- separate pooled and direct database connections;
- scheduled jobs run from GitHub Actions instead of Vercel cron;
- a Neon test branch for CI;
- a mailer that captures emails in tests;
- every emailed link consumes its token only when the user presses a button (Microsoft Safe Links opens every link in incoming mail).
