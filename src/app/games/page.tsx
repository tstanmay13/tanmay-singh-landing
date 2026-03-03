'use client';

import Link from 'next/link';

interface Game {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  status: 'playable' | 'coming-soon';
}

const games: Game[] = [
  {
    id: 'slevens',
    title: 'Slevens',
    description: 'Shake your phone to roll the dice!',
    icon: '🎲',
    path: '/games/slevens',
    status: 'playable'
  },
  {
    id: 'snakes',
    title: 'Snake Game',
    description: 'Classic snake game with a modern twist',
    icon: '🐍',
    path: '/games/snakes',
    status: 'playable'
  },
];

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F0]">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-block mb-6 text-[#B8A082] hover:text-[#FFB347] transition-colors"
          >
            ← Back to Menu
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-[#F5F5F0] mb-3">
            🎮 Game Lounge
          </h1>
          <p className="text-lg text-[#B8A082]">
            Take a break • Refill your drink
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((game) => (
            <Link
              key={game.id}
              href={game.path}
              className={`bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 hover:-translate-y-1 hover:border-[#FFB347]/50 hover:shadow-[0_0_30px_rgba(255,179,71,0.15)] transition-all duration-300 block ${
                game.status === 'coming-soon' ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              onClick={(e) => {
                if (game.status === 'coming-soon') {
                  e.preventDefault();
                }
              }}
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl">{game.icon}</span>
                <div>
                  <h2 className="text-xl font-semibold text-[#F5F5F0] group-hover:text-[#FFB347] transition-colors">
                    {game.title}
                  </h2>
                  <p className="text-sm text-[#B8A082]">
                    {game.description}
                  </p>
                </div>
              </div>
              {game.status === 'coming-soon' ? (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#2A2520] text-[#B8A082]">
                  Coming Soon
                </span>
              ) : (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#FFB347]/20 text-[#FFB347] border border-[#FFB347]/30">
                  Play →
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-[#B8A082]/50 text-sm">
          <p>More games coming soon 🍣</p>
        </footer>
      </div>
    </div>
  );
}
