# Tanmay Singh Landing Page

Personal portfolio and game lounge built with Next.js and Tailwind CSS.

## Theme: Modern Dark Sushi Bar 🍣

This project uses a cohesive dark sushi bar aesthetic across all pages.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Background (Deep) | Charcoal Black | `#0D0D0D` |
| Background (Surface) | Warm Black | `#1A1A1A` |
| Primary Accent | Amber Gold | `#FFB347` |
| Secondary Accent | Salmon Pink | `#FA8072` |
| Text Primary | Warm White | `#F5F5F0` |
| Text Secondary | Muted Gold | `#B8A082` |
| Border/Divider | Dark Gold | `#2A2520` |

### Typography

- Headings: Bold, clean sans-serif
- Body: System sans-serif
- Use amber (`#FFB347`) for emphasis and highlights

### Components

#### Cards
```tsx
<div className="bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 
  hover:-translate-y-1 hover:border-[#FFB347]/50 
  hover:shadow-[0_0_30px_rgba(255,179,71,0.15)] transition-all duration-300">
```

#### Text Glow (for hero)
```tsx
text-glow {
  text-shadow: 0 0 40px rgba(255, 179, 71, 0.4),
               0 0 80px rgba(255, 179, 71, 0.2);
}
```

#### Floating Decorations
```tsx
// Sushi emoji decorations with float animation
<div className="fixed text-4xl opacity-10 animate-float">
  🍣
</div>

// Animation
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}
.animate-float { animation: float 18s infinite ease-in-out; }
```

### Page Templates

#### Standard Page Layout
```tsx
<div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F0]">
  <div className="max-w-4xl mx-auto px-6 py-16">
    {/* Header */}
    <h1 className="text-4xl md:text-5xl font-bold text-[#F5F5F0] mb-3">
      Title
    </h1>
    {/* Content */}
  </div>
</div>
```

#### Card Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <a href="..." className="bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 
    hover:-translate-y-1 hover:border-[#FFB347]/50 
    hover:shadow-[0_0_30px_rgba(255,179,71,0.15)] transition-all duration-300">
    {/* Card content */}
  </a>
</div>
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main landing page
│   ├── games/
│   │   ├── page.tsx      # Games lobby
│   │   ├── slevens/      # Dice game
│   │   └── snakes/       # Snake game
│   └── api/
│       └── github-contributions/
└── components/           # Reusable components (if any)
```

## Running Locally

```bash
npm run dev    # Development server
npm run build  # Production build
npm run lint   # Lint code
```

## Deployment

Automatically deployed to Vercel on push to main/master.
