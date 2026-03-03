"use client";

import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [contributions, setContributions] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        const response = await fetch('/api/github-contributions');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setContributions(data.totalContributions);
      } catch (error) {
        console.error('Failed to fetch:', error);
        setContributions(243);
      }
    };
    fetchContributions();
  }, []);

  const sushiEmojis = ['🍣', '🍤', '🍙', '🥢', '🍱', '🍘'];
  const positions = [
    { top: '8%', left: '5%', delay: '0s' },
    { top: '15%', right: '8%', delay: '2s' },
    { top: '70%', left: '3%', delay: '4s' },
    { top: '75%', right: '5%', delay: '1s' },
    { top: '40%', left: '2%', delay: '3s' },
    { top: '50%', right: '3%', delay: '5s' },
  ];

  return (
    <>
      {/* Floating Sushi Decorations */}
      {mounted && sushiEmojis.map((emoji, i) => (
        <div
          key={i}
          className="fixed text-4xl opacity-10 pointer-events-none animate-float"
          style={{
            top: positions[i].top,
            left: positions[i].left,
            right: positions[i].right,
            animationDelay: positions[i].delay,
          }}
        >
          {emoji}
        </div>
      ))}
      
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F0]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          
          {/* Hero Section */}
          <header className="text-center mb-20 relative">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-glow">
              Tanmay Singh
            </h1>
            <p className="text-xl text-[#B8A082] mb-4">
              Full-Stack Developer
            </p>
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-[#FFB347]/20 text-[#FFB347] border border-[#FFB347]/30">
              ✨ Open for Orders
            </span>
          </header>

          {/* About Section */}
          <section className="mb-12">
            <div className="bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-8 hover:border-[#FFB347]/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">👨‍🍳</span>
                <h2 className="text-2xl font-semibold text-[#F5F5F0]">About</h2>
              </div>
              <p className="text-[#B8A082] leading-relaxed">
                Crafting delicious web experiences with the finest ingredients. 
                Passion elegantate about building solutions that leave a lasting taste.
              </p>
            </div>
          </section>

          {/* Links Grid */}
          <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Games */}
              <a
                href="/games"
                className="group bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 hover:-translate-y-1 hover:border-[#FFB347]/50 hover:shadow-[0_0_30px_rgba(255,179,71,0.15)] transition-all duration-300 block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎮</span>
                  <h3 className="text-lg font-semibold text-[#F5F5F0] group-hover:text-[#FFB347] transition-colors">Games</h3>
                </div>
                <p className="text-sm text-[#B8A082]">Interactive digital delights</p>
              </a>

              {/* Portfolio */}
              <a
                href="https://portfolio.tanmay-singh.com"
                className="group bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 hover:-translate-y-1 hover:border-[#FFB347]/50 hover:shadow-[0_0_30px_rgba(255,179,71,0.15)] transition-all duration-300 block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🍜</span>
                  <h3 className="text-lg font-semibold text-[#F5F5F0] group-hover:text-[#FFB347] transition-colors">Portfolio</h3>
                </div>
                <p className="text-sm text-[#B8A082]">A collection of signature dishes</p>
              </a>

              {/* Blog */}
              <a
                href="https://blog.tanmay-singh.com"
                className="group bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 hover:-translate-y-1 hover:border-[#FFB347]/50 hover:shadow-[0_0_30px_rgba(255,179,71,0.15)] transition-all duration-300 block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📝</span>
                  <h3 className="text-lg font-semibold text-[#F5F5F0] group-hover:text-[#FFB347] transition-colors">Blog</h3>
                </div>
                <p className="text-sm text-[#B8A082]">Fresh thoughts daily</p>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/tstanmay13"
                className="group bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 hover:-translate-y-1 hover:border-[#FFB347]/50 hover:shadow-[0_0_30px_rgba(255,179,71,0.15)] transition-all duration-300 block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🐙</span>
                  <h3 className="text-lg font-semibold text-[#F5F5F0] group-hover:text-[#FFB347] transition-colors">GitHub</h3>
                </div>
                <p className="text-sm text-[#B8A082]">700+ contributions this year</p>
              </a>
            </div>
          </section>

          {/* GitHub Stats */}
          <section className="mb-12">
            <div className="bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-8 text-center hover:border-[#FFB347]/50 transition-all duration-300">
              <span className="text-4xl mb-4 block">📊</span>
              <div className="text-4xl font-bold text-[#FFB347] mb-2">
                {contributions !== null ? contributions : '...'}
              </div>
              <p className="text-[#B8A082]">Total GitHub contributions</p>
            </div>
          </section>

          {/* Contact Section */}
          <section>
            <div className="bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-8 text-center hover:border-[#FFB347]/50 transition-all duration-300">
              <span className="text-4xl mb-4 block">💌</span>
              <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
              <p className="text-[#B8A082] mb-6">Place your order • Follow along</p>
              <div className="flex justify-center gap-6">
                <a
                  href="mailto:contact@tanmay-singh.com"
                  className="text-2xl text-[#B8A082] hover:text-[#FFB347] hover:scale-110 transition-all"
                >
                  📧
                </a>
                <a
                  href="https://github.com/tanmaysingh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xl text-[#B8A082] hover:text-[#FFB347] hover:scale-110 transition-all"
                >
                  🐙
                </a>
                <a
                  href="https://twitter.com/tanmaysingh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xl text-[#B8A082] hover:text-[#FFB347] hover:scale-110 transition-all"
                >
                  🐦
                </a>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="text-center mt-16 text-[#B8A082]/50 text-sm">
            <p>© 2024 Tanmay Singh • Served fresh</p>
          </footer>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        .animate-float {
          animation: float 18s infinite ease-in-out;
        }
        
        .text-glow {
          text-shadow: 0 0 40px rgba(255, 179, 71, 0.4),
                       0 0 80px rgba(255, 179, 71, 0.2);
        }
      `}</style>
    </>
  );
}
