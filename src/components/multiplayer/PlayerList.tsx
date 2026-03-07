'use client';

import type { PublicPlayer } from '@/lib/multiplayer/types';

interface PlayerListProps {
  players: PublicPlayer[];
  currentPlayerId?: string;
  currentTurnPlayerId?: string;
  showReadyStatus?: boolean;
  showScores?: boolean;
  showKickButton?: boolean;
  onKick?: (playerId: string) => void;
  layout?: 'vertical' | 'horizontal';
}

/**
 * Generate a deterministic pixel avatar color from a seed string.
 */
function seedToColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Generate a simple 5x5 pixel avatar from a seed (symmetric).
 */
function PixelAvatar({ seed, size = 32 }: { seed: string; size?: number }) {
  const color = seedToColor(seed);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate a 5x5 grid (only need left half + center column due to symmetry)
  const grid: boolean[][] = [];
  for (let row = 0; row < 5; row++) {
    grid[row] = [];
    for (let col = 0; col < 3; col++) {
      const bit = (hash >> (row * 3 + col)) & 1;
      grid[row][col] = bit === 1;
    }
    // Mirror
    grid[row][3] = grid[row][1];
    grid[row][4] = grid[row][0];
  }

  const cellSize = size / 5;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ borderRadius: 4, imageRendering: 'pixelated' }}
    >
      <rect width={size} height={size} fill="var(--color-bg-secondary)" />
      {grid.map((row, y) =>
        row.map((filled, x) =>
          filled ? (
            <rect
              key={`${y}-${x}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill={color}
            />
          ) : null
        )
      )}
    </svg>
  );
}

function PlayerRow({
  player,
  isCurrentPlayer,
  isCurrentTurn,
  showReady,
  showScore,
  showKick,
  onKick,
}: {
  player: PublicPlayer;
  isCurrentPlayer: boolean;
  isCurrentTurn: boolean;
  showReady: boolean;
  showScore: boolean;
  showKick: boolean;
  onKick?: (playerId: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
      style={{
        backgroundColor: isCurrentTurn
          ? 'var(--color-accent-glow)'
          : isCurrentPlayer
            ? 'color-mix(in srgb, var(--color-bg-card-hover) 60%, transparent)'
            : 'transparent',
        border: isCurrentTurn ? '1px solid var(--color-accent)' : '1px solid transparent',
      }}
    >
      {/* Turn indicator */}
      {isCurrentTurn && (
        <span style={{ color: 'var(--color-accent)' }} className="text-sm">
          &#9654;
        </span>
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <PixelAvatar seed={player.avatar_seed} size={32} />
        {!player.is_connected && (
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2"
            style={{
              backgroundColor: 'var(--color-red)',
              borderColor: 'var(--color-bg-card)',
            }}
          />
        )}
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm truncate"
            style={{
              color: player.is_connected ? 'var(--color-text)' : 'var(--color-text-muted)',
              textDecoration: player.is_connected ? 'none' : 'line-through',
            }}
          >
            {player.display_name}
          </span>
          {isCurrentPlayer && (
            <span
              className="pixel-text text-xs"
              style={{ color: 'var(--color-cyan)', fontSize: '0.4rem' }}
            >
              YOU
            </span>
          )}
          {player.is_host && (
            <span
              className="pixel-text text-xs"
              style={{ color: 'var(--color-orange)', fontSize: '0.4rem' }}
            >
              HOST
            </span>
          )}
        </div>
      </div>

      {/* Ready status */}
      {showReady && (
        <span
          className="pixel-text text-xs flex-shrink-0"
          style={{
            color: player.is_ready ? 'var(--color-accent)' : 'var(--color-text-muted)',
            fontSize: '0.45rem',
          }}
        >
          {player.is_ready ? 'READY' : 'NOT READY'}
        </span>
      )}

      {/* Score */}
      {showScore && (
        <span
          className="mono-text text-sm font-bold flex-shrink-0"
          style={{ color: 'var(--color-accent)' }}
        >
          {player.score}
        </span>
      )}

      {/* Kick button */}
      {showKick && !player.is_host && !isCurrentPlayer && (
        <button
          onClick={() => onKick?.(player.id)}
          className="pixel-text text-xs px-2 py-1 rounded transition-colors flex-shrink-0"
          style={{
            color: 'var(--color-red)',
            border: '1px solid var(--color-red)',
            fontSize: '0.4rem',
          }}
        >
          KICK
        </button>
      )}
    </div>
  );
}

export default function PlayerList({
  players,
  currentPlayerId,
  currentTurnPlayerId,
  showReadyStatus = false,
  showScores = false,
  showKickButton = false,
  onKick,
  layout = 'vertical',
}: PlayerListProps) {
  if (layout === 'horizontal') {
    return (
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-2 px-2 py-1 rounded-lg"
            style={{
              backgroundColor:
                player.id === currentTurnPlayerId
                  ? 'var(--color-accent-glow)'
                  : 'var(--color-bg-secondary)',
              border:
                player.id === currentTurnPlayerId
                  ? '1px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
            }}
          >
            <PixelAvatar seed={player.avatar_seed} size={20} />
            <span className="text-xs" style={{ color: 'var(--color-text)' }}>
              {player.display_name}
            </span>
            {player.is_host && (
              <span style={{ color: 'var(--color-orange)', fontSize: '0.6rem' }}>&#9733;</span>
            )}
            {showScores && (
              <span className="mono-text text-xs" style={{ color: 'var(--color-accent)' }}>
                {player.score}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {players.map((player) => (
        <PlayerRow
          key={player.id}
          player={player}
          isCurrentPlayer={player.id === currentPlayerId}
          isCurrentTurn={player.id === currentTurnPlayerId}
          showReady={showReadyStatus}
          showScore={showScores}
          showKick={showKickButton}
          onKick={onKick}
        />
      ))}
    </div>
  );
}
