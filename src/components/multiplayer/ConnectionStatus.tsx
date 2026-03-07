'use client';

import type { ConnectionStatus as ConnectionStatusType } from '@/lib/multiplayer/types';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  variant?: 'badge' | 'floating';
}

const STATUS_CONFIG: Record<ConnectionStatusType, { label: string; color: string; dotColor: string }> = {
  connecting: {
    label: 'Connecting...',
    color: 'var(--color-orange)',
    dotColor: 'var(--color-orange)',
  },
  connected: {
    label: 'Connected',
    color: 'var(--color-accent)',
    dotColor: 'var(--color-accent)',
  },
  disconnected: {
    label: 'Disconnected',
    color: 'var(--color-red)',
    dotColor: 'var(--color-red)',
  },
  error: {
    label: 'Connection Error',
    color: 'var(--color-red)',
    dotColor: 'var(--color-red)',
  },
};

export default function ConnectionStatus({ status, variant = 'badge' }: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];

  if (variant === 'floating') {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg pixel-border text-xs"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderColor: config.color,
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: config.dotColor,
            boxShadow: status === 'connected' ? `0 0 6px ${config.dotColor}` : 'none',
          }}
        />
        <span className="pixel-text" style={{ color: config.color, fontSize: '0.5rem' }}>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: config.dotColor,
          boxShadow: status === 'connected' ? `0 0 4px ${config.dotColor}` : 'none',
        }}
      />
      <span style={{ color: config.color }}>{config.label}</span>
    </span>
  );
}
