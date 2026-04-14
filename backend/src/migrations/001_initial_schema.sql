-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  short_name  TEXT,
  logo_url    TEXT,
  region      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname    TEXT NOT NULL,
  real_name   TEXT,
  avatar_url  TEXT,
  team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
  steam_id    TEXT UNIQUE,
  country     TEXT,
  role        TEXT CHECK (role IN ('rifler','awper','igl','support','lurker'))
);

-- Tournaments
CREATE TABLE IF NOT EXISTS tournaments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  season      TEXT,
  year        INTEGER,
  stage       TEXT,
  prize_pool  TEXT,
  venue       TEXT,
  start_date  DATE,
  end_date    DATE
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_a_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_b_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  maps_won_a      INTEGER DEFAULT 0,
  maps_won_b      INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming','live','finished')),
  stage           TEXT,
  scheduled_at    TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ
);

-- Match Maps
CREATE TABLE IF NOT EXISTS match_maps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  map_name         TEXT NOT NULL,
  map_order        INTEGER NOT NULL,
  score_a          INTEGER,
  score_b          INTEGER,
  winner_team_id   UUID REFERENCES teams(id) ON DELETE SET NULL,
  duration_seconds INTEGER,
  UNIQUE (match_id, map_order)
);

-- Player Match Stats
CREATE TABLE IF NOT EXISTS player_match_stats (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           UUID REFERENCES players(id) ON DELETE CASCADE,
  match_map_id        UUID NOT NULL REFERENCES match_maps(id) ON DELETE CASCADE,
  team_id             UUID REFERENCES teams(id) ON DELETE SET NULL,
  kills               INTEGER,
  deaths              INTEGER,
  assists             INTEGER,
  headshots           INTEGER,
  headshot_pct        REAL,
  adr                 REAL,
  kast                REAL,
  rating              REAL,
  first_kills         INTEGER,
  first_deaths        INTEGER,
  clutches_won        INTEGER,
  clutches_played     INTEGER,
  flash_assists       INTEGER,
  imported_from_csdm  BOOLEAN DEFAULT false,
  UNIQUE (match_map_id, player_id)
);

-- News
CREATE TABLE IF NOT EXISTS news (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  summary         TEXT,
  content         TEXT,
  cover_image_url TEXT,
  category        TEXT CHECK (category IN ('战报','资讯','专访')),
  match_id        UUID REFERENCES matches(id) ON DELETE SET NULL,
  author          TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Admins
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- CSDM Imports
CREATE TABLE IF NOT EXISTS csdm_imports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     TEXT,
  raw_json     JSONB NOT NULL,
  match_id     UUID REFERENCES matches(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','failed')),
  imported_at  TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

-- Media
CREATE TABLE IF NOT EXISTS media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT NOT NULL,
  original_name TEXT,
  path          TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    BIGINT,
  uploaded_at   TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_a_id     ON matches(team_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_b_id     ON matches(team_b_id);
CREATE INDEX IF NOT EXISTS idx_pms_player_id         ON player_match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id       ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_news_published_at     ON news(published_at DESC);
