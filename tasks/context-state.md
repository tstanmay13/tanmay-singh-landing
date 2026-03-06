# Context State

## Current Objective
Full revamp of tanmay-singh.com with pixel-art/retro gaming aesthetic

## What's Done
- Read entire codebase (8 source files)
- Created feature branch `revamp/full-site-redesign`
- Set up task tracking

## What's In Progress
- Phase 1: Design research + Game ideation (parallel agents)

## Key Files
- `src/app/layout.tsx` - Root layout (needs theme provider, fonts, nav)
- `src/app/page.tsx` - Homepage (full redesign)
- `src/app/globals.css` - Global styles (needs animation system)
- `src/components/BentoLinkCard.tsx` - Card component (needs pixel-art reskin)
- `src/app/games/page.tsx` - Games landing (needs arcade gallery redesign)

## Architecture Decisions
- Keep Next.js 15 App Router architecture
- Use CSS animations + Intersection Observer (no heavy libs)
- Pixel font for headings, modern font for body
- Dark/light mode via CSS variables + React context
- Each game as self-contained route under `/games/[name]`

## Tech Stack
- Next.js 15.4.4, React 19, TypeScript 5, Tailwind CSS 4
- Dependencies: lucide-react (existing)
- Will add: pixel font (Google Fonts or local)
