-- Hand-written (#44): the idea_stats view and four check constraints. Prisma's
-- generated migration cannot express these. The view body must match
-- prisma/views/public/idea_stats.sql (a unit test checks it). Additive only.

CREATE VIEW idea_stats AS
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
    WHEN status = 'delivered' THEN NULL
    ELSE (rank() OVER (
      PARTITION BY board_id, (status = 'delivered')
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

-- Status is null unless the post is approved (schema rule). One-directional: the
-- approve writer sets collecting_support itself.
ALTER TABLE ideas ADD CONSTRAINT ideas_status_only_when_approved
  CHECK (status IS NULL OR review_status = 'approved');

-- A waiting idea has a reason students see (schema rule).
ALTER TABLE ideas ADD CONSTRAINT ideas_waiting_needs_reason
  CHECK (status IS DISTINCT FROM 'waiting' OR btrim(coalesce(waiting_reason, '')) <> '');

-- A take-down is a decline (#49).
ALTER TABLE reviews ADD CONSTRAINT reviews_take_down_is_decline
  CHECK (kind <> 'take_down' OR decision = 'declined');

-- Declines and take-downs carry a written reason.
ALTER TABLE reviews ADD CONSTRAINT reviews_decline_needs_reason
  CHECK (decision <> 'declined' OR btrim(coalesce(reason, '')) <> '');
