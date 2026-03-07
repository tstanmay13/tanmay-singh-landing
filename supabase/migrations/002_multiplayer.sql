-- ============================================
-- Multiplayer Game Infrastructure
-- Tables, indexes, triggers, and RLS policies
-- ============================================

-- ============================================
-- 1. game_rooms
-- ============================================
CREATE TABLE game_rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(6) NOT NULL UNIQUE,
  game_id       TEXT NOT NULL,
  host_player_id UUID NOT NULL,
  status        TEXT NOT NULL DEFAULT 'waiting',
  mode          TEXT NOT NULL DEFAULT 'online',
  settings      JSONB NOT NULL DEFAULT '{}',
  max_players   INT NOT NULL DEFAULT 8,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours'),

  CONSTRAINT valid_status CHECK (status IN ('waiting', 'playing', 'finished', 'expired')),
  CONSTRAINT valid_mode CHECK (mode IN ('online', 'pass-the-phone')),
  CONSTRAINT valid_max_players CHECK (max_players >= 2 AND max_players <= 15)
);

CREATE INDEX idx_game_rooms_code ON game_rooms (code) WHERE status != 'expired';
CREATE INDEX idx_game_rooms_expires ON game_rooms (expires_at) WHERE status NOT IN ('finished', 'expired');
CREATE INDEX idx_game_rooms_last_activity ON game_rooms (last_activity);

-- ============================================
-- 2. game_players
-- ============================================
CREATE TABLE game_players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_seed   TEXT NOT NULL,
  is_host       BOOLEAN NOT NULL DEFAULT false,
  is_ready      BOOLEAN NOT NULL DEFAULT false,
  is_connected  BOOLEAN NOT NULL DEFAULT true,
  player_order  INT,
  session_token TEXT NOT NULL,
  score         INT NOT NULL DEFAULT 0,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ,

  CONSTRAINT unique_player_per_room UNIQUE (room_id, session_token)
);

CREATE INDEX idx_game_players_room ON game_players (room_id);
CREATE INDEX idx_game_players_session ON game_players (session_token);

-- ============================================
-- 3. game_state
-- ============================================
CREATE TABLE game_state (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE UNIQUE,
  current_round INT NOT NULL DEFAULT 1,
  current_turn  UUID REFERENCES game_players(id),
  turn_started_at TIMESTAMPTZ,
  state_data    JSONB NOT NULL DEFAULT '{}',
  version       INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_state_room ON game_state (room_id);

-- ============================================
-- 4. Auto-update trigger: bump room activity
--    on any state or player change
-- ============================================
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE game_rooms
  SET last_activity = now(),
      expires_at = now() + interval '2 hours'
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_state_activity
  AFTER INSERT OR UPDATE ON game_state
  FOR EACH ROW EXECUTE FUNCTION update_room_activity();

CREATE TRIGGER trg_player_activity
  AFTER INSERT OR UPDATE ON game_players
  FOR EACH ROW EXECUTE FUNCTION update_room_activity();

-- ============================================
-- 5. Auto-update trigger: bump version and
--    updated_at on game_state changes
-- ============================================
CREATE OR REPLACE FUNCTION update_game_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_game_state_updated
  BEFORE UPDATE ON game_state
  FOR EACH ROW EXECUTE FUNCTION update_game_state_timestamp();

-- ============================================
-- 6. RLS Policies
-- ============================================
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- game_rooms: anyone can read non-expired rooms
CREATE POLICY "rooms_select" ON game_rooms
  FOR SELECT USING (status != 'expired');

-- game_players: anyone can read players
CREATE POLICY "players_select" ON game_players
  FOR SELECT USING (true);

-- game_players: players can update their own row via session_token
CREATE POLICY "players_update_self" ON game_players
  FOR UPDATE USING (
    session_token = current_setting('app.session_token', true)
  );

-- game_state: anyone can read state
CREATE POLICY "state_select" ON game_state
  FOR SELECT USING (true);

-- Note: All writes go through API routes using the service role key,
-- which bypasses RLS. No anon write policies are needed.
