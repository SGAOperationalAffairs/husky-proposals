-- idea_stats: counts, rank, and the 14-day flag for approved ideas (#6).
-- Draft. Created in a hand-written migration with the scaffold (T0.5) and
-- read through the IdeaStats view in schema.prisma. One grouped pass, so a
-- page never runs one query per idea.
--
-- Rank: within the board, among approved ideas that are not delivered, by
-- support count. Ties share a rank. Wording in the app must not read rank as
-- a promise.

CREATE VIEW idea_stats AS
WITH counts AS (
  SELECT
    i.id AS idea_id,
    i.board_id,
    i.status,
    (SELECT count(*) FROM supports s WHERE s.idea_id = i.id)::int       AS support_count,
    (SELECT count(*) FROM participations p WHERE p.idea_id = i.id)::int AS willing_count,
    (SELECT count(*) FROM follows f WHERE f.idea_id = i.id)::int        AS follower_count,
    (SELECT max(u.created_at) FROM updates u WHERE u.idea_id = i.id)    AS last_update_at,
    i.status_changed_at
  FROM ideas i
  WHERE i.review_status = 'approved'
)
SELECT
  idea_id,
  board_id,
  support_count,
  willing_count,
  follower_count,
  CASE
    WHEN status = 'delivered' THEN NULL
    ELSE (rank() OVER (
      PARTITION BY board_id, (status = 'delivered')
      ORDER BY support_count DESC
    ))::int
  END AS rank_in_board,
  last_update_at,
  (
    status = 'in_progress'
    AND coalesce(last_update_at, status_changed_at) < now() - interval '14 days'
  ) AS is_stale
FROM counts;
