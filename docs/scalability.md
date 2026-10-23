# Scalability and cost plan

How Husky Proposals stays fast, cheap, and inside free-tier limits as it grows from a pilot to thousands of students. Decisions here are also logged in the PRD (local only).

**Status:** agreed in discussion, October 15 to 22, 2026. The numbers are estimates. Recheck them after the pilot, using real data.

## The main point

At thousands of users, servers and load balancing are not the risk. Vercel scales on its own, and Postgres handles this volume easily. The risks are:

- free-tier quotas that fail suddenly;
- email that fans out to many people at once;
- calls to services shared with the rest of SGA (SGAuth), where a problem we cause affects every SGA product.

## Design targets

| Measure | Target to design for |
|---|---|
| Accounts | About 20,000 (roughly every undergraduate on the Boston campus) |
| Monthly active students | About 5,000 |
| Spike | About 2,000 visits in one hour, after a campus-wide email or a popular post |
| Data | Hundreds of ideas and tens of thousands of supports |

The first-semester goal in the PRD is about 500 students. We design for 10 times that, so success does not force a rewrite.

## 1. Pages and sign-in load

- **Browsing needs no sign-in** (PRD D18). The ideas list, idea pages, the In progress tab, updates, and support counts are public and cached. Browsing never calls SGAuth and rarely wakes the database.
- **Only actions need a session:** support, I'll participate, follow, post, and the SGA side.
- **Every session check reads SGAuth's database.** SGAuth caches nothing in the cookie, and the SDK caches answers for 60 seconds per server instance. Fewer checks keep SGAuth's database and quota healthy for every SGA product.
- **Ask SGAuth:** could products verify SGAuth's signed tokens themselves, instead of calling the session endpoint on every request? Those tokens were built for Supabase products, so this is a design question for SGAuth. See `sgauth-integration.md`.
- **Kept out of search engines:** a `noindex` tag and an `X-Robots-Tag: noindex` header on every page. No `robots.txt` block, because a crawler that is blocked never sees the `noindex`. No sitemap. Link previews still work.

## 2. Database (Neon)

**Decision:** our own Neon project inside the SGAOperations Neon org (decided October 15).

How Neon bills: by the hour the database is awake, measured in compute-unit hours (CU-hours), not by query. It suspends after 5 minutes with no queries and wakes on the next request. The first request after waking is slower.

| Stage | Likely awake time | CU-hours a month (at 0.25 CU) | Fits free (100 CU-hours)? |
|---|---|---|---|
| Pilot, about 500 students | 6 to 8 hours a day | 45 to 60 | Yes |
| Target, about 5,000 active | About 17 hours a day | About 130 | No. About $14 to $20 a month on the paid Launch plan |

How we keep it healthy:

- Use the pooled connection string at runtime and the direct one for migrations.
- Index the support, follow, and status queries.
- Compute support counts with one grouped query per page, never one query per idea.
- Keep a stored counter in reserve, in case counting ever gets slow.
- Cache public pages, so reads do not wake the database.
- Alert at 50%, 70%, and 85% of the compute quota.
- Set a maximum autoscaling size, so the bill has a ceiling.
- Plan to upgrade when monthly active students pass about 1,500, or when the 70% alert fires two months in a row.

**Backups:** a nightly `pg_dump` run by a scheduled job.
- The dump is encrypted before upload, because it contains who posted anonymously and who supported what.
- It is stored in a private bucket that only maintainers can read, kept for 14 to 30 days.
- Test a restore before launch, and once a semester after that.
- This also covers our own mistakes, such as a bad migration or a deleted table.

**Alternatives considered:**

- **Supabase:** its free tier fits our data with room to spare, but projects pause after a week with no activity, and the free plan has no daily backups. The deciding reason was org ownership: SGA chose Neon so every project lives in one org, which Supabase's free tier limits.
- **Self-hosted Postgres:** cheap, but someone has to handle backups and patching. Too much for a handoff.

## 3. Email

### Volume estimate at target

Assumptions:
- 5,000 monthly active students;
- 30% follow at least one idea, so about 1,500 followers, each following about 3 ideas;
- about 10 ideas in progress across the five boards;
- about 25 idea events a month.

| Email | Without batching | Daily digest | Weekly digest |
|---|---|---|---|
| Updates to followers | 4,000 to 6,000 a month, with about 750 in one day when boards post the same night | About 9,000 a month | **About 4,500 a month** |
| Decision on a student's own post | About 200 | About 200 | About 200 |
| Reviewer reminders to leaders | About 300 | About 300 | About 300 |
| Monthly summary (later) | 0, because it goes in the SGA Monthly Newsletter | 0 | 0 |
| **Total** | About 5,000 to 7,000 | About 10,000 | **About 5,000** |

SGAuth's sign-in emails (verification, reset) come from SGAuth's own account, not ours. They are covered in `sgauth-integration.md`.

### Design

| Layer | Choice |
|---|---|
| Provider | **Resend.** Free tier during the pilot. **Pro (about $20 a month for 50,000 emails) before the full launch,** ideally one shared SGA account with a separate sending domain per product. |
| In code | One provider-neutral `sendEmail()` function, so switching to Amazon SES (about $0.10 per 1,000) later changes one file. SES is the exit if volume or cost ever grows 10 times. |
| Sender | A dedicated subdomain, for example `updates.northeasternsga.com`, with SPF, DKIM, DMARC, and one-click unsubscribe headers. Kept separate so complaints about digests cannot hurt SGAuth's sign-in email. |
| Queue | An outbox table in our database. Every email is a row with a type, a priority, a dedupe key so nothing sends twice, and a retry count. Emails are sent first in, first out within each priority. When a limit is hit, emails wait and retry. None are dropped. |
| Priorities | 1. Decision on a student's own post, sent right away. 2. Reviewer reminders. 3. Digests. |
| Sending | Decisions are sent right after the database write, with the outbox as the retry. Digests are sent by a worker that a scheduled job calls every 15 minutes. It uses Resend's batch sending and a daily budget we set, counted in Postgres so every server instance shares one count. |
| Weekly digest | **The default.** Students can choose "as it happens" (at most one email a day) or "off." Each student is assigned a weekday, so a weekly digest to 1,500 students goes out as about 215 a day instead of one burst. |
| Bounces | A Resend delivery webhook marks bounced or complaining addresses and stops sending to them. Aplio has a working example in `app/api/webhooks/resend`. |

**Open question:** does supporting an idea also follow it? With weekly digests the cost is manageable either way, so this is mostly about what students expect.

## 4. Actions: support, follow, and posting

These work the way social apps handle likes. Students act freely, and nothing visible limits them.

- **Set the state, do not toggle it.** The request says "supported: yes" or "supported: no." A unique rule in the database on (student, idea) guarantees one support each. Double taps and retries do no harm.
- **The button responds instantly.** Rapid taps collapse into one request carrying the final state.
- **Counts can lag slightly.** Cached pages show counts that refresh within seconds.
- **Supporting or withdrawing never sends notifications,** so changing your mind costs nothing.
- **Abuse limits sit far above human behavior,** for example 60 changes a minute per student, only to stop scripts.
- **Posting is the only visible limit:** at most 3 posts waiting for review per student, explained plainly. It protects reviewers' time.
- **A signed-out student's tap is remembered** in the browser and applied once they finish signing in (PRD decision log, October 15).

## 5. Monitoring and load testing

**Alerts:**
- 50%, 70%, and 85% of the Neon compute, email, and Vercel quotas;
- an external uptime monitor on a health route that queries the database;
- error tracking.

**Load test before launch,** with k6 against `proposals-dev` and the sign-in stand-in:

1. **The spike:** 2,000 visits in an hour.
2. **Support burst:** 200 students supporting the same idea within a minute.
3. **Digest run:** a weekly digest to 1,500 students.

Measure response times, CU-hours used, and session calls to SGAuth in each scenario.

## 6. Paid services to expect

| Item | When |
|---|---|
| Neon compute beyond the free tier | Past about 1,500 monthly active students |
| Resend Pro | Before the full launch |
| Backup storage | From launch, likely within a free tier |

Budgets and approvals are handled by SGA outside this repository.
