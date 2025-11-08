'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION: Direction = 'RIGHT';
const GAME_SPEED = 150;

export default function SnakesGamePage() {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  // Generate random food position
  const generateFood = useCallback((): Position => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  }, []);

  // Reset game
  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(generateFood());
    setGameOver(false);
    setScore(0);
    setGameStarted(false);
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        setGameStarted(true);
      }

      switch (e.key) {
        case 'ArrowUp':
          setDirection((prev) => (prev !== 'DOWN' ? 'UP' : prev));
          break;
        case 'ArrowDown':
          setDirection((prev) => (prev !== 'UP' ? 'DOWN' : prev));
          break;
        case 'ArrowLeft':
          setDirection((prev) => (prev !== 'RIGHT' ? 'LEFT' : prev));
          break;
        case 'ArrowRight':
          setDirection((prev) => (prev !== 'LEFT' ? 'RIGHT' : prev));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted]);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        let newHead: Position;

        // Calculate new head position
        switch (direction) {
          case 'UP':
            newHead = { x: head.x, y: head.y - 1 };
            break;
          case 'DOWN':
            newHead = { x: head.x, y: head.y + 1 };
            break;
          case 'LEFT':
            newHead = { x: head.x - 1, y: head.y };
            break;
          case 'RIGHT':
            newHead = { x: head.x + 1, y: head.y };
            break;
        }

        // Check wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setGameOver(true);
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((prev) => prev + 10);
          setFood(generateFood());
          return newSnake; // Don't remove tail (snake grows)
        }

        // Remove tail (normal movement)
        newSnake.pop();
        return newSnake;
      });
    }, GAME_SPEED);

    return () => clearInterval(gameLoop);
  }, [direction, food, gameOver, gameStarted, generateFood]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#FFE8D6] p-5 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link
          href="/games"
          className="inline-block mb-6 text-[#593B2B] hover:text-[#D99C64] transition-colors"
        >
          ← Back to Games
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#593B2B] mb-2">
            🐍 Snake Game
          </h1>
          <p className="text-xl text-[#D99C64] mb-4">
            Use arrow keys to control the snake
          </p>
          <div className="text-3xl font-bold text-[#593B2B]">
            Score: {score}
          </div>
        </div>

        {/* Game Board */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="bg-white rounded-2xl p-4 shadow-lg"
            style={{
              width: GRID_SIZE * CELL_SIZE + 32,
              height: GRID_SIZE * CELL_SIZE + 32,
            }}
          >
            <div
              className="relative bg-[#FFF8F0] border-4 border-[#593B2B] rounded-xl"
              style={{
                width: GRID_SIZE * CELL_SIZE,
                height: GRID_SIZE * CELL_SIZE,
              }}
            >
              {/* Snake */}
              {snake.map((segment, index) => (
                <div
                  key={index}
                  className="absolute bg-[#593B2B] rounded-sm transition-all"
                  style={{
                    left: segment.x * CELL_SIZE,
                    top: segment.y * CELL_SIZE,
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    backgroundColor: index === 0 ? '#593B2B' : '#D99C64',
                  }}
                />
              ))}

              {/* Food */}
              <div
                className="absolute text-center leading-none"
                style={{
                  left: food.x * CELL_SIZE,
                  top: food.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  fontSize: CELL_SIZE - 4,
                }}
              >
                🍎
              </div>

              {/* Game Over Overlay */}
              {gameOver && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
                  <div className="bg-white p-8 rounded-xl text-center">
                    <h2 className="text-3xl font-bold text-[#593B2B] mb-2">
                      Game Over!
                    </h2>
                    <p className="text-xl text-[#D99C64] mb-4">
                      Final Score: {score}
                    </p>
                    <button
                      onClick={resetGame}
                      className="px-6 py-3 bg-[#593B2B] text-white rounded-full font-semibold hover:bg-[#D99C64] transition-colors"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              )}

              {/* Start Message */}
              {!gameStarted && !gameOver && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-xl">
                  <div className="bg-white p-6 rounded-xl text-center">
                    <p className="text-xl text-[#593B2B] font-semibold">
                      Press any arrow key to start!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-2xl p-6 shadow-lg max-w-md">
            <h3 className="text-xl font-semibold text-[#593B2B] mb-3">
              How to Play
            </h3>
            <ul className="text-[#D99C64] space-y-2 text-sm">
              <li>• Use arrow keys to control the snake</li>
              <li>• Eat the apples to grow and increase your score</li>
              <li>• Don&apos;t hit the walls or yourself!</li>
              <li>• Each apple is worth 10 points</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
