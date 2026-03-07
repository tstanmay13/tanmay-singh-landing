'use client';

import { useState, useCallback } from 'react';

interface RoomCodeDisplayProps {
  code: string;
  showCopy?: boolean;
  compact?: boolean;
}

export default function RoomCodeDisplay({ code, showCopy = true, compact = false }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        <span
          className="pixel-text text-xs tracking-widest"
          style={{ color: 'var(--color-accent)' }}
        >
          {code}
        </span>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="text-xs transition-colors"
            style={{ color: copied ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
            title="Copy room code"
          >
            {copied ? 'COPIED' : 'COPY'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center">
      <p
        className="text-xs mb-2"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        ROOM CODE
      </p>
      <div className="flex items-center justify-center gap-1.5">
        {code.split('').map((char, i) => (
          <span
            key={i}
            className="pixel-text text-2xl md:text-3xl inline-flex items-center justify-center w-10 h-12 md:w-12 md:h-14 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-accent)',
              border: '2px solid var(--color-border)',
              textShadow: '0 0 8px var(--color-accent-glow)',
            }}
          >
            {char}
          </span>
        ))}
      </div>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="pixel-text text-xs mt-3 px-4 py-2 rounded transition-all duration-200"
          style={{
            color: copied ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            backgroundColor: copied ? 'var(--color-accent-glow)' : 'transparent',
            border: `1px solid ${copied ? 'var(--color-accent)' : 'var(--color-border)'}`,
          }}
        >
          {copied ? 'COPIED!' : 'COPY CODE'}
        </button>
      )}
    </div>
  );
}
