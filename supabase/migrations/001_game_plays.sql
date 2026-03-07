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
