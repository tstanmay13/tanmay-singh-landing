CREATE TABLE IF NOT EXISTS game_plays (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_slug text UNIQUE NOT NULL,
  play_count bigint DEFAULT 0 NOT NULL
);

-- Allow anonymous reads
ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read play counts" ON game_plays FOR SELECT USING (true);
CREATE POLICY "Anyone can insert play counts" ON game_plays FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update play counts" ON game_plays FOR UPDATE USING (true);


-- RPC function used by the API route to atomically increment play counts
CREATE OR REPLACE FUNCTION increment_play_count(slug_param text)
RETURNS void AS $$
BEGIN
  INSERT INTO game_plays (game_slug, play_count)
  VALUES (slug_param, 1)
  ON CONFLICT (game_slug)
  DO UPDATE SET play_count = game_plays.play_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
