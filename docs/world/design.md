# A living pixel apartment

The approved pixel home was published to tanmay-singh.com at commit 9c6e241. A first-person 3D study followed, but the user disliked the rough visual quality and WASD-oriented presentation. That study is preserved in a named git stash on feat/walkable-world. This revision is on feat/living-pixel-world.

The user is still discovering the exact visual direction. Their clearest requirements are a feeling of entering their world, detailed pixel art, signs of life, and interaction that feels natural on a phone. This is a working illustrated iteration for feedback, not a claim that a flat illustration recreates a fully navigable 3D space.

## Experience

The apartment fills the viewport. Swipe or drag to pan, use the four corner controls to glide between areas, or tap an object to approach it. No WASD instructions, joystick, pointer lock, entrance loading screen, or WebGL dependency. The original illustrated page remains at /room, including its regular navigation.

Content opens beside the object on desktop and below it on phones. The scene stays visible and sharp. A room guide provides every destination without requiring a gesture. Escape, the back button, or the close control steps away. Personal content, travel map, projects, card collection, cocktail recipe, Mario, and Underworld are reused without changes to their facts or game engines.

The window has rain, snow, and clear-sky states. City windows change gently, the candle flickers, the TV glows, a monitor cursor blinks, dust moves through lamplight, and the stereo has tiny animated indicators. The desk lamp changes the room lighting. Gengar responds when tapped. No sound plays automatically.

## Performance and accessibility

One existing 230 KB WebP illustration supplies the room. No additional illustration download or 3D bundle. The camera updates transforms outside React and schedules frames only during movement, resizing, or transitions. It stops when settled or the tab is hidden. Ambient effects animate small layers using opacity and transforms. Motion can be paused, and reduced-motion preferences disable ambient animation and camera easing. User-triggered content transitions remain usable while ambient motion is paused.

Contents load on demand. Spotify and Mario continue to load their embeds only after explicit interaction, and stepping away unmounts the content. Labels, descriptive buttons, normal links, a guide, and the /room index provide alternatives to dragging. Content receives focus when it opens.

## Verification

Chrome checks at desktop size and a 390 × 844 phone viewport: initial scene, drag-to-pan, corner travel, desk content, guide navigation, whiskey sour sheet, ambient pause, close/back, and console diagnostics. The mobile camera was corrected to frame the selected object within the visible area above the sheet. The pause selector was narrowed so it does not freeze content arrival at zero opacity.

Production build succeeded: homepage 7.5 KB, 111 KB first-load JavaScript (the previous homepage was 109 KB first-load JavaScript). Changed-file ESLint passed; all 110 existing unit tests passed. Existing unrelated game lint warnings remain. This is a responsive desktop-browser check, not a physical iPhone/Android performance measurement.
