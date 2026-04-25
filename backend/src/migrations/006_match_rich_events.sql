-- 006_match_rich_events.sql
CREATE TABLE IF NOT EXISTS match_rounds (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_map_id           UUID NOT NULL REFERENCES match_maps(id) ON DELETE CASCADE,
  round_number           INTEGER NOT NULL,
  winner_side            INTEGER,
  winner_team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
  end_reason             INTEGER,
  duration_ms            INTEGER,
  team_a_side            INTEGER,
  team_b_side            INTEGER,
  team_a_score           INTEGER,
  team_b_score           INTEGER,
  team_a_economy_type    TEXT,
  team_b_economy_type    TEXT,
  team_a_money_spent     INTEGER,
  team_b_money_spent     INTEGER,
  team_a_equipment_value INTEGER,
  team_b_equipment_value INTEGER,
  start_tick             INTEGER,
  end_tick               INTEGER,
  UNIQUE (match_map_id, round_number)
);
CREATE INDEX IF NOT EXISTS idx_mr_match_map ON match_rounds(match_map_id);

CREATE TABLE IF NOT EXISTS match_kills (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_map_id       UUID NOT NULL REFERENCES match_maps(id) ON DELETE CASCADE,
  round_number       INTEGER NOT NULL,
  tick               INTEGER,
  weapon_name        TEXT,
  weapon_type        TEXT,
  is_headshot        BOOLEAN NOT NULL DEFAULT FALSE,
  is_trade_kill      BOOLEAN NOT NULL DEFAULT FALSE,
  is_through_smoke   BOOLEAN NOT NULL DEFAULT FALSE,
  is_no_scope        BOOLEAN NOT NULL DEFAULT FALSE,
  is_assisted_flash  BOOLEAN NOT NULL DEFAULT FALSE,
  distance           REAL,
  killer_player_id   UUID REFERENCES players(id) ON DELETE SET NULL,
  victim_player_id   UUID REFERENCES players(id) ON DELETE SET NULL,
  assister_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  killer_side        INTEGER,
  victim_side        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mk_match_map ON match_kills(match_map_id);

CREATE TABLE IF NOT EXISTS match_clutches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_map_id   UUID NOT NULL REFERENCES match_maps(id) ON DELETE CASCADE,
  round_number   INTEGER NOT NULL,
  player_id      UUID REFERENCES players(id) ON DELETE SET NULL,
  opponent_count INTEGER NOT NULL,
  won            BOOLEAN NOT NULL DEFAULT FALSE,
  kill_count     INTEGER NOT NULL DEFAULT 0,
  has_survived   BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_mc_match_map ON match_clutches(match_map_id);

CREATE TABLE IF NOT EXISTS player_round_economies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_map_id    UUID NOT NULL REFERENCES match_maps(id) ON DELETE CASCADE,
  round_number    INTEGER NOT NULL,
  player_id       UUID REFERENCES players(id) ON DELETE SET NULL,
  side            INTEGER,
  equipment_value INTEGER,
  money_spent     INTEGER,
  start_money     INTEGER,
  type            TEXT
);
CREATE INDEX IF NOT EXISTS idx_pre_match_map ON player_round_economies(match_map_id);
