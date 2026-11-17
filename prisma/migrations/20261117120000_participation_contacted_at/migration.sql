-- Adds when a leader marked a volunteer contacted (#229, part of #129).
-- Additive and nullable: no default, no backfill. Rows stay null until a leader acts.
ALTER TABLE participations ADD COLUMN contacted_at TIMESTAMP(3);
