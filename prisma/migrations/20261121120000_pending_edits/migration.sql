-- Editing an approved post (#295). Additive only: nothing is dropped or rewritten.
-- edit_submitted_at is set while an edit waits for review; the edit is the idea's latest
-- revision. The check constraint does not use the new enum value, so one file is enough.

ALTER TYPE "ReviewKind" ADD VALUE 'edit';

ALTER TABLE "ideas" ADD COLUMN "edit_submitted_at" TIMESTAMP(3);

-- A pending edit is impossible on any post that is not approved, so a take-down stays final
-- whatever edit was waiting.
ALTER TABLE "ideas" ADD CONSTRAINT ideas_edit_only_when_approved
  CHECK (edit_submitted_at IS NULL OR review_status = 'approved');
