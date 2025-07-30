import React from 'react';

interface BentoLinkCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  hoverColor: string;
  badge?: {
    text: string;
    bgColor: string;
    textColor: string;
  };
  className?: string;
}

export default function BentoLinkCard({
  href,
  icon,
  title,
  description,
  hoverColor,
  badge,
  className = ''
}: BentoLinkCardProps) {
  return (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`bento-item bg-white p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(249,200,177,0.3)] block ${className}`}
    >
      <div className="relative z-10">
        <span className="text-[40px] mb-[15px] block hover:animate-wiggle">{icon}</span>
        <h3 className="text-2xl font-semibold mb-[10px] text-[#593B2B]">
          {title}
        </h3>
        <p className="text-sm leading-normal text-[#D99C64]">
          {description}
        </p>
        {badge && (
          <span 
            className={`inline-block px-3 py-1 rounded-[20px] text-xs mt-2.5 font-medium ${badge.bgColor} ${badge.textColor}`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <div className={`absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300 ${hoverColor}`}></div>
    </a>
  );
}