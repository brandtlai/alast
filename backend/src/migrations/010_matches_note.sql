-- 010_matches_note.sql
-- Optional note shown on a match card / detail page (e.g. reschedule notice).
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS note TEXT;
