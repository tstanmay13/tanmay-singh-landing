"use client";

import { 
  Briefcase, 
  Code, 
  Github, 
  Linkedin, 
  Mail,
  Twitter,
  Flame,
  FileText,
  Utensils
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [lidOpen, setLidOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setLidOpen(true), 100);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12 chopsticks-cursor">
      <div className={`max-w-7xl mx-auto ${lidOpen ? 'bento-container' : 'opacity-0'}`}>
        <div className="mb-4 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-sushi-rice">Welcome to Tanmay&apos;s Digital Sushi Bar</h1>
          <p className="japanese-subtitle">タンメイのデジタル寿司バー</p>
        </div>
        
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 auto-rows-[180px]">
          {/* Hero Sashimi Card - Large */}
          <div className="bento-card p-6 md:p-8 col-span-4 lg:col-span-4 row-span-1 flex flex-col justify-center cursor-pointer fish-scale">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold sushi-text mb-2">
                Tanmay Singh
              </h1>
              <p className="japanese-subtitle text-lg mb-2">タンメイ・シン</p>
              <p className="text-sushi-rice text-lg md:text-xl font-medium">
                Full-Stack Developer
              </p>
<<<<<<< Updated upstream
              <div className="mt-2 text-sm text-sushi-rice/70">
                🍣 Premium Quality Development
=======
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
>>>>>>> Stashed changes
              </div>
            </div>
          </div>

          {/* About Roll Card - Medium */}
          <div className="bento-card rice-texture p-6 col-span-2 lg:col-span-2 row-span-1 cursor-pointer">
            <h2 className="text-xl font-bold text-sushi-rice mb-3 flex items-center gap-2">
              <span className="text-2xl">🍱</span> About Roll
            </h2>
            <p className={`text-sushi-rice/80 text-sm ${mounted ? 'typing-animation' : ''}`}>
              Crafting web experiences with the precision of a sushi master.
            </p>
            <p className="text-xs text-sushi-rice/60 mt-2">Fresh ingredients daily</p>
          </div>

          {/* GitHub Soy Sauce Dish - Small circular */}
          <div className="bento-card p-4 col-span-2 row-span-1 cursor-pointer flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-soy-sauce flex flex-col items-center justify-center nori-border">
              <Github className="w-8 h-8 text-sushi-rice mb-1" />
              <div className="text-center">
                <div className="text-xl font-bold text-sushi-rice">243</div>
                <p className="text-sushi-rice/80 text-xs">Activity</p>
              </div>
            </div>
            <p className="text-xs text-sushi-rice/60 mt-2">Sauce Level</p>
          </div>

          {/* Games Nigiri Card - Medium */}
          <a 
            href="https://games.tanmay-singh.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bento-card p-6 col-span-2 row-span-1 cursor-pointer group"
          >
            <div className="flex flex-col h-full">
              <div className="text-3xl mb-2">🎮</div>
              <h2 className="text-xl font-bold text-sushi-rice">Games Nigiri</h2>
              <p className="text-sushi-rice/80 text-sm mt-1">
                Fresh Games Daily
              </p>
              <p className="text-wasabi-green text-sm mt-auto group-hover:glow">(Coming Soon)</p>
            </div>
          </a>

          {/* Portfolio Maki Card - Medium */}
          <a 
            href="https://portfolio.tanmay-singh.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bento-card p-6 col-span-2 row-span-1 cursor-pointer group"
          >
            <div className="flex flex-col h-full">
              <div className="text-3xl mb-2">💼</div>
              <h2 className="text-xl font-bold text-sushi-rice">Portfolio Maki</h2>
              <p className="text-sushi-rice/80 text-sm mt-1">
                Rolled to perfection
              </p>
              <p className="text-wasabi-green text-sm mt-auto">(Coming Soon)</p>
            </div>
          </a>

          {/* Blog Temaki Card - Small */}
          <a 
            href="https://blog.tanmay-singh.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bento-card p-4 col-span-2 row-span-1 cursor-pointer group"
          >
            <div className="flex flex-col h-full">
              <div className="text-2xl mb-2">✍️</div>
              <h2 className="text-lg font-bold text-sushi-rice">Blog Temaki</h2>
              <p className="text-sushi-rice/80 text-xs">Today&apos;s Special Thoughts</p>
              <p className="text-wasabi-green text-xs mt-auto">(Coming Soon)</p>
            </div>
          </a>

          {/* Projects Bento Card - Medium */}
          <a 
            href="https://projects.tanmay-singh.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bento-card p-6 col-span-2 row-span-1 cursor-pointer group"
          >
            <div className="flex flex-col h-full">
              <div className="text-3xl mb-2">🥢</div>
              <h2 className="text-xl font-bold text-sushi-rice">Projects Bento</h2>
              <p className="text-sushi-rice/80 text-sm">
                Traditional compartments
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <div className="bg-sushi-rice/10 rounded p-1 text-xs text-center">React</div>
                <div className="bg-sushi-rice/10 rounded p-1 text-xs text-center">Node</div>
                <div className="bg-sushi-rice/10 rounded p-1 text-xs text-center">TS</div>
                <div className="bg-sushi-rice/10 rounded p-1 text-xs text-center">+3</div>
              </div>
            </div>
          </a>

          {/* Currently Cooking Card - Small with steam */}
          <div className="bento-card p-4 col-span-2 row-span-1 cursor-pointer steam-animation">
            <div className="flex flex-col h-full">
              <div className="text-2xl mb-2">🔥</div>
              <h2 className="text-lg font-bold text-sushi-rice">Now Cooking</h2>
              <p className="text-sushi-rice/80 text-sm">Three.js Ramen</p>
              <p className="text-xs text-salmon-pink mt-1">Hot & Fresh</p>
            </div>
          </div>

          {/* Contact Wasabi Card - Small, green accent */}
          <div className="bento-card wasabi p-4 col-span-2 row-span-1 cursor-pointer bg-wasabi-green/20">
            <h2 className="text-lg font-bold text-sushi-rice mb-3">Contact Wasabi</h2>
            <p className="text-xs text-sushi-rice/80 mb-3">Adds flavor to connections</p>
            <div className="grid grid-cols-2 gap-2">
              <a 
                href="https://github.com/tanmaysingh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded bg-sushi-rice/10 hover:bg-wasabi-green/20 transition-colors flex items-center justify-center"
              >
                <Github className="w-4 h-4" />
              </a>
              <a 
                href="https://linkedin.com/in/tanmaysingh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded bg-sushi-rice/10 hover:bg-wasabi-green/20 transition-colors flex items-center justify-center"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a 
                href="https://twitter.com/tanmaysingh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded bg-sushi-rice/10 hover:bg-wasabi-green/20 transition-colors flex items-center justify-center"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="mailto:contact@tanmay-singh.com" 
                className="p-2 rounded bg-sushi-rice/10 hover:bg-wasabi-green/20 transition-colors flex items-center justify-center"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sushi-rice/60 text-sm">
            🍣 Serving Fresh Code Since 2024 • おいしい!
          </p>
          <p className="text-xs text-sushi-rice/40 mt-1">
            Prepared with <Utensils className="inline w-3 h-3" /> by Chef Tanmay
          </p>
        </div>
      </div>

      {/* Cherry Blossom Petals */}
      {mounted && (
        <>
          <div className="cherry-blossom" style={{ left: '10%', animationDuration: '15s', animationDelay: '0s' }} />
          <div className="cherry-blossom" style={{ left: '30%', animationDuration: '20s', animationDelay: '5s' }} />
          <div className="cherry-blossom" style={{ left: '50%', animationDuration: '18s', animationDelay: '2s' }} />
          <div className="cherry-blossom" style={{ left: '70%', animationDuration: '22s', animationDelay: '7s' }} />
          <div className="cherry-blossom" style={{ left: '90%', animationDuration: '25s', animationDelay: '10s' }} />
        </>
      )}
    </div>
  );
}