-- Uses the closed status added by 20261118120000 (#237): a closed idea needs a reason,
-- and it has no rank, like a delivered one. Same columns in the same order, so
-- CREATE OR REPLACE works and nothing is dropped (a unit test checks the view body
-- against prisma/views).

ALTER TABLE ideas ADD CONSTRAINT ideas_closed_needs_reason
  CHECK (status IS DISTINCT FROM 'closed' OR btrim(coalesce(closed_reason, '')) <> '');

CREATE OR REPLACE VIEW idea_stats AS
WITH counts AS (
  SELECT
    i.id AS idea_id,
    i.board_id,
    i.status,
    b.update_cadence_days,
    (SELECT count(*) FROM supports s WHERE s.idea_id = i.id)::int       AS support_count,
    (SELECT count(*) FROM participations p WHERE p.idea_id = i.id)::int AS willing_count,
    (SELECT count(*) FROM follows f WHERE f.idea_id = i.id)::int        AS follower_count,
    (SELECT max(u.created_at) FROM updates u WHERE u.idea_id = i.id)    AS last_update_at,
    (SELECT max(u.created_at) FROM updates u
      WHERE u.idea_id = i.id AND u.kind IN ('board', 'check_in'))        AS last_counting_update_at,
    i.status_changed_at
  FROM ideas i
  JOIN boards b ON b.id = i.board_id
  WHERE i.review_status = 'approved'
)
SELECT
  idea_id,
  board_id,
  support_count,
  willing_count,
  follower_count,
  CASE
    WHEN status IN ('delivered', 'closed') THEN NULL
    ELSE (rank() OVER (
      PARTITION BY board_id, (status IN ('delivered', 'closed'))
      ORDER BY support_count DESC
    ))::int
  END AS rank_in_board,
  last_update_at,
  (
    coalesce(status = 'in_progress', false)
    AND coalesce(
      greatest(last_counting_update_at, status_changed_at)
        < now() - make_interval(days => update_cadence_days),
      true
    )
  ) AS is_stale
FROM counts;
