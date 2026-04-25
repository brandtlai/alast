-- 002_bracket_structure.sql
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS bracket_kind TEXT
    CHECK (bracket_kind IN ('swiss','ub','lb','gf')),
  ADD COLUMN IF NOT EXISTS bracket_round INTEGER,
  ADD COLUMN IF NOT EXISTS best_of INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tournaments_current
  ON tournaments(is_current) WHERE is_current = TRUE;

ALTER TABLE csdm_imports
  ADD COLUMN IF NOT EXISTS checksum TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_csdm_imports_match_checksum
  ON csdm_imports(match_id, checksum)
  WHERE match_id IS NOT NULL AND checksum IS NOT NULL;
