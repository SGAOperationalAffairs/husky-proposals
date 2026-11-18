-- Adds the closed status and its reason (#237). Additive only: nothing is dropped or
-- rewritten. Postgres will not let a transaction use an enum value it just added, so
-- every use of 'closed' (the check and the view) is in the next migration.

ALTER TYPE "IdeaStatus" ADD VALUE 'closed';

ALTER TABLE "ideas" ADD COLUMN "closed_reason" TEXT;
