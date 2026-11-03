-- The review due time is a per-board setting (#58), 3 days until a board changes it.
-- AlterTable
ALTER TABLE "boards" ADD COLUMN "review_due_days" INTEGER NOT NULL DEFAULT 3;

-- Whole days, 1 to 14. Prisma cannot express a check constraint, so it is added by hand.
ALTER TABLE boards ADD CONSTRAINT boards_review_due_days_range CHECK (review_due_days BETWEEN 1 AND 14);
