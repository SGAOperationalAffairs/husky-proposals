-- Adds the taken_down review status and the send_back review kind (#286). Additive only:
-- nothing is dropped or rewritten. Postgres will not let a transaction use an enum value
-- it just added, so every use of 'send_back' (the check) is in the next migration.

ALTER TYPE "ReviewStatus" ADD VALUE 'taken_down';

ALTER TYPE "ReviewKind" ADD VALUE 'send_back';
