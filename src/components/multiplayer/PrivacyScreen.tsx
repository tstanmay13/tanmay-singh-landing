'use client';

import { useState, useEffect } from 'react';

interface PrivacyScreenProps {
  nextPlayerName: string;
  onReady: () => void;
  message?: string;
}

export default function PrivacyScreen({
  nextPlayerName,
  onReady,
  message = "Don't peek!",
}: PrivacyScreenProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [tapped, setTapped] = useState(false);

  const handleTap = () => {
    if (tapped) return;
    setTapped(true);
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      onReady();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onReady]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-bg)' }}
      onClick={handleTap}
    >
      {/* Decorative pixel border */}
      <div
        className="absolute inset-4 rounded-lg pointer-events-none"
        style={{ border: '3px dashed var(--color-border)' }}
      />

      {!tapped ? (
        <div className="text-center animate-fade-in-up">
          {/* Icon */}
          <div className="text-6xl mb-6">
            &#128064;
          </div>

          {/* Message */}
          <p
            className="pixel-text text-xs mb-6"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {message}
          </p>

          {/* Player name */}
          <h2
            className="pixel-text text-base md:text-lg mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            PASS TO
          </h2>
          <h1
            className="pixel-text text-xl md:text-2xl mb-8"
            style={{
              color: 'var(--color-text)',
              textShadow: '0 0 12px var(--color-accent-glow)',
            }}
          >
            {nextPlayerName.toUpperCase()}
          </h1>

          {/* CTA */}
          <div
            className="pixel-btn px-8 py-4 text-sm animate-glow-pulse"
          >
            TAP WHEN READY
          </div>

          <p
            className="text-xs mt-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Tap anywhere on screen
          </p>
        </div>
      ) : (
        <div className="text-center">
          {/* Countdown */}
          <div
            className="pixel-text text-6xl md:text-8xl animate-pixel-bounce"
            style={{
              color: 'var(--color-accent)',
              textShadow: '0 0 20px var(--color-accent-glow)',
            }}
          >
            {countdown}
          </div>
          <p
            className="pixel-text text-xs mt-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            GET READY...
          </p>
        </div>
      )}
    </div>
  );
}
