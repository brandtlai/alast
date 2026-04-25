-- 005_match_substitutes.sql
CREATE TABLE IF NOT EXISTS match_substitutes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  lender_team_id   UUID REFERENCES teams(id) ON DELETE SET NULL,
  borrower_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  UNIQUE (match_id, player_id)
);
