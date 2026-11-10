-- A status change or update on a followed idea, queued once per follower (#101).
-- Additive only: no existing row or column changes.
ALTER TYPE "EmailType" ADD VALUE 'idea_event';
