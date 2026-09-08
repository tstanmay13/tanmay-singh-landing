# Tanmay’s pixel home

A detailed pixel apartment at blue hour, with direct, keyboard-accessible object controls. The room connects the existing arcade, Mario integration, travel map, writing and portfolio. It is an imaginative illustration of Tanmay’s interests, not a rendering of his actual apartment.

The palette uses midnight navy, slate, amber, moss, parchment and a little coral. Press Start 2P stays on display headings and object labels; Space Grotesk carries longer stories. The room is the dominant visual. Quiet framing, ordinary navigation and a small note beneath it keep the page legible.

## Content provenance

Personal details supplied by Tanmay in this conversation on September 8, 2026: Pokémon (Gengar, pink shiny Kyogre, Salamence), Pokémon and Naruto cards, mythology, Percy Jackson, The Odyssey, both Hades games, whiskey sours and making them, Guinness and sour beers, Mavericks/Dirk/Luka, UT Austin football, Ferrari/F1, La La Land, Game of Thrones, New Girl, and a HIMYM rewatch every winter. No exact collectible editions or valuations are inferred.

Steam snapshot read through Chrome on September 8, 2026: https://steamcommunity.com/profiles/76561198101473427/games/?tab=all . Hades 80.1h, Destiny 2 803.6h, Slay the Spire 2 146.8h. Minecraft and Teamfight Tactics were added from Tanmay’s own stated favorites, without invented playtimes. These are dated playtimes, not a live feed or an inferred ranking of favorites. Hades story/mythology appreciation also appears in the user’s public review.

Spotify: the signed-in library and public “Your All-Time Top Songs” playlist were read with permission. Four track links were captured from the playlist: Power Trip (J. Cole/Miguel), ATM (Don Toliver), Street Lights (Kanye West), La Vie En Rose (Cristin Milioti). The last is number 7 on the playlist and connects to the stated HIMYM ritual. The official Spotify player is loaded only after “Listen here”; selecting a record changes the player, and closing the room removes it. Track links remain available. No authentication, listening history, account token, or background music request is exposed to visitors.

Travel and project facts reuse the existing repository. No travel memories or photos have been invented.

## Performance and interaction

- Static optimized WebP scene: `public/home/room.webp` (1659×948) and `room-small.webp` (960px wide).
- Built-in imagegen generated the illustration and a focused personal-props edit. Source PNGs remain in the Codex generated-images directory. Production assets live in the repo; no build depends on files outside it. Prompts are in `image-prompts.md`.
- No canvas/3D engine, game runtime, Spotify embed, or GitHub API requests on the initial homepage.
- Room content and Mario component are separate dynamic chunks; the original Mario iframe loads only after Play. Closing the room removes the game iframe.
- Home renders immediately on the server. Theme storage failure does not block content. Existing random background decorations stay client-only and are excluded from the home.
- Native modal dialog provides focus containment and Escape/backdrop dismissal. The originating object regains focus when it closes.
- The complete detailed room is horizontally explorable on small screens; shortcuts provide large tap targets. All primary sections also remain reachable through the ordinary navigation.
- Winter snow is CSS-only and opt-in. Reduced-motion preference disables animations. Sound remains off until the Mario sound control is explicitly enabled.

## Living room interactions

The reference at https://yoshik-pc.vercel.app/ uses an explorable desk and computer. This design borrows object-based discovery: each object in the room has a purpose, with subtle focus zoom, a working lamp switch, Gengar replies, an opt-in winter window, a flippable Pokémon binder, and a step-by-step cocktail toy. It keeps the existing travel map reachable directly from the wall and ordinary navigation.

The whiskey sour recipe comes from Tanmay’s notes: 2 oz rye, 1 oz fresh lemon juice (or ½ oz bottled), ½ oz turbinado syrup, one fresh egg white (not carton), vigorous 30-second dry shake, add ice and shake 30–45 seconds, double strain into a coupe, spray Angostura bitters. The alternate menu name and unrelated pasted Notes path were omitted.

## Underworld

A separate `/games/underworld` browser homage, linked from the room television and arcade; Mario remains available. Twelve chambers across four palettes, four guardians with a second phase, three weapons with separate specials, regenerating cast, two invulnerable dashes, eight gods, three boon rarities, stacking status effects, a curse/wine synergy, branching rewards, hammers, shops, keepsakes, heat, daily seeds, death defiance, and local permanent mirror upgrades.

Original canvas art and simulation. It is not a port of the commercial game. Static backgrounds are cached by chamber, objects have bounded counts, simulation lives outside React, and HUD refreshes at roughly 10 Hz. Rendering stops on pause, room choices, death, and hidden tabs. The homepage does not load this route’s game bundle. Temporary inputs reset on blur and room transitions.

Sound effects use short opt-in Web Audio tones. The official Supergiant Games full soundtrack is embedded from YouTube only after an explicit click: https://www.youtube.com/watch?v=3GRKJ87S5cI . The embed title and channel were verified in Chrome. The official album is also linked at https://supergiantgames.bandcamp.com/album/hades-original-soundtrack . No soundtrack audio is copied into the repo.

Pokémon sprites are from https://github.com/PokeAPI/sprites with the repository license in `public/home/sprites/LICENCE.txt`. Illustrated favorite cards are not represented as exact owned physical card editions.
