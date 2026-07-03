'use client';

import { useState, useEffect, useCallback } from 'react';
import ArcadeCabinet from '@/components/ArcadeCabinet';
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
  }, [gameStarted, recordPlay]);

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
    <ArcadeCabinet title="SNAKE" subtitle="Use arrow keys to control the snake">
      <div className="flex flex-col items-center gap-4">
        <div
          className="pixel-text text-sm"
          style={{ color: 'var(--color-accent)' }}
        >
          SCORE: {score}
        </div>

        <div className="flex flex-col items-center gap-4">
          <div
            className="p-4"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '2px solid var(--color-border)',
              width: GRID_SIZE * CELL_SIZE + 32,
              height: GRID_SIZE * CELL_SIZE + 32,
            }}
          >
            <div
              className="relative"
              style={{
                background: 'var(--color-bg)',
                border: '4px solid var(--color-accent)',
                width: GRID_SIZE * CELL_SIZE,
                height: GRID_SIZE * CELL_SIZE,
              }}
            >
              {snake.map((segment, index) => (
                <div
                  key={index}
                  className="absolute transition-all"
                  style={{
                    left: segment.x * CELL_SIZE,
                    top: segment.y * CELL_SIZE,
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    backgroundColor:
                      index === 0
                        ? 'var(--color-accent)'
                        : 'var(--color-accent-secondary)',
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
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div
                    className="pixel-border p-8 text-center"
                    style={{ background: 'var(--color-bg-card)' }}
                  >
                    <h2
                      className="pixel-text text-sm mb-4"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      GAME OVER
                    </h2>
                    <p
                      className="mono-text text-lg mb-6"
                      style={{ color: 'var(--color-text)' }}
                    >
                      Final Score: {score}
                    </p>
                    <button onClick={resetGame} className="pixel-btn">
                      Play Again
                    </button>
                  </div>
                </div>
              )}

              {!gameStarted && !gameOver && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <p
                      className="pixel-text text-[0.625rem] px-4"
                      style={{ color: 'var(--color-text)' }}
                    >
                      PRESS ANY ARROW KEY TO START
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button onClick={resetGame} className="pixel-btn">
            Reset Game
          </button>
        </div>
      </div>
    </ArcadeCabinet>
  );
}
