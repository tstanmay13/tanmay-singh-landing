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
  // Add more games here as you build them
];

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#FFE8D6] p-5 md:p-10">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10">
        <Link
          href="/"
          className="inline-block mb-6 text-[#593B2B] hover:text-[#D99C64] transition-colors"
        >
          ← Back to Home
        </Link>
        <h1 className="text-5xl md:text-6xl font-bold text-[#593B2B] mb-4">
          🎮 Games
        </h1>
        <p className="text-xl text-[#D99C64]">
          Check out my collection of games and interactive projects
        </p>
      </div>

      {/* Games Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <Link
            key={game.id}
            href={game.path}
            className={`bg-white rounded-2xl p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(249,200,177,0.4)] block ${
              game.status === 'coming-soon' ? 'opacity-60 cursor-not-allowed' : ''
            }`}
            onClick={(e) => {
              if (game.status === 'coming-soon') {
                e.preventDefault();
              }
            }}
          >
            <div className="text-6xl mb-4 hover:animate-wiggle inline-block">
              {game.icon}
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-[#593B2B]">
              {game.title}
            </h2>
            <p className="text-sm text-[#D99C64] mb-4">
              {game.description}
            </p>
            {game.status === 'coming-soon' ? (
              <span className="inline-block px-4 py-2 rounded-full text-xs font-medium bg-[#FFE8D6] text-[#593B2B]">
                Coming Soon
              </span>
            ) : (
              <span className="inline-block px-4 py-2 rounded-full text-xs font-medium bg-[#D99C64] text-white">
                Play Now →
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Add wiggle animation */}
      <style jsx>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        .hover\:animate-wiggle:hover {
          animation: wiggle 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
