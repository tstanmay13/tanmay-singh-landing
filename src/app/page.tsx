"use client";

import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Kawaii decorations */}
      {mounted && (
        <>
          <div className="fixed text-3xl opacity-30 pointer-events-none animate-float" style={{ top: '10%', left: '5%', animationDelay: '0s' }}>
            🍙
          </div>
          <div className="fixed text-3xl opacity-30 pointer-events-none animate-float" style={{ top: '60%', right: '5%', animationDelay: '2s' }}>
            🍱
          </div>
          <div className="fixed text-3xl opacity-30 pointer-events-none animate-float" style={{ bottom: '20%', left: '10%', animationDelay: '4s' }}>
            🥢
          </div>
        </>
      )}
      
      <div className="container max-w-[1200px] mx-auto px-5 py-10">
        <header className="text-center mb-[60px] relative">
          <div className="absolute left-1/2 -top-[30px] -translate-x-1/2 -rotate-45 text-[40px] opacity-60">
            🥢
          </div>
          <h1 className="text-5xl font-bold mb-[10px] inline-block" style={{ color: '#593B2B' }}>
            Tanmay&apos;s Digital Bento Box
          </h1>
          <p className="text-lg font-normal" style={{ color: '#D99C64' }}>
            Freshly prepared code & creativity daily
          </p>
        </header>
        
        <main 
          className="grid grid-cols-1 md:grid-cols-3 gap-[3px] p-[3px] rounded-[20px]"
          style={{ 
            backgroundColor: '#F5E1C6',
            boxShadow: '0 10px 30px rgba(249, 200, 177, 0.3)'
          }}
        >
          {/* Hero Section */}
          <div 
            className="bento-item hero-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden md:col-span-2 md:rounded-tl-[17px] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)]"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">👨‍🍳</span>
              <h2 className="text-4xl font-semibold mb-[5px]" style={{ color: '#593B2B' }}>
                Tanmay Singh
              </h2>
              <p className="text-lg leading-normal" style={{ color: '#D99C64' }}>
                Full-Stack Developer & Digital Chef
              </p>
              <span 
                className="inline-block px-3 py-1 rounded-[20px] text-xs mt-2.5 font-medium"
                style={{ backgroundColor: '#FFD966', color: '#593B2B' }}
              >
                Open for Orders
              </span>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300" style={{ backgroundColor: '#FFD966' }}></div>
          </div>
          
          {/* About Section */}
          <div 
            className="bento-item about-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden md:rounded-tr-[17px] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)]"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">🍱</span>
              <h3 className="text-2xl font-semibold mb-[10px]" style={{ color: '#593B2B' }}>
                About
              </h3>
              <p className="text-sm leading-normal" style={{ color: '#D99C64' }}>
                Crafting delicious web experiences with the finest ingredients
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300" style={{ backgroundColor: '#FDC6DA' }}></div>
          </div>
          
          {/* Games Section */}
          <a 
            href="https://games.tanmay-singh.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bento-item games-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)] block"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">🎮</span>
              <h3 className="text-2xl font-semibold mb-[10px]" style={{ color: '#593B2B' }}>
                Games
              </h3>
              <p className="text-sm leading-normal" style={{ color: '#D99C64' }}>
                Interactive digital delights
              </p>
              <span 
                className="inline-block px-3 py-1 rounded-[20px] text-xs mt-2.5 font-medium"
                style={{ backgroundColor: '#F9C8B1', color: '#593B2B' }}
              >
                Coming Soon
              </span>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300" style={{ backgroundColor: '#A8E6CF' }}></div>
          </a>
          
          {/* Portfolio Section */}
          <a 
            href="https://portfolio.tanmay-singh.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bento-item portfolio-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)] block"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">🍜</span>
              <h3 className="text-2xl font-semibold mb-[10px]" style={{ color: '#593B2B' }}>
                Portfolio
              </h3>
              <p className="text-sm leading-normal" style={{ color: '#D99C64' }}>
                A collection of signature dishes
              </p>
              <span 
                className="inline-block px-3 py-1 rounded-[20px] text-xs mt-2.5 font-medium"
                style={{ backgroundColor: '#F9C8B1', color: '#593B2B' }}
              >
                Coming Soon
              </span>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300" style={{ backgroundColor: '#FFA8A8' }}></div>
          </a>
          
          {/* Blog Section */}
          <a 
            href="https://blog.tanmay-singh.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bento-item blog-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)] block"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">📝</span>
              <h3 className="text-2xl font-semibold mb-[10px]" style={{ color: '#593B2B' }}>
                Blog
              </h3>
              <p className="text-sm leading-normal" style={{ color: '#D99C64' }}>
                Fresh thoughts daily
              </p>
              <span 
                className="inline-block px-3 py-1 rounded-[20px] text-xs mt-2.5 font-medium"
                style={{ backgroundColor: '#F9C8B1', color: '#593B2B' }}
              >
                Coming Soon
              </span>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300" style={{ backgroundColor: '#FFAD60' }}></div>
          </a>
          
          {/* GitHub Stats Section */}
          <div 
            className="bento-item github-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden md:rounded-bl-[17px] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)]"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">🐙</span>
              <h3 className="text-2xl font-semibold mb-[10px]" style={{ color: '#593B2B' }}>
                GitHub Activity
              </h3>
              <div className="text-3xl font-bold mb-1" style={{ color: '#FFD966' }}>
                243
              </div>
              <p className="text-sm leading-normal" style={{ color: '#D99C64' }}>
                Contributions this year
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300" style={{ backgroundColor: '#B6E2A1' }}></div>
          </div>
          
          {/* Contact Section */}
          <div 
            className="bento-item contact-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden md:col-span-2 md:rounded-br-[17px] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)]"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">💌</span>
              <h3 className="text-2xl font-semibold mb-[10px]" style={{ color: '#593B2B' }}>
                Contact
              </h3>
              <p className="text-sm leading-normal" style={{ color: '#D99C64' }}>
                Place your order • Follow the chef
              </p>
              <div className="mt-[15px] flex justify-center gap-3">
                <a href="mailto:contact@tanmay-singh.com" className="text-xl hover:scale-110 transition-transform">📧</a>
                <a href="https://github.com/tanmaysingh" target="_blank" rel="noopener noreferrer" className="text-xl hover:scale-110 transition-transform">🐙</a>
                <a href="https://twitter.com/tanmaysingh" target="_blank" rel="noopener noreferrer" className="text-xl hover:scale-110 transition-transform">🐦</a>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300" style={{ backgroundColor: '#FBA1B7' }}></div>
          </div>
        </main>
        
        <footer className="text-center mt-[60px] text-sm" style={{ color: '#D99C64' }}>
          <p>🍣 Serving fresh code since 2024 • Made with 💝 by Chef Tanmay</p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        
        .animate-float {
          animation: float 10s infinite ease-in-out;
        }
        
        .hover\\:animate-wiggle:hover {
          animation: wiggle 0.5s ease;
        }
        
        /* Mobile rounded corners */
        @media (max-width: 768px) {
          .bento-item:first-child {
            border-radius: 17px 17px 0 0 !important;
          }
          
          .bento-item:last-child {
            border-radius: 0 0 17px 17px !important;
          }
          
          .bento-item:not(:first-child):not(:last-child) {
            border-radius: 0 !important;
          }
        }
      `}</style>
    </>
  );
}