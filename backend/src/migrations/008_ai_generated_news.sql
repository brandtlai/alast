ALTER TABLE news
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS generation_meta JSONB;

CREATE INDEX IF NOT EXISTS idx_news_ai_generated ON news(ai_generated);
CREATE INDEX IF NOT EXISTS idx_news_match_id ON news(match_id);
