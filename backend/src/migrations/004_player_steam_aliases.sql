-- 004_player_steam_aliases.sql
CREATE TABLE IF NOT EXISTS player_steam_aliases (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  steam_id   TEXT NOT NULL UNIQUE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psa_player ON player_steam_aliases(player_id);
