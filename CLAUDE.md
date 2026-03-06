# tanmay-singh.com

Personal portfolio, game arcade, and blog built with Next.js 15, React 19, TypeScript, and Tailwind CSS 4.

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
│   ├── page.tsx                    # Homepage (hero, bio, projects, arcade, GitHub, contact)
│   ├── layout.tsx                  # Root layout (server component, metadata)
│   ├── not-found.tsx               # 404 "GAME OVER" page
│   ├── globals.css                 # Theme variables, animations, pixel effects, utility classes
│   ├── blog/
│   │   ├── page.tsx                # Blog list (search, tags, pagination)
│   │   ├── [slug]/page.tsx         # Blog post (markdown rendering, share, prev/next)
│   │   └── admin/page.tsx          # Admin panel (password-protected CRUD)
│   ├── games/
│   │   ├── page.tsx                # Arcade gallery (23 games, category filters)
│   │   ├── salary/                 # Spend My Salary
│   │   ├── reflex-duel/            # Cowboy reaction test
│   │   ├── color-guesser/          # Hex code matching
│   │   ├── memory-matrix/          # Pattern memory
│   │   ├── type-racer/             # Typing speed test
│   │   ├── pixel-painter/          # Pixel art editor
│   │   ├── password-game/          # Absurd password rules
│   │   ├── perfect-shape/          # Draw geometric shapes
│   │   ├── pixel-perfector/        # Memorize pixel patterns
│   │   ├── element-mixer/          # Combine elements
│   │   ├── stack-tower/            # Block stacking
│   │   ├── dev-wordle/             # Daily programming word
│   │   ├── gravity-pong/           # Pong with gravity well
│   │   ├── orbit/                  # N-body gravity sim
│   │   ├── breakout/               # Brick breaker
│   │   ├── flappy/                 # Flappy bird clone
│   │   ├── 2048/                   # Food emoji 2048
│   │   ├── minesweeper/            # Classic minesweeper
│   │   ├── maze-runner/            # Fog of war mazes
│   │   ├── guess-framework/        # Name that JS framework
│   │   ├── idle-bakery/            # Idle clicker game
│   │   ├── slevens/                # Dice drinking game
│   │   └── snakes/                 # Classic snake
│   ├── portfolio/page.tsx          # Dynamic GitHub repos + activity feed
│   ├── contact/page.tsx            # Terminal-style contact form
│   └── api/
│       ├── github-contributions/   # GitHub GraphQL contributions
│       ├── portfolio/
│       │   ├── repos/              # GitHub repos (ISR 1hr)
│       │   └── activity/           # Recent commits (ISR 30min)
│       └── blog/
│           ├── posts/              # Public: list + [slug]
│           ├── rss/                # RSS 2.0 feed
│           └── admin/
│               ├── posts/          # CRUD (cookie auth)
│               ├── login/          # Password auth -> HTTP-only cookie
│               ├── logout/         # Clear session
│               └── session/        # Check auth status
├── components/
│   ├── ThemeProvider.tsx            # Dark/light mode context
│   ├── ClientLayout.tsx            # Client wrapper (nav, cursor, loading, parallax)
│   ├── PixelNav.tsx                # Navigation bar (Home, Games, Blog, Portfolio, Contact)
│   ├── CustomCursor.tsx            # Pixel art cursor (desktop only)
│   ├── LoadingScreen.tsx           # Game boot-up sequence
│   ├── ScrollReveal.tsx            # Intersection Observer wrapper
│   ├── ParallaxBackground.tsx      # Star field + floating shapes
│   └── BentoLinkCard.tsx           # Generic link card (legacy)
└── lib/
    ├── supabase.ts                 # Supabase public + admin clients
    └── auth.ts                     # HMAC session auth helpers
```

## Backend Services

### Supabase (Blog)
- **Project:** `xnicwzxnqfavwwnmxaqh`
- **URL:** `https://xnicwzxnqfavwwnmxaqh.supabase.co`
- **Table:** `posts` (id, title, slug, content, excerpt, cover_image_url, tags[], is_published, published_at, created_at, updated_at)
- **RLS:** Public reads published posts. Service role key for admin writes.
- **Auto-update trigger** on `updated_at`

### Blog Admin Auth
- Password verified server-side via `BLOG_ADMIN_PASSWORD` env var
- Session: HMAC-SHA256 signed HTTP-only cookie (24hr expiry)
- Constant-time password comparison prevents timing attacks
- Admin at `/blog/admin` — only accessible with correct password

### GitHub Integration
- **Username:** `tstanmay13`
- **Token:** `GH_TOKEN_BASIC` env var
- Contributions via GraphQL API
- Repos + activity via REST API with ISR caching

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `GH_TOKEN_BASIC` | Vercel | GitHub API token |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Supabase anon key (public reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Supabase service key (admin writes) |
| `BLOG_ADMIN_PASSWORD` | Vercel | Blog admin login password |
| `BLOG_ADMIN_SECRET` | Vercel | HMAC signing key for session cookies |

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

## Adding Blog Posts

1. Go to `tanmay-singh.com/blog/admin`
2. Enter admin password
3. Write in markdown, set title/slug/tags, toggle publish
4. Post is live at `/blog/[slug]`

## Git Conventions

- Feature branches: `feat/[feature-name]`
- PRs to `master` with descriptive titles
- Commit messages explain WHY, not WHAT
- Co-authored commits: `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
