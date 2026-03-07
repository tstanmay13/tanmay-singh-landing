'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useGamePlay } from '@/components/GamePlayCounter';

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
  const { recordPlay } = useGamePlay('snakes');

  const generateFood = useCallback((): Position => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(generateFood());
    setGameOver(false);
    setScore(0);
    setGameStarted(false);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        setGameStarted(true);
        recordPlay();
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

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        let newHead: Position;

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

        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setGameOver(true);
          return prevSnake;
        }

        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((prev) => prev + 10);
          setFood(generateFood());
          return newSnake;
        }

        newSnake.pop();
        return newSnake;
      });
    }, GAME_SPEED);

    return () => clearInterval(gameLoop);
  }, [direction, food, gameOver, gameStarted, generateFood]);

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
            🐍 Snake Game
          </h1>
          <p className="text-xl text-[#B8A082] mb-4">
            Use arrow keys to control the snake
          </p>
          <div className="text-3xl font-bold text-[#FFB347]">
            Score: {score}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div
            className="bg-[#1A1A1A] border border-[#2A2520] rounded-2xl p-4"
            style={{
              width: GRID_SIZE * CELL_SIZE + 32,
              height: GRID_SIZE * CELL_SIZE + 32,
            }}
          >
            <div
              className="relative bg-[#0D0D0D] border-4 border-[#FFB347] rounded-xl"
              style={{
                width: GRID_SIZE * CELL_SIZE,
                height: GRID_SIZE * CELL_SIZE,
              }}
            >
              {snake.map((segment, index) => (
                <div
                  key={index}
                  className="absolute rounded-sm transition-all"
                  style={{
                    left: segment.x * CELL_SIZE,
                    top: segment.y * CELL_SIZE,
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    backgroundColor: index === 0 ? '#FFB347' : '#FA8072',
                  }}
                />
              ))}

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

              {gameOver && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-xl">
                  <div className="bg-[#1A1A1A] border border-[#FFB347] p-8 rounded-xl text-center">
                    <h2 className="text-3xl font-bold text-[#FFB347] mb-4">
                      Game Over!
                    </h2>
                    <p className="text-xl text-[#F5F5F0] mb-6">
                      Final Score: {score}
                    </p>
                    <button
                      onClick={resetGame}
                      className="px-8 py-3 bg-[#FFB347] text-[#0D0D0D] rounded-full font-semibold hover:bg-[#FFB347]/80 transition-colors text-lg"
                    >
                      Play Again →
                    </button>
                  </div>
                </div>
              )}

              {!gameStarted && !gameOver && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                  <div className="text-center">
                    <p className="text-xl text-[#F5F5F0] mb-4">
                      Press any arrow key to start
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={resetGame}
            className="px-6 py-3 bg-[#1A1A1A] border border-[#FFB347]/50 text-[#FFB347] rounded-full font-semibold hover:border-[#FFB347] transition-colors"
          >
            Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}
