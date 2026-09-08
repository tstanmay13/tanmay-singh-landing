# Pixel home verification — September 8, 2026

Story: a visitor enters Tanmay’s room, explores his interests, opens the preserved travel/Mario experiences or new Underworld game, and returns without loading every experience up front.

- Production build: passed (Next.js 15.4.10). Homepage first-load JS 109 kB; homepage route 5.24 kB. Underworld first-load JS 118 kB; route 14.1 kB. These are build-reported sizes, not a measured field performance score.
- Unit suite: 13 files, 110 tests passed. New simulation coverage includes seed reproducibility, movement bounds, dash immunity/recharge, death defiance, unique boon choices, guarded rewards, reward types, shops and affordability, final victory/banking, completed-run freeze, all three weapons dealing damage, Athena reflection, and corrupt save handling.
- ESLint: changed feature modules passed. Build retains pre-existing warnings in unrelated arcade pages.
- Chrome: desktop room illustration and controls inspected; native dialog dismissal returns focus; card flip confirmed visually; the actual rye/lemon/turbinado/egg-white recipe was completed through both shakes, strain and bitters, reaching “Cheers” and the reset button.
- Chrome: Minecraft and Teamfight Tactics selected and their stories rendered. Phone viewport showed horizontal room exploration and readable shortcuts; document client/scroll width both 382 CSS pixels, with zero game canvases or iframes before opening an experience.
- Chrome: Underworld weapon selection/start, active canvas, attack/cast input, pause overlay, ended run and attempt history verified. Official YouTube embed loaded the correct Hades album and Supergiant Games channel. Mobile controls and pause layout inspected. No game console errors were captured. The entire 12-chamber run was not manually completed in the browser; progression logic is unit-tested.
- Spotify’s inline player loaded the selected Power Trip title and artist after “Listen here”; closing it removes the iframe. Playback availability remains controlled by Spotify.
- Existing travel content and Mario runtime were preserved. The homepage suppresses decorative global cursor/parallax work; the game does too. It does not affect the Supabase keep-alive cron.

Local preview runs at http://localhost:3108/ . No source assets, personal account tokens, raw Notes attachments or private music history are needed by the build.
