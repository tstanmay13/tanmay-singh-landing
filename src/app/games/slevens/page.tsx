'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

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
  const shakeThreshold = 15;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Enable shake detection (must be called from user gesture)
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
        // Not iOS 13+ or permission not needed
        setupShakeDetection();
        setShakeEnabled(true);
      }
    } catch (error) {
      console.error('Failed to enable shake:', error);
      alert('Failed to enable shake detection. Please try again.');
    }
  };

  const setupShakeDetection = () => {
    window.addEventListener('devicemotion', handleShake);
  };

  const handleShake = useCallback((event: DeviceMotionEvent) => {
    if (gameState === 'rolling' || gameState === 'result') return;

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
  }, [gameState]);

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
    return () => {
      window.removeEventListener('devicemotion', handleShake);
    };
  }, [handleShake]);

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
      <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-[#593B2B]">
        <div className="grid grid-cols-3 gap-2 p-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                patterns[value].includes(i) ? 'bg-[#593B2B]' : 'bg-transparent'
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
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#FFE8D6] p-5 md:p-10">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/games"
          className="inline-block mb-6 text-[#593B2B] hover:text-[#D99C64] transition-colors"
        >
          ← Back to Games
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#593B2B] mb-2">
            🎲 Slevens
          </h1>
          <p className="text-xl text-[#D99C64]">
            Shake your phone to roll the dice!
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          {/* Enable Shake Button */}
          {!shakeEnabled && (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
              <div className="text-6xl mb-4">📱</div>
              <h2 className="text-2xl font-bold text-[#593B2B] mb-4">
                Enable Shake to Roll
              </h2>
              <p className="text-[#D99C64] mb-6">
                Tap the button below to enable shake detection. You&apos;ll need to allow motion sensors access.
              </p>
              <button
                onClick={enableShake}
                className="px-8 py-4 bg-[#593B2B] text-white rounded-full font-semibold hover:bg-[#D99C64] transition-colors text-lg"
              >
                Enable Shake Detection
              </button>
            </div>
          )}

          {/* Dice Display */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
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
                  <p className="text-2xl font-bold text-[#593B2B] mb-2">
                    {shakeDetected ? '📳 Shake Detected!' : shakeEnabled ? '🤳 Shake to Roll' : '👆 Enable shake first'}
                  </p>
                  <p className="text-sm text-[#D99C64]">
                    {shakeEnabled ? 'Give your phone a good shake!' : 'Or use manual roll below'}
                  </p>
                </div>
              )}

              {gameState === 'rolling' && (
                <p className="text-2xl font-bold text-[#593B2B] animate-pulse">
                  🎲 Rolling...
                </p>
              )}

              {gameState === 'result' && (
                <div>
                  <p className="text-2xl font-bold text-[#593B2B] mb-4">
                    {message}
                  </p>
                  <button
                    onClick={nextTurn}
                    className="px-6 py-3 bg-[#593B2B] text-white rounded-full font-semibold hover:bg-[#D99C64] transition-colors"
                  >
                    Next Turn
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Manual Roll Button */}
          {gameState === 'ready' && (
            <button
              onClick={manualRoll}
              className="px-6 py-3 bg-[#FFE8D6] text-[#593B2B] rounded-full font-semibold hover:bg-[#D99C64] hover:text-white transition-colors"
            >
              Manual Roll
            </button>
          )}

          {/* Game Rules */}
          <div className="bg-white rounded-2xl p-6 shadow-lg max-w-md">
            <h3 className="text-xl font-semibold text-[#593B2B] mb-3">
              🎮 Game Rules
            </h3>
            <ul className="text-[#D99C64] space-y-2 text-sm">
              <li>• <strong>7 or 11:</strong> Give out drinks</li>
              <li>• <strong>Doubles:</strong> Give out drinks</li>
              <li>• <strong>Snake Eyes (1-1):</strong> You drink!</li>
              <li>• <strong>Other rolls:</strong> Pass to next player</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
