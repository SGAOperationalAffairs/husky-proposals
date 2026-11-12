-- Drops the retired under_review status (#202). A removal, so it ships in its own release,
-- after the read path that maps it (#197) is on dev. Rows still holding it move to
-- collecting_support first.
--
-- Two things reference the status column and must come out around the type change:
-- the idea_stats view (Postgres will not alter a column a view uses), and the waiting-reason
-- check, which compares status to a literal of the old type and is re-checked during the change.

UPDATE ideas SET status = 'collecting_support' WHERE status = 'under_review';

DROP VIEW idea_stats;
ALTER TABLE ideas DROP CONSTRAINT ideas_waiting_needs_reason;

ALTER TYPE "IdeaStatus" RENAME TO "IdeaStatus_old";
CREATE TYPE "IdeaStatus" AS ENUM ('collecting_support', 'in_progress', 'delivered', 'waiting');
ALTER TABLE ideas ALTER COLUMN status TYPE "IdeaStatus" USING status::text::"IdeaStatus";
DROP TYPE "IdeaStatus_old";

ALTER TABLE ideas ADD CONSTRAINT ideas_waiting_needs_reason
  CHECK (status IS DISTINCT FROM 'waiting' OR btrim(coalesce(waiting_reason, '')) <> '');

-- The same view body as migration 20261102120100 (a unit test checks it against prisma/views).
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
