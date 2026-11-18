-- The five Campus Affairs boards are reference data every environment needs (#219).
-- They do not go through the seed, which writes invented users and ideas and so only
-- runs locally and in tests.
--
-- On a database that already has them (production) this does nothing. A bare ON CONFLICT
-- covers both the id primary key and the unique category, so a row a board has edited is
-- never overwritten.
--
-- Only the identity columns are set. Per-board settings (review_due_days,
-- update_cadence_days, in_progress_guideline, join_*) keep their schema defaults here.
-- The values match BOARDS, BOARD_POSITIONS, and categoryForBoard in src/core.
INSERT INTO boards (id, name, category, chair_position_key, member_position_key)
VALUES
  ('DAB', 'Dining Advisory Board', 'dining', 'chair-of-dining-advisory-board', 'dining-advisory-board-member'),
  ('CPAB', 'Campus Planning Advisory Board', 'campus_planning', 'chair-of-campus-planning-advisory-board', 'campus-planning-advisory-board-member'),
  ('CSC', 'Campus Services Committee', 'campus_services', 'director-of-campus-services', 'campus-services-committee-member'),
  ('GIB', 'Green Initiatives Board', 'green_initiatives', 'director-of-green-initiatives', 'green-initiatives-board-member'),
  ('SC', 'Sustainability Committee', 'sustainability', 'director-of-sustainability', 'sustainability-committee-member')
ON CONFLICT DO NOTHING;
