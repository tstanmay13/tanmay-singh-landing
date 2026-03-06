# Design Brief: tanmay-singh.com Full Revamp
## Retro 8-Bit / Pixel Art + Modern Glassmorphism

**Date:** 2026-03-06
**Objective:** Transform the current kawaii bento-box landing page into a premium, interactive pixel-art developer portfolio with modern glassmorphism elements.

---

## 1. Inspiration Site Analysis

### 1.1 Bruno Simon (bruno-simon.com)
**What it does:** Entire portfolio is a 3D environment built with Three.js. You drive a toy car around a miniature world to navigate between sections (projects, about, contact).

- **Layout:** No traditional layout. Content exists as 3D objects in a virtual world. Sections are physical locations you drive to.
- **Navigation:** The car IS the navigation. WASD/arrow keys to drive. Sections are signposted in the 3D world.
- **Animations:** Physics-based (cannon.js). Objects react to the car with realistic collisions. Bowling pins scatter, ramps launch the car.
- **Color scheme:** Warm earth tones. Muted greens, browns, and soft whites for the ground plane. Accent colors on interactive objects.
- **Typography:** Minimal text. 3D extruded lettering in the environment.
- **What makes it premium:** The commitment to a single metaphor (toy car world) executed flawlessly. Zero compromise between "cool portfolio" and "usable navigation." Physics feel genuinely satisfying.
- **Takeaway for us:** A strong single metaphor carried throughout creates memorability. We should commit fully to the pixel-art game world metaphor.

### 1.2 Neal.fun (neal.fun)
**What it does:** Collection of creative browser experiences - "Spend Bill Gates' Money," "The Deep Sea," "The Size of Space."

- **Layout:** Each experience is a standalone page. Landing page is a simple grid of project cards. Individual experiences use full-viewport immersive layouts.
- **Navigation:** Minimal chrome. Back button and title only. The content IS the interface.
- **Animations:** Scroll-driven storytelling ("The Deep Sea" scrolls through ocean depth). Smooth counter animations. Parallax layers.
- **Color scheme:** Varies per experience. Deep blues for ocean. Dark space backgrounds. Clean whites for the landing grid.
- **Typography:** Clean sans-serifs (Inter-like). Large display numbers for data visualization. Minimal body text.
- **Interactive elements:** Drag-to-spend money interface. Scroll-triggered reveals. Size comparison sliders.
- **What makes it premium:** Restraint. Each experience does ONE thing extraordinarily well. No feature bloat. Generous whitespace.
- **Takeaway for us:** Each section of the portfolio should feel like its own mini-experience. The games section already does this well.

### 1.3 Robby Leonardi (rleonardi.com/interactive-resume)
**What it does:** A side-scrolling video game that IS his resume. You scroll horizontally through a platformer world where each section represents career milestones.

- **Layout:** Horizontal scroll. World is divided into "levels" (Education, Skills, Experience, Contact). Character runs through the world as you scroll.
- **Navigation:** Top nav links jump to sections. Scroll position drives character animation.
- **Animations:** Sprite-based character animation. Parallax backgrounds (clouds, mountains, buildings at different scroll speeds). Items float and bob.
- **Color scheme:** Bright, saturated game-world colors. Sky blues, lush greens, warm oranges. Classic platformer palette.
- **Typography:** Pixel-style headers. Clean sans-serif for readable body text. Good hierarchy.
- **Interactive elements:** Character reacts to scroll. Collectible items appear at skill markers. Vehicles transport between sections.
- **What makes it premium:** The narrative flow. It tells a story through spatial metaphor. Each career stage has its own visual world.
- **Takeaway for us:** The scroll-driven character animation is directly applicable. We could have a pixel character that walks/runs as you scroll down the page.

### 1.4 Lusion.co (lusion.co)
**What it does:** Creative digital agency portfolio with cutting-edge WebGL experiments.

- **Layout:** Full-bleed hero sections. Asymmetric grids for project showcases. Generous negative space.
- **Navigation:** Minimal fixed nav. Smooth scroll between sections. Cursor-following elements.
- **Animations:** WebGL shader effects on images (distortion on hover, RGB shift). Smooth page transitions with GSAP/Barba.js-style routing. Magnetic buttons that pull toward cursor.
- **Color scheme:** Dark mode dominant. Near-black backgrounds (#0A0A0A). White text. Accent colors from project imagery.
- **Typography:** Large display type (80-120px headings). Tight letter-spacing. Mix of serif display + sans body.
- **Interactive elements:** Custom cursor (dot + ring that scales on hover). Image distortion on mouseover. Scroll velocity affects animation speed.
- **What makes it premium:** The DARK background lets everything else pop. Custom cursor creates constant engagement. Transitions are buttery (cubic-bezier easing, ~0.6-0.8s durations).
- **Takeaway for us:** The custom cursor approach, magnetic button effects, and dark-mode-first strategy are all applicable. Glassmorphism panels will shine on dark backgrounds.

### 1.5 Dennis Snellenberg (dennissnellenberg.com)
**What it does:** Freelance developer portfolio with exceptionally smooth animations.

- **Layout:** Vertical scroll. Large hero with name/title. Project grid below. Contact section at bottom.
- **Navigation:** Fixed minimal nav. Hamburger menu with full-screen overlay that slides in. Menu items animate in sequentially (stagger: 0.1s each).
- **Animations:** Text reveal animations (clip-path or translateY with overflow:hidden). Smooth parallax on project images. Page transitions use a expanding-circle or slide wipe. Cursor has a blending mode effect.
- **Color scheme:** Neutral palette. Off-whites (#F5F5F0), charcoal (#1A1A1A). Minimal accent colors - lets the work speak.
- **Typography:** Large serif display font for headings. Smaller sans-serif for body. Strong size contrast (heading ~8vw, body 16px).
- **Interactive elements:** Hover on project cards reveals video/additional imagery. Magnetic effect on interactive elements. Scroll-speed-dependent parallax.
- **What makes it premium:** The TIMING. Animations use custom cubic-bezier curves (not linear or ease). Typical: `cubic-bezier(0.76, 0, 0.24, 1)` for smooth deceleration. Nothing snaps - everything flows.
- **Takeaway for us:** Animation easing and timing are more important than animation complexity. We should invest in custom easing curves.

### 1.6 Notable Pixel Art Portfolio Sites
Based on well-known examples in the pixel art developer portfolio space:

- **Common patterns:** Pixel art hero illustrations, sprite-animated characters, chiptune background music (with mute toggle!), scanline/CRT overlay effects, retro game UI for navigation (menu screens, inventory-style project grids).
- **Best examples use:** A "game boot" loading screen, pixel art day/night cycles, NPC-style "about me" dialog boxes, achievement-style skill badges, health-bar-style progress indicators.
- **What works:** Combining pixel art visuals with modern layout (CSS Grid). Pixel art as accent, not 100% of the visual language. Modern typography with pixel headers.
- **What fails:** Sites that are ALL pixel art become hard to read. Forced chiptune music with no opt-out. Tiny click targets styled as pixel buttons.

---

## 2. Pixel Art / Retro Gaming Specific Research

### 2.1 Pixel Art Fonts

**Primary Pixel Fonts (Google Fonts - free, CDN-hosted):**

| Font Name | Style | Use Case | Google Fonts |
|-----------|-------|----------|-------------|
| **Press Start 2P** | Classic 8-bit arcade | Headlines, nav items, game UI | Yes |
| **Silkscreen** | Clean pixel sans-serif | Subheadings, labels, badges | Yes |
| **VT323** | Terminal/monospace pixel | Code snippets, terminal UI | Yes |
| **Pixelify Sans** | Modern pixel, variable weight | Body text at larger sizes | Yes |
| **DotGothic16** | Japanese pixel aesthetic | Accent text, kawaii elements | Yes |

**Recommended pairing:**
- **Headlines:** Press Start 2P (12-32px, always at integer multiples of base size)
- **Subheadings:** Silkscreen (14-20px)
- **Body text:** A modern sans-serif for readability - **Geist** (already in the project) or **Inter**
- **Code/terminal:** VT323 or JetBrains Mono

**Critical rule:** Pixel fonts MUST be rendered at exact pixel sizes (multiples of their design size) to avoid anti-aliasing blur. Use `font-smooth: never` / `-webkit-font-smoothing: none` / `text-rendering: optimizeSpeed` on pixel font elements.

### 2.2 Pixel Art CSS Techniques

**Pixelated Rendering:**
```css
.pixel-art {
  image-rendering: pixelated;          /* Chrome, Edge */
  image-rendering: crisp-edges;        /* Firefox */
  -ms-interpolation-mode: nearest-neighbor; /* IE */
}
```

**Pixel Borders (box-shadow technique):**
```css
/* Creates a pixel-perfect border using box-shadow */
.pixel-border {
  box-shadow:
    /* Top edge */
    0 -4px 0 0 #593B2B,
    /* Right edge */
    4px 0 0 0 #593B2B,
    /* Bottom edge */
    0 4px 0 0 #593B2B,
    /* Left edge */
    -4px 0 0 0 #593B2B,
    /* Corners */
    -4px -4px 0 0 #593B2B,
    4px -4px 0 0 #593B2B,
    -4px 4px 0 0 #593B2B,
    4px 4px 0 0 #593B2B;
  border: none;
}
```

**Scanline Overlay Effect:**
```css
.scanlines::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    rgba(0, 0, 0, 0.03) 1px,
    rgba(0, 0, 0, 0.03) 2px
  );
  z-index: 9999;
}
```

**CRT Monitor Effect:**
```css
.crt-effect {
  /* Slight barrel distortion */
  border-radius: 12px;
  /* Phosphor glow */
  box-shadow:
    inset 0 0 60px rgba(0, 255, 0, 0.1),
    0 0 20px rgba(0, 255, 0, 0.05);
  /* Slight vignette */
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(0, 0, 0, 0.3) 100%
  );
}

/* Flicker animation (subtle) */
@keyframes crt-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.98; }
}
```

**Pixel Art Dithering Pattern:**
```css
.dither-fade {
  mask-image: url("data:image/png;base64,..."); /* 2x2 checkerboard pattern */
  mask-size: 4px 4px;
}
```

### 2.3 Parallax with Pixel Art Layers

**Approach:** Use 3-5 pixel art background layers at different scroll speeds. Each layer is a wide pixel art panorama (rendered at 1x then scaled up with `image-rendering: pixelated`).

**Layer structure (back to front):**
1. **Sky layer** - Fixed or very slow (0.1x scroll speed). Gradient or pixel clouds.
2. **Far mountains/buildings** - Slow parallax (0.3x). Silhouette style.
3. **Mid-ground** - Medium parallax (0.5x). Trees, structures with detail.
4. **Near-ground** - Faster parallax (0.7x). Foreground objects.
5. **Content layer** - Normal scroll (1x). Actual page content.

**Implementation (CSS transforms + JS scroll listener):**
```css
.parallax-layer {
  will-change: transform;
  transform: translate3d(0, calc(var(--scroll) * var(--speed)), 0);
}
```

```js
// Use requestAnimationFrame for 60fps
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--scroll', window.scrollY + 'px');
      ticking = false;
    });
    ticking = true;
  }
});
```

### 2.4 Retro Game UI Patterns

- **Health/XP bars:** Segmented rectangles with pixel borders. Fill color animates on change. Use for skill levels, project completion, experience years.
- **Score displays:** Fixed position, top-right. Pixel font counter. Could show visitor count or "achievements unlocked" (sections visited).
- **Dialog boxes:** NPC-style text boxes with character portrait. Typewriter text reveal effect. "Press SPACE to continue" prompt. Use for the About Me section.
- **Menu screens:** Title screen with blinking "Press Start" text. Menu items styled as game options. Arrow cursor for selection indicator.
- **Inventory grid:** Grid of square slots with pixel borders. Each slot contains an icon. Use for skills/tech stack display.
- **Achievement popups:** Toast notification styled as "Achievement Unlocked!" with pixel art badge.

### 2.5 8-Bit Sound Effect Libraries

| Library | Size | License | Notes |
|---------|------|---------|-------|
| **Tone.js** | ~150KB | MIT | Synthesize retro sounds programmatically. Best for custom SFX. |
| **Howler.js** | ~10KB | MIT | Audio playback library. Load pre-made 8-bit WAV/MP3 files. |
| **jsfxr** | ~5KB | MIT | Web port of sfxr. Generate retro sound effects with parameters. Tiny. |
| **zzfx** | ~1KB | MIT | Zuper Zmall sound effects. Generates sounds from numeric parameters. Smallest option. |

**Recommendation:** Use **zzfx** (1KB) for UI sounds (click, hover, navigate) and **jsfxr** for game-specific effects. Both generate sounds procedurally - no audio file downloads needed.

**Sound design rules:**
- ALL sounds must be opt-in (muted by default)
- Provide a visible mute/unmute toggle (speaker icon in nav)
- Sounds should be SHORT (50-200ms for UI, up to 500ms for transitions)
- Keep volume low (0.1-0.3 gain) - they're accents, not features

### 2.6 Day/Night Cycle in CSS

**Approach:** CSS custom properties driven by JavaScript time or user toggle.

```css
:root {
  /* Day mode (default) */
  --sky-top: #87CEEB;
  --sky-bottom: #E0F0FF;
  --ambient-light: 1;
  --shadow-opacity: 0.2;
  --star-opacity: 0;
}

:root.night {
  --sky-top: #0B0B2B;
  --sky-bottom: #1A1A4E;
  --ambient-light: 0.6;
  --shadow-opacity: 0.5;
  --star-opacity: 1;
}

/* Smooth transition between states */
:root {
  transition: --sky-top 2s ease, --sky-bottom 2s ease;
}

/* Stars appear at night */
.stars {
  opacity: var(--star-opacity);
  transition: opacity 2s ease;
}

/* Pixel art sun/moon swap */
.celestial-body {
  transition: transform 2s cubic-bezier(0.76, 0, 0.24, 1);
}
.night .celestial-body {
  transform: translateY(100%) rotate(180deg);
}
```

**Tie to dark/light mode:** The day/night cycle IS the dark/light mode toggle. Sun = light mode. Moon = dark mode. The pixel art sky transitions naturally.

---

## 3. Technical Research

### 3.1 Custom Cursors in React / Next.js

**Approach:** Two-layer custom cursor (dot + trailing ring) using CSS transforms, NOT `cursor: url(...)` (which has limited animation capability).

```tsx
// components/CustomCursor.tsx
'use client';

import { useEffect, useRef } from 'react';

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
      }
    };

    // Smooth trailing ring with lerp
    const animate = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX}px, ${ringY}px)`;
      }
      requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMouseMove);
    animate();

    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" /> {/* 8x8 pixel square */}
      <div ref={ringRef} className="cursor-ring" /> {/* Pixelated ring */}
    </>
  );
}
```

**Pixel art twist:** Instead of a smooth dot/ring, use a pixel art sword cursor, or a small pixel hand. Swap cursor sprite on interactive elements (hand -> pointer finger).

**Important:** Hide on touch devices. Use `@media (hover: hover)` to conditionally render.

### 3.2 Scroll-Triggered Animations (No Heavy Libraries)

**Intersection Observer Pattern:**
```tsx
// hooks/useScrollReveal.ts
'use client';

import { useEffect, useRef, useState } from 'react';

export function useScrollReveal(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target); // Only animate once
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px', ...options }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

**CSS for reveal animations:**
```css
.reveal-up {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.reveal-up.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger children */
.stagger-children > *:nth-child(1) { transition-delay: 0ms; }
.stagger-children > *:nth-child(2) { transition-delay: 80ms; }
.stagger-children > *:nth-child(3) { transition-delay: 160ms; }
.stagger-children > *:nth-child(4) { transition-delay: 240ms; }
/* etc */
```

**Scroll-linked animations (CSS Scroll Timeline - modern browsers):**
```css
@keyframes parallax-shift {
  from { transform: translateY(0); }
  to { transform: translateY(-100px); }
}

.scroll-parallax {
  animation: parallax-shift linear;
  animation-timeline: scroll();
  animation-range: entry 0% exit 100%;
}
```

### 3.3 Page Transitions in Next.js 15 App Router

**Challenge:** App Router doesn't have built-in page transitions (no `_app.js` wrapper like Pages Router).

**Recommended approach: Layout-level animation wrapper + View Transitions API**

```tsx
// app/template.tsx (re-renders on every navigation, unlike layout.tsx)
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, [pathname]);

  return (
    <div className={`page-transition ${isVisible ? 'entered' : 'entering'}`}>
      {children}
    </div>
  );
}
```

**For the pixel-art theme, use a "pixel wipe" transition:**
A grid of pixels that fills/empties the screen like a dissolve effect. Implemented as a fixed overlay with a grid of `<div>`s that animate opacity with staggered delays.

**View Transitions API (progressive enhancement):**
```tsx
import { useRouter } from 'next/navigation';

function navigate(href: string) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      router.push(href);
    });
  } else {
    router.push(href);
  }
}
```

### 3.4 Dark/Light Mode with Tailwind CSS 4

**Tailwind CSS 4 approach:**
```css
/* globals.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  /* Light mode colors (default) */
  --color-bg-primary: #FFF8F0;
  --color-bg-secondary: #FFF0E0;
  --color-text-primary: #1A1216;
  --color-text-secondary: #593B2B;
  --color-accent: #D99C64;

  /* These get overridden by .dark class */
}
```

```tsx
// In dark mode, add 'dark' class to <html>
// Tailwind 4 uses CSS layers, so dark: variants work via the custom variant
<div className="bg-bg-primary dark:bg-[#0B0B1A] text-text-primary dark:text-[#E8E0D8]">
```

**Tie to day/night pixel art cycle:** The toggle switches the `dark` class AND triggers the sky/celestial animation. One action, two effects.

### 3.5 Performance Considerations

**GPU Acceleration Rules:**
```css
/* ONLY use will-change on elements that are actively animating */
.is-animating {
  will-change: transform, opacity;
}

/* Remove will-change after animation completes */
/* In JS: element.style.willChange = 'auto'; */
```

**Key principles:**
1. **Only animate `transform` and `opacity`** - these are compositor-only properties (no layout/paint).
2. **Use `translate3d(0,0,0)` or `translateZ(0)`** to force GPU layer promotion when needed.
3. **Avoid animating:** `width`, `height`, `top`, `left`, `margin`, `padding`, `border`, `box-shadow` (triggers layout/paint).
4. **`contain: layout style`** on animated containers to limit browser recalculation scope.
5. **Use `content-visibility: auto`** on off-screen sections for rendering performance.
6. **Reduce paint area:** Scanline overlay should use `pointer-events: none` and be a single pseudo-element, not hundreds of divs.
7. **requestAnimationFrame** for all JS-driven animations. Never use `setInterval` for visual updates.
8. **Prefers-reduced-motion:** ALWAYS respect this media query.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 4. Final Design Brief

### 4.1 Color Palette

#### Light Mode (Day)
| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Background Primary | Parchment | `#FFF8F0` | Page background |
| Background Secondary | Warm Sand | `#FFF0E0` | Card backgrounds, sections |
| Background Glass | Frosted Cream | `rgba(255, 248, 240, 0.7)` | Glassmorphism panels |
| Text Primary | Dark Espresso | `#1A1216` | Headings, body text |
| Text Secondary | Warm Brown | `#593B2B` | Subtext, labels |
| Text Muted | Dusty Brown | `#8B7355` | Timestamps, meta |
| Accent Primary | Amber Gold | `#D99C64` | Links, active states, CTAs |
| Accent Secondary | Honey Yellow | `#FFD966` | Hover states, highlights |
| Accent Tertiary | Pixel Green | `#5FCD6A` | Success, "online" indicators |
| Accent Quaternary | Pixel Red | `#E85D5D` | Errors, health bar damage |
| Accent Quinary | Pixel Blue | `#5B9BD5` | Info, links visited |
| Sky Top | Day Sky | `#87CEEB` | Parallax sky gradient top |
| Sky Bottom | Horizon | `#E0F0FF` | Parallax sky gradient bottom |
| Border | Pixel Brown | `#593B2B` | Pixel borders on cards |

#### Dark Mode (Night)
| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Background Primary | Deep Night | `#0B0B1A` | Page background |
| Background Secondary | Twilight | `#141428` | Card backgrounds, sections |
| Background Glass | Frosted Night | `rgba(20, 20, 40, 0.7)` | Glassmorphism panels |
| Text Primary | Moon White | `#E8E0D8` | Headings, body text |
| Text Secondary | Pale Gold | `#C4A882` | Subtext, labels |
| Text Muted | Dim Silver | `#6B6380` | Timestamps, meta |
| Accent Primary | Bright Amber | `#E8A94E` | Links, active states |
| Accent Secondary | Warm Glow | `#FFE088` | Hover states, highlights |
| Accent Tertiary | Neon Green | `#66FF7A` | Success, active indicators |
| Accent Quaternary | Hot Pink | `#FF6B8A` | Errors, alerts |
| Accent Quinary | Electric Blue | `#6BAFFF` | Info, links |
| Sky Top | Night Sky | `#0B0B2B` | Parallax sky gradient top |
| Sky Bottom | Deep Purple | `#1A1A4E` | Parallax sky gradient bottom |
| Border | Soft Gold | `#8B7355` | Pixel borders on cards |
| Stars | Star White | `#FFFFFF` | Twinkling star dots |

#### Glassmorphism Specifications
```css
/* Light mode glass panel */
.glass-light {
  background: rgba(255, 248, 240, 0.65);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(89, 59, 43, 0.08);
}

/* Dark mode glass panel */
.glass-dark {
  background: rgba(20, 20, 40, 0.6);
  backdrop-filter: blur(12px) saturate(1.5);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### 4.2 Typography

**Font Stack:**
```css
/* Pixel display font - headlines, nav, game UI */
--font-pixel: 'Press Start 2P', monospace;

/* Pixel subheading font - badges, labels, smaller pixel text */
--font-pixel-body: 'Silkscreen', monospace;

/* Modern body font - paragraphs, descriptions */
--font-body: 'Geist', system-ui, -apple-system, sans-serif;

/* Mono/terminal font - code, terminal sections */
--font-mono: 'VT323', 'JetBrains Mono', monospace;
```

**Type Scale:**
| Element | Font | Size | Weight | Line Height | Letter Spacing |
|---------|------|------|--------|-------------|----------------|
| Hero title | Press Start 2P | 32px (mobile) / 48px (desktop) | 400 | 1.4 | 2px |
| Section heading | Press Start 2P | 20px (mobile) / 28px (desktop) | 400 | 1.3 | 1px |
| Card title | Silkscreen | 18px / 22px | 400 | 1.3 | 0.5px |
| Nav items | Press Start 2P | 12px / 14px | 400 | 1 | 1px |
| Body text | Geist | 16px / 18px | 400 | 1.6 | 0 |
| Small/meta | Geist | 14px | 400 | 1.5 | 0 |
| Code/terminal | VT323 | 18px / 20px | 400 | 1.4 | 0.5px |
| Badge text | Silkscreen | 12px / 14px | 700 | 1 | 0.5px |

**Critical:** Apply `-webkit-font-smoothing: none; font-smooth: never;` to all pixel font elements to preserve crisp pixel edges.

### 4.3 Key Interaction Patterns

1. **Custom Pixel Cursor**
   - Default: Small pixel arrow sprite (16x16)
   - On links/buttons: Pixel hand pointer
   - On text: Pixel I-beam
   - Trailing particle effect: 2-3 pixel dots that follow with lerp (0.1 factor)
   - Disable on touch devices via `@media (hover: hover)`

2. **Scroll-Driven Pixel Character**
   - A small pixel art character (the developer avatar) walks along the bottom or side of the viewport as user scrolls
   - Character sprite sheet: idle, walk, run (speed based on scroll velocity)
   - At section boundaries, character does a special animation (jump, wave, etc.)
   - Purely decorative - does not block content

3. **NPC Dialog Boxes**
   - About Me section uses an NPC dialog box pattern
   - Typewriter text reveal (~40ms per character)
   - "Continue" prompt blinks at bottom
   - Character portrait on left side
   - Click/tap advances dialog

4. **Inventory Grid for Skills**
   - Tech stack displayed as items in an RPG inventory grid
   - Each "slot" is a pixel-bordered square with an icon
   - Hover reveals item tooltip (skill name, XP level, description)
   - Items can be categorized by tabs: "Weapons" (languages), "Armor" (frameworks), "Potions" (tools)

5. **Achievement Toasts**
   - When user scrolls to a new section: "Achievement Unlocked: Discovered [Section Name]!"
   - Pixel art toast slides in from right, stays 3s, slides out
   - Sound effect on appearance (if sound enabled)

6. **Magnetic Buttons**
   - Interactive elements pull toward cursor within 80px radius
   - Effect: `transform: translate(${dx * 0.3}px, ${dy * 0.3}px)`
   - Resets with spring easing on mouse leave
   - Combines with pixel-border aesthetic

7. **Card Hover Effects**
   - Cards lift on hover: `transform: translateY(-4px)`
   - Pixel border brightens (color transition)
   - Subtle inner glow appears
   - Glassmorphism intensifies slightly (increase blur from 12px to 16px)
   - Transition: 0.3s cubic-bezier(0.22, 1, 0.36, 1)

### 4.4 Animation Timing & Easing

**Easing Functions (custom):**
```css
/* Smooth deceleration - for elements entering view */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);

/* Smooth acceleration+deceleration - for position changes */
--ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);

/* Bouncy - for playful elements (achievements, badges) */
--ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Spring - for magnetic buttons returning to position */
--ease-spring: cubic-bezier(0.22, 1.5, 0.36, 1);

/* Pixel snap - for retro-feeling movements (stepped) */
/* Use steps() timing function */
--ease-pixel: steps(8, end);
```

**Duration Guidelines:**
| Animation Type | Duration | Easing |
|---------------|----------|--------|
| Hover color change | 150ms | ease |
| Hover transform (lift) | 300ms | --ease-out-expo |
| Scroll reveal (fade+slide) | 600ms | --ease-out-expo |
| Stagger delay between siblings | 80ms | - |
| Page transition (wipe) | 500ms | --ease-in-out-quart |
| Dialog typewriter (per char) | 40ms | linear (steps) |
| Achievement toast (enter) | 400ms | --ease-out-back |
| Achievement toast (exit) | 300ms | ease-in |
| Day/night sky transition | 2000ms | --ease-in-out-quart |
| Parallax layer movement | Continuous | linear (scroll-linked) |
| Cursor dot (position) | Instant | none |
| Cursor ring (trailing) | Continuous | lerp(0.15) per frame |
| Pixel character walk cycle | 600ms per loop | steps(4, end) |
| Button magnetic pull | Per frame | lerp(0.3) |
| Button magnetic return | 500ms | --ease-spring |

### 4.5 Component Design Direction

#### Navigation
- **Desktop:** Fixed top bar. Glassmorphism background. Left: pixel art logo/name. Right: nav items in Press Start 2P font (12px). Items styled like a game menu with a small pixel arrow `>` that slides in on hover.
- **Mobile:** Hamburger icon (three pixel bars). Opens full-screen overlay with game-menu-style item list. Items animate in with stagger (80ms each). Background is dark glassmorphism.
- **Active state:** Current page nav item has a blinking pixel underline (like an old-school cursor blink, `steps(1)` animation).
- **Sound toggle:** Small speaker icon in nav. Pixel art on/off states.
- **Day/night toggle:** Pixel sun/moon icon. Triggers full sky transition + dark mode.

#### Cards (Project/Game Cards)
- **Structure:** Glassmorphism panel with pixel-art border (3px solid, stepped corners via box-shadow technique).
- **Idle state:** Subtle float animation (translateY oscillation, 3s, ease-in-out, 2px amplitude).
- **Hover:** Lifts 4px. Border color brightens. Small pixel sparkle appears at a random corner. Glass blur increases.
- **Content:** Pixel art icon/thumbnail at top. Title in Silkscreen. Description in Geist. Status badge ("Playable", "Coming Soon") with pixel border.
- **Click:** Quick scale pulse (1 -> 0.97 -> 1, 150ms) before navigation.

#### Buttons
- **Primary (CTA):** Filled with accent color. Pixel border (4px). Text in Silkscreen. Hover: color shift + magnetic pull effect.
- **Secondary:** Glass background. Pixel border. Text in accent color. Hover: fill transition.
- **Ghost:** No background. Pixel text. Hover: pixelated underline slides in from left.
- **All buttons:** Active state drops 2px (like pressing a physical button). `transform: translateY(2px)` with box-shadow reduction to simulate depth.

#### Loading Screen
- **Concept:** Retro game boot sequence.
- **Sequence:** (1) Black screen. (2) Pixel text "LOADING..." with blinking cursor, 1s. (3) Fake progress bar fills in pixel segments, 1.5s. (4) "PRESS START" blinks. (5) Pixel dissolve transition to actual content.
- **Technical:** Use `template.tsx` or a layout-level loading state. Keep it under 3 seconds total. Skip on subsequent navigations (session-only, use sessionStorage flag).
- **Progress bar:** 10 segments, each fills sequentially with slight randomized timing (100-200ms per segment) for authenticity.

#### 404 Page
- **Concept:** "GAME OVER" screen from an arcade game.
- **Layout:** Centered content on dark background.
- **Elements:**
  - Large "GAME OVER" in Press Start 2P (glowing red pixel text, `text-shadow: 0 0 10px #E85D5D`)
  - "ERROR 404 - PAGE NOT FOUND" subtitle
  - Small pixel art character looking confused (CSS sprite or SVG)
  - "INSERT COIN TO CONTINUE" blinks below
  - Two buttons: "RETURN HOME" (styled as arcade button) and "TRY AGAIN" (refreshes page)
  - High score table with "recent pages visited" (stored in sessionStorage)
- **Sound:** Classic game-over jingle on page load (if sound enabled).
- **Easter egg:** Konami code (up up down down left right left right B A) triggers a hidden animation.

#### Footer
- **Concept:** Ground level of the pixel art world.
- **Design:** Pixel art ground/grass strip at the top of the footer. Below: dark background with social links as pixel art icons. Copyright in VT323 font.
- **Elements:** GitHub, LinkedIn, Twitter/X pixel art icons with hover glow effect. "Built with Next.js" badge. Visitor counter (optional, styled as arcade score).

---

## 5. Implementation Priority & Phasing

### Phase 1: Foundation
1. Set up color system (CSS custom properties for light/dark)
2. Install and configure fonts (Press Start 2P, Silkscreen, VT323 via next/font/google)
3. Build glassmorphism utility classes
4. Implement dark/light mode toggle infrastructure
5. Add `prefers-reduced-motion` support globally

### Phase 2: Core Components
1. Navigation (desktop + mobile)
2. Card component (pixel border + glass)
3. Button variants (primary, secondary, ghost)
4. Scroll reveal hook + animations
5. Page transition via template.tsx

### Phase 3: Character & Interactivity
1. Custom pixel cursor (desktop only)
2. Loading screen / boot sequence
3. 404 page
4. Day/night sky with parallax layers
5. Achievement toast system

### Phase 4: Premium Polish
1. NPC dialog box for About section
2. Inventory grid for skills
3. Sound effects (zzfx, opt-in)
4. Scroll-driven pixel character
5. Magnetic button effects
6. Scanline overlay (toggle-able)

---

## 6. Performance Budget

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.2s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |
| Total Blocking Time | < 200ms |
| Total JS bundle (gzipped) | < 100KB |
| Font files total | < 80KB (subset pixel fonts) |
| Animation frame rate | 60fps consistent |
| Sound library total | < 5KB (zzfx) |

**Font optimization:** Use `next/font/google` with `display: 'swap'` and subset to latin characters only. Press Start 2P is ~18KB, Silkscreen ~12KB, VT323 ~15KB.

---

## 7. Key References Summary

| Concept | Primary Reference | Secondary Reference |
|---------|-------------------|---------------------|
| Full-commit metaphor | Bruno Simon (3D car world) | Robby Leonardi (game resume) |
| Scroll-driven storytelling | Neal.fun (The Deep Sea) | Robby Leonardi (horizontal scroll) |
| Glassmorphism + dark mode | Lusion.co | Apple.com (product pages) |
| Animation timing | Dennis Snellenberg | Lusion.co |
| Custom cursor | Lusion.co | Dennis Snellenberg |
| Pixel art + modern layout | Top pixel art portfolios | Retro game UI conventions |
| Page transitions | Barba.js patterns | View Transitions API spec |
| Parallax technique | Classic SNES backgrounds | CSS Scroll Timeline spec |
| Dialog/NPC system | RPG Maker conventions | Undertale dialog system |
| Inventory grid | RPG inventory patterns | Stardew Valley UI |

---

*This design brief should be treated as a living document. Update it as implementation reveals new constraints or opportunities.*
