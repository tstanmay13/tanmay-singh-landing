# tanmay-singh.com

Personal portfolio and game arcade built with Next.js 15, React 19, TypeScript, and Tailwind CSS 4.

**Live:** https://tanmay-singh.com
**Repo:** https://github.com/tstanmay13/tanmay-singh-landing

## Theme: Retro Pixel Art / 8-Bit

The site uses a retro pixel-art aesthetic with CRT effects, custom cursor, and dark/light mode.

### Design System

- **Colors:** Use CSS variables `var(--color-*)` defined in `globals.css` — NEVER hardcode colors
- **Dark mode default**, light mode via toggle. Theme managed by `ThemeProvider.tsx`
- **Fonts:** Press Start 2P (pixel headings), Space Grotesk (body), JetBrains Mono (code)
- **CSS Classes:** `pixel-text`, `pixel-card`, `pixel-btn`, `pixel-border`, `pixel-border-accent`, `glass`, `mono-text`
- **Animations:** `animate-fade-in-up`, `animate-pixel-bounce`, `animate-glow-pulse`, `animate-flicker`, `animate-cursor-blink`, `animate-float`, `animate-spin-slow`, `animate-scale-in`, `animate-slide-in-left`
- **Scroll reveals:** Use `<ScrollReveal>` component wrapping sections
- **Effects:** CRT scanlines + vignette on body, parallax star background

### Key Patterns

- **Server components by default** — use `"use client"` only when needed (state, effects, browser APIs)
- **Hydration safety:** Client components use `mounted` state pattern to prevent SSR/CSR mismatches
- **Import alias:** `@/` maps to `src/`
- **No hardcoded colors** — always use `var(--color-*)` theme variables

## Commands

```bash
npm run dev          # Dev server on port 3001 (Turbopack)
npm run build        # Production build
npm start            # Production server on port 3001
npm run lint         # ESLint
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Homepage (hero, about, projects, arcade, GitHub, contact)
│   ├── layout.tsx                  # Root layout (server component, metadata)
│   ├── opengraph-image.tsx         # Generated OG card (pixel terminal)
│   ├── not-found.tsx               # 404 "GAME OVER" page
│   ├── globals.css                 # Theme variables, animations, pixel effects, utility classes
│   ├── games/
│   │   ├── page.tsx                # Arcade gallery (33 games, category filters, play counts)
│   │   ├── <33 game dirs>          # one dir per game; ls src/app/games for the list
│   │   │                           # online multiplayer: wavelength, merge-conflict, pixel-impostor,
│   │   │                           #   dev-trivia, prompt-roulette, stack-overflow, spyfall-dev
│   │   │                           # local/pass-the-phone: person-do-thing, glitch-artist, retro-reflex
│   ├── portfolio/page.tsx          # FEATURED (hand-curated) + curated GitHub repos + activity feed
│   ├── resume/                     # Resume page (serves resume PDF)
│   ├── contact/page.tsx            # Terminal-style contact form
│   └── api/
│       ├── github-contributions/   # GitHub GraphQL contributions
│       ├── portfolio/
│       │   ├── repos/              # GitHub repos, quality-filtered (ISR 1hr)
│       │   └── activity/           # Recent commits (ISR 30min)
│       └── games/
│           ├── plays/              # GET play counts (also the keep-alive cron target)
│           ├── play/               # POST increment play count
│           └── rooms/              # multiplayer rooms: create + [code]/{join,start,state,leave}
├── components/
│   ├── ThemeProvider.tsx           # Dark/light mode context
│   ├── ClientLayout.tsx            # Client wrapper (nav, cursor, loading, parallax)
│   ├── PixelNav.tsx                # Navigation bar (Home, Games, Portfolio, Resume, Contact)
│   ├── CustomCursor.tsx            # Pixel art cursor (desktop only)
│   ├── LoadingScreen.tsx           # Game boot-up sequence
│   ├── ScrollReveal.tsx            # Intersection Observer wrapper (reveals once)
│   ├── ParallaxBackground.tsx      # Star field + floating shapes
│   ├── GamePlayCounter.tsx         # Fire-and-forget play tracking
│   └── multiplayer/                # GameLobby, PlayerList, RoomCodeDisplay, ConnectionStatus, PrivacyScreen
└── lib/
    ├── supabase.ts                 # Supabase public + admin clients
    └── multiplayer/                # useGameRoom hook, room codes, session helpers, types
```

## Backend Services

### Supabase (games backend)
- **Project:** `owwjabhinvwoaarjbmgm` (name `tanmay-singh-landing`, us-east-1, created 2026-07-02)
- **URL:** `https://owwjabhinvwoaarjbmgm.supabase.co`
- **Tables:** `game_plays` (play counters + `increment_play_count` RPC), `game_rooms` / `game_players` / `game_state` (multiplayer; see `supabase/migrations/`)
- **Realtime:** multiplayer sync runs over Supabase Realtime broadcast channels (`room:<CODE>`)
- **History:** the original project (`xnicwzxnqfavwwnmxaqh`) was idle-paused and then deleted by Supabase free tier in mid-2026, which silently killed multiplayer, play counts, and the old blog. The blog/learning features were removed rather than restored.
- **Keep-alive:** `vercel.json` cron hits `/api/games/plays` daily so the project never idles into a pause. Do not remove it.

### GitHub Integration
- **Username:** `tstanmay13`
- **Token:** `GH_TOKEN_BASIC` env var
- Contributions via GraphQL API
- Repos + activity via REST API with ISR caching
- `/api/portfolio/repos` applies a quality bar: public, non-fork, non-archived, has a description, name not matching junk patterns. To surface a repo on the portfolio page, give it a description on GitHub.

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `GH_TOKEN_BASIC` | Vercel | GitHub API token |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Supabase anon key (reads + realtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + `.env.local` | Supabase secret key (all writes via API routes) |

## Deployment

- **Host:** Vercel
- **Domain:** tanmay-singh.com
- **Auto-deploy:** Push to `master` triggers production deploy
- **Preview:** PRs get preview deployments automatically
- **Team:** `tstanmay13s-projects`

## Adding New Games

1. Create `src/app/games/[game-name]/page.tsx`
2. Use `"use client"`, `mounted` pattern, TypeScript interfaces
3. Style with `var(--color-*)` variables and `pixel-*` CSS classes
4. Add entry to games array in `src/app/games/page.tsx`
5. Include back link to `/games`

## Git Conventions

- Feature branches: `feat/[feature-name]`
- PRs to `master` with descriptive titles
- Commit messages explain WHY, not WHAT
- Co-authored commits: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
