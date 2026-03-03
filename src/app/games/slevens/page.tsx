'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

type GameState = 'ready' | 'rolling' | 'result';

export default function SlevensGamePage() {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<GameState>('ready');
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [message, setMessage] = useState('');
  const [shakeDetected, setShakeDetected] = useState(false);
  const [shakeEnabled, setShakeEnabled] = useState(false);

  const lastShakeTime = useRef(0);
  const gameStateRef = useRef<GameState>('ready');
  const shakeThreshold = 15;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const enableShake = async () => {
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setupShakeDetection();
          setShakeEnabled(true);
        } else {
          alert('Permission denied. Please enable motion sensors in Settings.');
        }
      } else {
        setupShakeDetection();
        setShakeEnabled(true);
      }
    } catch (error) {
      console.error('Failed to enable shake:', error);
      alert('Failed to enable shake detection. Please try again.');
    }
  };

  const setupShakeDetection = () => {
    window.addEventListener('devicemotion', handleShake.current);
  };

  const handleShake = useRef((event: DeviceMotionEvent) => {
    if (gameStateRef.current === 'rolling' || gameStateRef.current === 'result') return;

    const current = Date.now();
    if (current - lastShakeTime.current < 1000) return;

    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;

    const { x, y, z } = acceleration;
    const totalAcceleration = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);

    if (totalAcceleration > shakeThreshold) {
      lastShakeTime.current = current;
      setShakeDetected(true);
      rollDice();
      setTimeout(() => setShakeDetected(false), 500);
    }
  });

  const rollDice = () => {
    setGameState('rolling');

    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
      rollCount++;

      if (rollCount > 10) {
        clearInterval(rollInterval);
        const finalDice1 = Math.floor(Math.random() * 6) + 1;
        const finalDice2 = Math.floor(Math.random() * 6) + 1;
        setDice1(finalDice1);
        setDice2(finalDice2);
        determineResult(finalDice1, finalDice2, finalDice1 + finalDice2);
      }
    }, 100);
  };

  const determineResult = (d1: number, d2: number, total: number) => {
    let resultMessage = '';

    if (d1 === 1 && d2 === 1) {
      resultMessage = '🐍 Snake Eyes! You drink!';
    } else if (total === 7 || total === 11) {
      resultMessage = `🍺 You rolled ${total}! Give out drinks!`;
    } else if (d1 === d2) {
      resultMessage = `🎯 Doubles (${d1}-${d2})! Give out drinks!`;
    } else {
      resultMessage = `🎲 You rolled ${total}. Pass the phone!`;
    }

    setMessage(resultMessage);
    setGameState('result');
  };

  const nextTurn = () => {
    setGameState('ready');
    setMessage('');
  };

  const manualRoll = () => {
    if (gameState === 'ready') {
      rollDice();
    }
  };

  useEffect(() => {
    const handler = handleShake.current;
    return () => {
      window.removeEventListener('devicemotion', handler);
    };
  }, []);

  const DiceFace = ({ value }: { value: number }) => {
    const patterns: { [key: number]: number[] } = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };

    return (
      <div className="w-24 h-24 bg-[#1A1A1A] rounded-2xl shadow-lg flex items-center justify-center border-4 border-[#FFB347]">
        <div className="grid grid-cols-3 gap-2 p-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                patterns[value].includes(i) ? 'bg-[#FFB347]' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F0] p-5 md:p-10">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/games"
          className="inline-block mb-6 text-[#B8A082] hover:text-[#FFB347] transition-colors"
        >
          ← Back to Games
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#F5F5F0] mb-2">
            🎲 Slevens
          </h1>
          <p className="text-xl text-[#B8A082]">
            Shake your phone to roll the dice!
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          {/* Enable Shake Button */}
          {!shakeEnabled && (
            <div className="bg-[#1A1A1A] border border-[#2A2520] rounded-2xl p-8 text-center max-w-md">
              <div className="text-6xl mb-4">📱</div>
              <h2 className="text-2xl font-bold text-[#F5F5F0] mb-4">
                Enable Shake to Roll
              </h2>
              <p className="text-[#B8A082] mb-6">
                Tap the button below to enable shake detection.
              </p>
              <button
                onClick={enableShake}
                className="px-8 py-4 bg-[#FFB347] text-[#0D0D0D] rounded-full font-semibold hover:bg-[#FFB347]/80 transition-colors text-lg"
              >
                Enable Shake Detection
              </button>
            </div>
          )}

          {/* Dice Display */}
          <div className="bg-[#1A1A1A] border border-[#2A2520] rounded-2xl p-8">
            <div className="flex gap-6 justify-center mb-6">
              <div className={gameState === 'rolling' ? 'animate-bounce' : ''}>
                <DiceFace value={dice1} />
              </div>
              <div className={gameState === 'rolling' ? 'animate-bounce' : ''}>
                <DiceFace value={dice2} />
              </div>
            </div>

            <div className="text-center min-h-[60px]">
              {gameState === 'ready' && (
                <div>
                  <p className="text-2xl font-bold text-[#F5F5F0] mb-2">
                    {shakeDetected ? '📳 Shake Detected!' : shakeEnabled ? '🤳 Shake to Roll' : '👆 Enable shake first'}
                  </p>
                  <p className="text-sm text-[#B8A082]">
                    {shakeEnabled ? 'Give your phone a good shake!' : 'Or use manual roll below'}
                  </p>
                </div>
              )}

              {gameState === 'rolling' && (
                <p className="text-2xl font-bold text-[#FFB347] animate-pulse">
                  🎲 Rolling...
                </p>
              )}

              {gameState === 'result' && (
                <div>
                  <p className="text-2xl font-bold text-[#FFB347] mb-4">
                    {message}
                  </p>
                  <button
                    onClick={nextTurn}
                    className="px-6 py-3 bg-[#FFB347] text-[#0D0D0D] rounded-full font-semibold hover:bg-[#FFB347]/80 transition-colors"
                  >
                    Next Turn →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Manual Roll (for desktop) */}
          {shakeEnabled && gameState === 'ready' && (
            <button
              onClick={manualRoll}
              className="px-6 py-3 bg-[#1A1A1A] border border-[#FFB347]/50 text-[#FFB347] rounded-full font-semibold hover:border-[#FFB347] transition-colors"
            >
              Or click to roll 🎲
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
