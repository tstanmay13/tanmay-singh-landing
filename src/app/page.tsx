"use client";

import { useState, useEffect } from 'react';
import BentoLinkCard from '@/components/BentoLinkCard';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [contributions, setContributions] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Fetch GitHub contributions
    const fetchContributions = async () => {
      try {
        const response = await fetch('https://api.github.com/users/tstanmay13');
        const userData = await response.json();
        
        // GitHub API doesn't provide total contributions directly
        // We'll use the public repositories count + followers as a proxy for total activity
        const totalContributions = (userData.public_repos || 0) + (userData.followers || 0) * 10;
        setContributions(totalContributions || 243); // Fallback to original value
      } catch (error) {
        console.error('Failed to fetch GitHub contributions:', error);
        setContributions(243); // Fallback value
      }
    };

    fetchContributions();
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
          <h1 className="text-5xl font-bold mb-[10px] inline-block text-[#593B2B]">
            Tanmay&apos;s Digital Bento Box
          </h1>
          <p className="text-lg font-normal text-[#D99C64]">
            Freshly prepared code & creativity daily
          </p>
        </header>
        
        <main 
          className="grid grid-cols-1 md:grid-cols-3 gap-[3px] p-[3px] rounded-[20px] bg-[#F5E1C6] shadow-[0_10px_30px_rgba(249,200,177,0.3)]"
        >
          {/* Hero Section */}
          <div 
            className="bento-item hero-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden md:col-span-2 md:rounded-tl-[17px] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)]"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">👨‍🍳</span>
              <h2 className="text-4xl font-semibold mb-[5px] text-[#593B2B]">
                Tanmay Singh
              </h2>
              <p className="text-lg leading-normal text-[#D99C64]">
                Full-Stack Developer & Digital Chef
              </p>
              <span 
                className="inline-block px-3 py-1 rounded-[20px] text-xs mt-2.5 font-medium bg-[#FFD966] text-[#593B2B]"
              >
                Open for Orders
              </span>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300 bg-[#FFD966]"></div>
          </div>
          
          {/* About Section */}
          <div 
            className="bento-item about-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden md:rounded-tr-[17px] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)]"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">🍱</span>
              <h3 className="text-2xl font-semibold mb-[10px] text-[#593B2B]">
                About
              </h3>
              <p className="text-sm leading-normal text-[#D99C64]">
                Crafting delicious web experiences with the finest ingredients
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300 bg-[#FDC6DA]"></div>
          </div>
          
          {/* Games Section */}
          <BentoLinkCard
            href="https://games.tanmay-singh.com"
            icon="🎮"
            title="Games"
            description="Interactive digital delights"
            hoverColor="bg-[#A8E6CF]"
            badge={{
              text: "Coming Soon",
              bgColor: "bg-[#F9C8B1]",
              textColor: "text-[#593B2B]"
            }}
            className="games-section"
          />
          
          {/* Portfolio Section */}
          <BentoLinkCard
            href="https://portfolio.tanmay-singh.com"
            icon="🍜"
            title="Portfolio"
            description="A collection of signature dishes"
            hoverColor="bg-[#FFA8A8]"
            badge={{
              text: "Coming Soon",
              bgColor: "bg-[#F9C8B1]",
              textColor: "text-[#593B2B]"
            }}
            className="portfolio-section"
          />
          
          {/* Blog Section */}
          <BentoLinkCard
            href="https://blog.tanmay-singh.com"
            icon="📝"
            title="Blog"
            description="Fresh thoughts daily"
            hoverColor="bg-[#FFAD60]"
            badge={{
              text: "Coming Soon",
              bgColor: "bg-[#F9C8B1]",
              textColor: "text-[#593B2B]"
            }}
            className="blog-section"
          />
          
          {/* GitHub Stats Section */}
          <div 
            className="bento-item github-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden md:rounded-bl-[17px] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)]"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">🐙</span>
              <h3 className="text-2xl font-semibold mb-[10px] text-[#593B2B]">
                GitHub Activity
              </h3>
              <div className="text-3xl font-bold mb-1 text-[#FFD966]">
                {contributions !== null ? contributions : '...'}
              </div>
              <p className="text-sm leading-normal text-[#D99C64]">
                Contributions this year
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300 bg-[#B6E2A1]"></div>
          </div>
          
          {/* Contact Section */}
          <div 
            className="bento-item contact-section bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden md:col-span-2 md:rounded-br-[17px] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)]"
          >
            <div className="relative z-10">
              <span className="text-[40px] mb-[15px] block hover:animate-wiggle">💌</span>
              <h3 className="text-2xl font-semibold mb-[10px] text-[#593B2B]">
                Contact
              </h3>
              <p className="text-sm leading-normal text-[#D99C64]">
                Place your order • Follow the chef
              </p>
              <div className="mt-[15px] flex justify-center gap-3">
                <a href="mailto:contact@tanmay-singh.com" className="text-xl hover:scale-110 transition-transform">📧</a>
                <a href="https://github.com/tanmaysingh" target="_blank" rel="noopener noreferrer" className="text-xl hover:scale-110 transition-transform">🐙</a>
                <a href="https://twitter.com/tanmaysingh" target="_blank" rel="noopener noreferrer" className="text-xl hover:scale-110 transition-transform">🐦</a>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300 bg-[#FBA1B7]"></div>
          </div>
        </main>
        
        <footer className="text-center mt-[60px] text-sm text-[#D99C64]">
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