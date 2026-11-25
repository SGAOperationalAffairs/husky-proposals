-- Edits to an approved post (#295). Additive only: nothing is dropped or rewritten.
-- The check below does not use the new enum value, so one file is enough.

ALTER TYPE "ReviewKind" ADD VALUE 'edit';

ALTER TABLE "ideas" ADD COLUMN "edit_submitted_at" TIMESTAMP(3);

-- A pending edit exists only on an approved post, so a pull-back or take-down that
-- forgets to clear it fails here instead of leaving an edit nobody can decide.
ALTER TABLE "ideas" ADD CONSTRAINT ideas_edit_only_when_approved
  CHECK (edit_submitted_at IS NULL OR review_status = 'approved');
