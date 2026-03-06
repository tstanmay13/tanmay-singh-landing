'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

interface Item {
  id: string;
  emoji: string;
  name: string;
  price: number;
  category: string;
}

interface CartEntry {
  quantity: number;
}

const SALARY = 75_000;

const ITEMS: Item[] = [
  { id: 'coffee', emoji: '\u2615', name: 'Cup of Coffee', price: 5, category: 'Food & Drink' },
  { id: 'avocado-toast', emoji: '\ud83e\udd51', name: 'Avocado Toast', price: 12, category: 'Food & Drink' },
  { id: 'domain', emoji: '\ud83c\udf10', name: 'Domain Name (.com)', price: 12, category: 'Dev Essentials' },
  { id: 'vscode-ext', emoji: '\ud83e\udde9', name: 'VS Code Extension (Premium)', price: 30, category: 'Dev Essentials' },
  { id: 'aws-bill', emoji: '\u2601\ufe0f', name: 'AWS Monthly Bill', price: 150, category: 'Dev Essentials' },
  { id: 'keyboard', emoji: '\u2328\ufe0f', name: 'Mechanical Keyboard', price: 180, category: 'Tech & Gear' },
  { id: 'netflix', emoji: '\ud83c\udfa5', name: 'Netflix Subscription (Year)', price: 180, category: 'Lifestyle' },
  { id: 'jordans', emoji: '\ud83d\udc5f', name: 'Pair of Jordans', price: 200, category: 'Lifestyle' },
  { id: 'chatgpt', emoji: '\ud83e\udd16', name: 'Annual ChatGPT Plus', price: 240, category: 'Dev Essentials' },
  { id: 'airpods', emoji: '\ud83c\udfa7', name: 'AirPods Pro', price: 249, category: 'Tech & Gear' },
  { id: 'flight', emoji: '\u2708\ufe0f', name: 'Flight Home (Round Trip)', price: 400, category: 'Lifestyle' },
  { id: 'standing-desk', emoji: '\ud83e\uddf3', name: 'Standing Desk', price: 500, category: 'Tech & Gear' },
  { id: 'gym', emoji: '\ud83c\udfcb\ufe0f', name: 'Annual Gym Membership', price: 600, category: 'Lifestyle' },
  { id: 'monitor', emoji: '\ud83d\udcbb', name: 'Monitor (Ultrawide)', price: 800, category: 'Tech & Gear' },
  { id: 'iphone', emoji: '\ud83d\udcf1', name: 'New iPhone', price: 1099, category: 'Tech & Gear' },
  { id: 'weekend-trip', emoji: '\ud83c\udfd6\ufe0f', name: 'Weekend Trip', price: 1200, category: 'Lifestyle' },
  { id: 'chair', emoji: '\ud83e\ude91', name: 'Ergonomic Chair', price: 1400, category: 'Tech & Gear' },
  { id: 'macbook', emoji: '\ud83d\udcbb', name: 'MacBook Pro', price: 2499, category: 'Tech & Gear' },
  { id: 'rent', emoji: '\ud83c\udfe0', name: 'Monthly Rent (SF)', price: 3500, category: 'Big Expenses' },
  { id: 'bootcamp', emoji: '\ud83c\udf93', name: 'Coding Bootcamp', price: 15000, category: 'Big Expenses' },
  { id: 'honda', emoji: '\ud83d\ude97', name: 'Used Honda Civic', price: 18000, category: 'Big Expenses' },
  { id: 'cs-degree', emoji: '\ud83c\udfe5', name: 'CS Degree (1 Year)', price: 25000, category: 'Big Expenses' },
  { id: 'tesla', emoji: '\u26a1', name: 'Tesla Model 3', price: 40000, category: 'Big Expenses' },
  { id: 'house', emoji: '\ud83c\udfe1', name: 'House Down Payment', price: 60000, category: 'Big Expenses' },
];

function formatMoney(amount: number): string {
  return '$' + amount.toLocaleString('en-US');
}

export default function SalaryGamePage() {
  const [mounted, setMounted] = useState(false);
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [showReceipt, setShowReceipt] = useState(false);
  const [brokeAnimation, setBrokeAnimation] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalSpent = ITEMS.reduce((sum, item) => {
    const qty = cart[item.id]?.quantity || 0;
    return sum + item.price * qty;
  }, 0);

  const remaining = SALARY - totalSpent;
  const spentPercent = (totalSpent / SALARY) * 100;

  const getBalanceColor = useCallback(() => {
    const pct = (remaining / SALARY) * 100;
    if (pct > 50) return 'var(--color-accent)';
    if (pct > 25) return 'var(--color-orange)';
    return 'var(--color-red)';
  }, [remaining]);

  const addItem = (itemId: string, price: number) => {
    if (remaining < price) return;
    setCart((prev) => ({
      ...prev,
      [itemId]: { quantity: (prev[itemId]?.quantity || 0) + 1 },
    }));
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => {
      const current = prev[itemId]?.quantity || 0;
      if (current <= 0) return prev;
      const next = { ...prev };
      if (current === 1) {
        delete next[itemId];
      } else {
        next[itemId] = { quantity: current - 1 };
      }
      return next;
    });
  };

  const resetGame = () => {
    setCart({});
    setShowReceipt(false);
    setBrokeAnimation(false);
  };

  const isBroke = remaining === 0;
  const isNearlybroke = remaining > 0 && remaining < 5;

  useEffect(() => {
    if (isBroke || isNearlybroke) {
      setBrokeAnimation(true);
    }
  }, [isBroke, isNearlybroke]);

  const purchasedItems = ITEMS.filter((item) => (cart[item.id]?.quantity || 0) > 0);

  if (!mounted) return null;

  if (showReceipt) {
    return (
      <div
        className="min-h-screen p-4 md:p-8"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl mx-auto">
          <div
            className="pixel-card rounded-lg p-6 md:p-8"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <h2 className="pixel-text text-lg md:text-xl text-center mb-2" style={{ color: 'var(--color-accent)' }}>
              RECEIPT
            </h2>
            <p className="text-center text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Junior Developer Salary Breakdown
            </p>

            <div
              className="border-t border-b py-4 my-4 space-y-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {purchasedItems.map((item) => {
                const qty = cart[item.id]?.quantity || 0;
                return (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span>
                      {item.emoji} {item.name} x{qty}
                    </span>
                    <span className="mono-text" style={{ color: 'var(--color-accent)' }}>
                      {formatMoney(item.price * qty)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-lg font-bold mt-4">
              <span className="pixel-text text-xs">TOTAL SPENT</span>
              <span className="mono-text" style={{ color: 'var(--color-accent)' }}>
                {formatMoney(totalSpent)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Remaining</span>
              <span className="mono-text text-sm" style={{ color: getBalanceColor() }}>
                {formatMoney(remaining)}
              </span>
            </div>

            <div className="text-center mt-8">
              <button onClick={resetGame} className="pixel-btn">
                Play Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Sticky Header */}
      <div
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 90%, transparent)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/games"
              className="text-sm transition-colors hover:opacity-80"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              &larr; Back to Games
            </Link>
            {purchasedItems.length > 0 && (
              <button
                onClick={() => setShowReceipt(true)}
                className="text-xs px-3 py-1 rounded border transition-colors hover:opacity-80"
                style={{
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent)',
                }}
              >
                View Receipt
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <h1 className="pixel-text text-xs md:text-sm whitespace-nowrap" style={{ color: 'var(--color-accent)' }}>
              SPEND MY SALARY
            </h1>
            <div className="text-right">
              <span
                className="mono-text text-xl md:text-2xl font-bold transition-colors duration-300"
                style={{ color: getBalanceColor() }}
              >
                {formatMoney(remaining)}
              </span>
              <span className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>
                remaining
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            className="w-full h-2 rounded-full mt-2 overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(spentPercent, 100)}%`,
                backgroundColor: getBalanceColor(),
                boxShadow: `0 0 8px ${getBalanceColor()}`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {formatMoney(totalSpent)} spent
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {formatMoney(SALARY)} salary
            </span>
          </div>
        </div>
      </div>

      {/* Broke Overlay */}
      {brokeAnimation && (isBroke || isNearlybroke) && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setBrokeAnimation(false)}
        >
          <div className="text-center animate-scale-in">
            <div className="text-6xl md:text-8xl mb-4">
              {isBroke ? '\ud83d\udcb8' : '\ud83d\ude30'}
            </div>
            <h2
              className="pixel-text text-lg md:text-2xl mb-2"
              style={{ color: 'var(--color-red)' }}
            >
              {isBroke ? "YOU'RE BROKE!" : "ALMOST BROKE!"}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              {isBroke
                ? 'Every last cent, gone. Just like payday.'
                : `Only ${formatMoney(remaining)} left... not even enough for a coffee.`}
            </p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setBrokeAnimation(false)} className="pixel-btn">
                Keep Shopping
              </button>
              <button
                onClick={() => setShowReceipt(true)}
                className="pixel-btn"
                style={{
                  borderColor: 'var(--color-orange)',
                  color: 'var(--color-orange)',
                }}
              >
                View Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {ITEMS.map((item) => {
            const qty = cart[item.id]?.quantity || 0;
            const itemTotal = item.price * qty;
            const canAfford = remaining >= item.price;

            return (
              <div
                key={item.id}
                className="pixel-card rounded-lg p-3 md:p-4 flex flex-col"
                style={{
                  opacity: canAfford || qty > 0 ? 1 : 0.4,
                }}
              >
                <div className="text-center mb-2">
                  <span className="text-3xl md:text-4xl block mb-1">{item.emoji}</span>
                  <h3
                    className="text-xs md:text-sm font-semibold leading-tight"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {item.name}
                  </h3>
                  <p className="mono-text text-sm md:text-base font-bold mt-1" style={{ color: 'var(--color-accent)' }}>
                    {formatMoney(item.price)}
                  </p>
                </div>

                <div className="mt-auto">
                  {/* Quantity Controls */}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={qty === 0}
                      className="w-8 h-8 rounded flex items-center justify-center text-lg font-bold transition-all duration-150 border"
                      style={{
                        borderColor: qty > 0 ? 'var(--color-red)' : 'var(--color-border)',
                        color: qty > 0 ? 'var(--color-red)' : 'var(--color-text-muted)',
                        backgroundColor: 'transparent',
                        cursor: qty > 0 ? 'pointer' : 'not-allowed',
                      }}
                    >
                      -
                    </button>
                    <span
                      className="mono-text w-8 text-center text-sm font-bold"
                      style={{ color: qty > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                    >
                      {qty}
                    </span>
                    <button
                      onClick={() => addItem(item.id, item.price)}
                      disabled={!canAfford}
                      className="w-8 h-8 rounded flex items-center justify-center text-lg font-bold transition-all duration-150 border"
                      style={{
                        borderColor: canAfford ? 'var(--color-accent)' : 'var(--color-border)',
                        color: canAfford ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        backgroundColor: 'transparent',
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Item Total */}
                  {qty > 0 && (
                    <p
                      className="mono-text text-xs text-center mt-2 animate-fade-in-up"
                      style={{ color: 'var(--color-orange)' }}
                    >
                      Total: {formatMoney(itemTotal)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reset Button */}
        <div className="text-center mt-8 mb-12">
          <button onClick={resetGame} className="pixel-btn">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
