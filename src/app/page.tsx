"use client";

import { 
  Gamepad2, 
  Briefcase, 
  PenTool, 
  Code, 
  Github, 
  Linkedin, 
  Mail,
  Twitter,
  BookOpen
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[200px]">
          {/* Hero Card - Large */}
          <div className="glass-card rounded-2xl p-6 md:p-8 col-span-2 md:col-span-2 lg:col-span-3 row-span-1 flex flex-col justify-center cursor-pointer">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold gradient-text mb-2">
              Tanmay Singh
            </h1>
            <p className="text-gray-400 text-lg md:text-xl">
              Full-Stack Developer & Game Creator
            </p>
          </div>

          {/* About Card - Medium */}
          <div className="glass-card rounded-2xl p-6 col-span-2 md:col-span-2 lg:col-span-2 row-span-1 cursor-pointer">
            <h2 className="text-2xl font-bold text-white mb-3">About</h2>
            <p className={`text-gray-400 ${mounted ? 'typing-animation' : ''}`}>
              Building interactive web experiences and games. Passionate about creating things that live on the internet.
            </p>
          </div>

          {/* GitHub Stats Card - Medium */}
          <div className="glass-card rounded-2xl p-6 col-span-2 md:col-span-2 lg:col-span-1 row-span-1 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white">GitHub</h2>
              <Github className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">243</div>
              <p className="text-gray-400 text-sm">Contributions this year</p>
            </div>
          </div>

          {/* Games Card - Medium */}
          <a 
            href="https://games.tanmay-singh.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="glass-card rounded-2xl p-6 col-span-1 md:col-span-2 lg:col-span-2 row-span-1 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white">Games</h2>
              <Gamepad2 className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-gray-400">
              Explore my collection of web-based games
            </p>
            <p className="text-purple-400 text-sm mt-2">(Coming Soon)</p>
          </a>

          {/* Portfolio Card - Medium */}
          <a 
            href="https://portfolio.tanmay-singh.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="glass-card rounded-2xl p-6 col-span-1 md:col-span-2 lg:col-span-2 row-span-1 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white">Portfolio</h2>
              <Briefcase className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-gray-400">
              View my work and projects
            </p>
            <p className="text-purple-400 text-sm mt-2">(Coming Soon)</p>
          </a>

          {/* Blog Card - Small */}
          <a 
            href="https://blog.tanmay-singh.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="glass-card rounded-2xl p-6 col-span-1 row-span-1 cursor-pointer group"
          >
            <div className="flex flex-col h-full justify-between">
              <PenTool className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
              <div>
                <h2 className="text-lg font-bold text-white">Blog</h2>
                <p className="text-gray-400 text-sm">(Coming Soon)</p>
              </div>
            </div>
          </a>

          {/* Projects Card - Small */}
          <a 
            href="https://projects.tanmay-singh.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="glass-card rounded-2xl p-6 col-span-1 row-span-1 cursor-pointer group"
          >
            <div className="flex flex-col h-full justify-between">
              <Code className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
              <div>
                <h2 className="text-lg font-bold text-white">Projects</h2>
                <p className="text-gray-400 text-sm">Open Source</p>
              </div>
            </div>
          </a>

          {/* Currently Card - Small */}
          <div className="glass-card rounded-2xl p-6 col-span-1 row-span-1 cursor-pointer">
            <div className="flex flex-col h-full justify-between">
              <BookOpen className="w-8 h-8 text-purple-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Currently</h2>
                <p className="text-gray-400 text-sm">Learning Three.js</p>
              </div>
            </div>
          </div>

          {/* Contact Card - Small */}
          <div className="glass-card rounded-2xl p-6 col-span-1 row-span-1 cursor-pointer">
            <h2 className="text-lg font-bold text-white mb-4">Connect</h2>
            <div className="flex gap-3">
              <a 
                href="https://github.com/tanmaysingh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/10 hover:bg-purple-500/20 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/in/tanmaysingh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/10 hover:bg-purple-500/20 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://twitter.com/tanmaysingh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/10 hover:bg-purple-500/20 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="mailto:contact@tanmay-singh.com" 
                className="p-2 rounded-lg bg-white/10 hover:bg-purple-500/20 transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}