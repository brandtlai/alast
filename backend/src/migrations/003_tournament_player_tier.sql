-- 003_tournament_player_tier.sql
CREATE TABLE IF NOT EXISTS tournament_player_assignment (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tier          TEXT NOT NULL CHECK (tier IN ('S','A','B','C+','D')),
  pick_order    INTEGER,
  is_captain    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (tournament_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_tpa_tournament ON tournament_player_assignment(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tpa_player ON tournament_player_assignment(player_id);
