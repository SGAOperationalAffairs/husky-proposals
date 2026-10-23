# Data model (proposed)

This is a starting point derived from the PRD and the prototype. It is a proposal, not a decision. Confirm it with Luis before building migrations. Types are indicative.

**`prisma/schema.prisma` is now the source of truth for fields and types** (drafted October 23, 2026, #6). This file keeps the rules, states, visibility, and permissions in prose. Where the two differ on a field, the schema wins.

Updated October 22, 2026: users come from SGAuth, roles come from SGAuth positions, and the email outbox, preferences, and limits follow `scalability.md`.

## Entities

**user**
`id` (the SGAuth user id, a UUID), `email`, `display_name`, `created_at`, `last_seen_at`.
- SGAuth is the source of truth for identity. We store the name and email from the session so the queue and emails work. We refresh them on sign-in.
- No passwords.

**Roles come from SGAuth positions, not from our tables.**
- Each session lists the user's position keys.
- One module maps keys to boards and abilities. See `sgauth-integration.md` for the table.
- Who counts as an "SGA leader" for seeing names is open (PRD D16). Model it as one function that can change.

**board**
`id`, `code` (DAB, CPAB, CSC, GIB, SC), `name`, `category_tag`, `chair_position_key`, `member_position_key`.
- Categories students pick map to boards: Dining to DAB, Campus Planning to CPAB, Campus Services to CSC, Green Initiatives to GIB, Sustainability to SC.
- Other Campus Affairs services can default to CSC, which advocates for "any and all campus services" (Bylaws IV).
- How to handle ideas outside Campus Affairs is open (D15).

**idea**
`id`, `number` (public, like "Proposal 103"), `title`, `description`, `full_text` (optional), `board_id`, `category`, `location`, `scale` (small, medium, large), `cost_band` (under $1k, $1k to $5k, $5k+), `time_horizon`, `author_id`, `is_anonymous`, `review_status` (pending, approved, declined), `decline_reason`, `status` (collecting_support, under_review, in_progress, delivered, waiting), `waiting_reason`, `created_at`, `approved_at`, `promoted_at` and `promoted_by` (later), `delivered_at`.

**idea_revision** (for edit and resubmit)
`id`, `idea_id`, `version`, the editable fields, `submitted_at`.

**review**
`id`, `idea_id`, `revision_id`, `reviewer_id`, `decision` (approved, declined), `reason` (required when declined), `decided_at`.
- `due_by` on the idea or review is `submitted_at + 3 days`. It drives the red number and the 90% target.
- If declines turn out to be appealable (PRD D9), add an appeal link to the decline message. There is no appeal flow in the app.

**support**
`user_id`, `idea_id`, `created_at`. Unique on (`user_id`, `idea_id`).
- Support is unlimited per student.
- Writes set the state ("supported: yes or no"). They never toggle, so retries and double taps do no harm.

**participation** ("I'll participate")
`user_id`, `idea_id`, `created_at`, `contact_status` (new, contacted, joined, later). Unique on (`user_id`, `idea_id`). Check-in cadence fields come later.

**follow**
`user_id`, `idea_id`, `created_at`. Unique on (`user_id`, `idea_id`).

**update**
`id`, `idea_id`, `author_id`, `body`, `created_at`, `kind` (board or system).
- System updates are written when an idea starts, is delivered, or moves board, so students see them in the progress list.
- Updates from DAB and CPAB must not reveal confidential administrative initiatives (Bylaws XII).

**email_preference**
`user_id`, `digest_frequency` (weekly, as_it_happens, off; default weekly), `digest_weekday` (assigned on creation, used to spread weekly sends), `unsubscribed_at`, `bounced_at`.

**email_outbox**
`id`, `user_id`, `type` (post_decided, reviewer_reminder, digest), `priority` (1 is highest), `dedupe_key` (unique), `payload`, `created_at`, `send_after`, `attempts`, `sent_at`, `last_error`.
- A worker sends rows first in, first out within each priority, under a daily budget.
- When a limit is hit, rows wait for the next run. None are dropped.

**send_budget**
`day`, `sent_count`. A shared daily count, so every server instance respects one email budget.

**access_log** (proposed)
`id`, `viewer_id`, `idea_id`, `what` (author or supporters), `viewed_at`.
- Logs when a leader views names.
- Whether to log is open (D16).

## Derived values (compute, do not store)

- `support_count` per idea (public). Computed with one grouped query per page. Keep a stored counter in reserve, in case counting gets slow.
- `rank` within the board: rank among that board's ideas that are not delivered, by `support_count`.
- `willing_count`: number of participations.
- `stale`: an in-progress idea whose latest update is more than 14 days old, or that has none.
- `board_load`: in-progress ideas for a board, where a large idea counts as 2. Compare with the soft guideline (default 2). Starting an idea past the guideline shows a heads-up and a confirm, not a block.
- `pending_posts` per student: the number of their posts with review status `pending`.

## State rules

**Review status:**
- `pending` moves to `approved` or `declined`.
- A declined idea returns to `pending` when the author edits and resubmits.
- Only reviewers can decide. A decline needs a written reason.
- Approved ideas become visible to everyone with the link.
- A student can have at most 3 posts pending at once.

**Idea status** (only on approved ideas):
- New ideas start at `collecting_support`.
- A board can move an idea among `collecting_support`, `under_review`, and `waiting`.
- A board can start work on an idea from `collecting_support`, `under_review`, or `waiting`, moving it to `in_progress`. Write a system update.
- `in_progress` moves to `delivered`. Write a system update.
- `waiting` requires a `waiting_reason` that students see.
- Changing an idea's board writes a system update ("Moved to the ...").

**Support and follow:**
- Changing support or follow never creates an email.
- An abuse limit, about 60 changes a minute per student, stops scripts. People never reach it.

## Visibility and privacy

- **Public, no sign-in needed:** approved ideas, `support_count`, rank, status, updates, and board. Every page has `noindex` (PRD D18).
- **Signed-out visitors and students (not the author):** get the student shape.
  - They never receive `author_id` or supporter identities.
  - If `is_anonymous` is true, they never see the author's name at all.
  - Pending and declined posts are never shown to them.
- **The author:** sees their own post and its review status, with the reviewer's reason if declined.
- **SGA leaders:** see the author and supporters. How to define "leader" is open (D16). So is whether to log views.
- **Separate response shapes:** return different shapes for students and leaders, so private fields cannot leak by accident. Test this.
- **Confidential records:** who posted and who supported must be designated confidential records in SGA's data policy (D14, Bylaws XVII).

## Permissions

| Action | Signed-out visitor | Student | Chair or director (own board) | VP of Campus Affairs | Other SGA leader |
|---|---|---|---|---|---|
| Browse approved ideas | Yes | Yes | Yes | Yes | Yes |
| Post an idea (anonymous optional) | No | Yes | Yes | Yes | Yes |
| Support, follow, offer to help | No (the tap is remembered until they sign in) | Yes | Yes | Yes | Yes |
| See pending posts and decide them | No | No | Own board | All boards | Open |
| See who posted and who supported | No | No | Yes | Yes | Open (D16) |
| Move an idea through statuses, post updates | No | No | Own board | All boards | No |
| Change an idea's board | No | No | No | Yes | No |
| See the People list (volunteers) | No | No | Own board | All boards | Open |
| Promote an idea (later) | No | No | Open | Open | Open |

"Open" means not decided yet.

## Screens (from the prototype)

**Student:**
- Ideas list
- In progress list
- One idea page
- Submit an idea
- Share (later)
- My posts and their status
- Email preferences

**SGA:**
- Queue, with board, status, and sort filters
- Idea panel, with decide actions and edit board
- Propose
- Updates
- People (the check-in cadence comes later)
- Options

## Gaps found in the schema review

Found while drawing the FigJam review diagrams (October 23, 2026, #6). Each needs a decision before the epic named in brackets. The schema's provisional defaults are listed in its comments.

**States and transitions:**
1. **No way to take down an approved idea.** Approved is final today. If something slips past review (a private name, abuse), nobody can unpublish it. Proposed: a reviewer or the VP can return it to `declined` with a reason, written to the review history. [E4]
2. **No way for a student to withdraw a post.** A pending post the author no longer wants counts toward their 3 pending until someone declines it. Proposed: the author can withdraw a pending or declined post. [E4]
3. **In progress only moves to delivered.** Real work stalls or gets dropped. Proposed: in progress can move to waiting, with a reason, and that writes a system update. [E7]
4. **Delivered is final.** Fine for launch. Say so in the leader guide. [E10]
5. **Editing after approval.** Not covered. Proposed: authors cannot edit an approved idea; they post a new one or ask the board to add an update. [E4]

**Who sees what:**

6. **Author names on posts that are not anonymous.** The rules say the student shape never includes `author_id`, and anonymous posts show no name. They never say whether a non-anonymous author's name is public. Proposed: yes, the display name only, never the email. [E5]
7. **A reviewer's own post.** Leaders can post ideas. Nothing stops a chair from approving their own post. Proposed: a reviewer cannot decide their own post; the VP decides it, and the board's chair or director decides the VP's. [E4]
8. **Board members.** `member_position_key` is stored, but the permissions table gives board members nothing beyond what students get. They matter only if D16 lands on option B. [E8]

**Rules the schema needs a number or a definition for:**

9. **Which updates reset the 14-day clock.** The view counts every update, including system ones, so moving an idea to another board resets it. Proposed: only board updates and the start event count. [E8]
10. **Support on delivered ideas.** Allowed or not? Rank leaves delivered ideas out, but support is still possible. Proposed: allowed, since it shows demand to administration. [E6]
11. **Deleting an account removes that student's supports,** so public counts drop. Proposed: accept it, and say so in the privacy notice. The alternative is keeping anonymous support rows. [D14]
12. **Who receives reviewer reminders,** the board's chair or director, the VP, or both, and when. [E9]
13. **Does the author follow their own post?** Proposed: yes, automatically, so they get updates on their own idea. [E6]
14. **The abuse limit needs a shared store.** About 60 changes a minute per student only works if every server instance counts together. We have no Redis. Proposed: a small Postgres table, or Upstash like SGAuth. [E6]
15. **Graduate students (D22).** Nothing in the session or the schema tells an undergraduate from a graduate student. If only undergraduates may act, SGAuth has to say so. [E3]
16. **Waiting reasons.** The prototype offers five set reasons. The schema stores free text. Proposed: the set reasons in the form, saved as text, with "other" allowing free text. [E7]
