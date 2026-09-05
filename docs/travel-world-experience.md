# Personal pixel world

This change keeps the atlas as a geographic pixel world, with distinct travel
experiences and home chapters. The confirmed life sequence is Uttar Pradesh →
Boston → Bangalore → Richardson → Murphy → Austin → New York City. Uttar Pradesh
is a regional anchor, not an asserted birth city. No residence dates were added.
Generated visit years remain separate from residence chronology.

## Problems reproduced before editing

On the production `/travel` route, focusing Japan made the labels visibly blurry.
The detailed terrain crop ended at a hard seam with giant low-resolution blocks
underneath. Zooming from the world view obscured destination hierarchy. Dragging
across Japanese markers did not open a card in the tested sequence, but the
country heading stayed locked to Japan. Source inspection found retained country
and hub visibility filters, a cancelled-drag path that never cleared busy state,
and marker inverse scaling inside a composited ancestor. The source classifier
also interpreted nearly black blue bathymetry as land, producing false islands.

## Implementation

- Paint the full 4096×2048 source once per theme; sample into a viewport canvas
  at two CSS pixels per output pixel. Camera motion never exposes crop edges.
  At maximum zoom, source texels occupy at most 4.25 CSS pixels.
- Render marker buttons and labels in unscaled screen space. Each marker has a
  fixed 44px hit target; collision estimates include the real target geometry.
  Short leaders connect separated dense markers to their canonical locations.
- Keep hover local and out of the persistent label-layout dependency graph.
  Drag and pinch suppress click activation; cancellation settles the camera.
  Pinches capture both pointers and can continue as one-finger pans.
- Smooth wheel bursts around the pointer, preserve button-zoom targets during
  rapid presses, lock a trackpad gesture's pan/zoom interpretation until it ends,
  and interrupt animations immediately on direct input.
- Clear stale country focus on manual exploration. Retain neighboring places
  instead of clipping them to a previously focused country or hub.
- Provide exclusive ALL/LIVED/VISITED modes, a chronological chapter strip,
  inset-aware place cards, native map cursors, a reset control, and shape legend.
  Phone/tablet openings frame North America instead of squeezing the world into
  a narrow portrait viewport. LIVED's strip provides access to all seven chapters.
- Keep media empty and intentional. Nearby hub entries are navigable buttons.
- Bound terrain ripples to 60px at close zoom, respect reduced motion, stop work
  when hidden, and avoid repainting when neither the camera nor pixels changed.

## Verification

Local unit suite: 92 passing tests, including dark-ocean classification,
canonical chronology, exclusive story filters, camera anchoring, collision
placement, drag suppression and ripple restoration. TypeScript and targeted
ESLint pass. Production build passes with placeholder Supabase build variables;
the checkout does not include the unrelated games backend's real credentials.

Browser inspection covered the production defects and rebuilt desktop world,
Japan focus, place cards, phone (390×844) and tablet (768×844) layouts, story
filters, chapter navigation, and empty photography. Phone/tablet checks used
embedded viewports; they are responsive layout checks, not physical-device tests.
The added PR workflow is configured to run the updated Chromium integration suite, including real
multi-touch emulation, reduced motion, interruptible gestures, fixed marker
geometry, reset, and mobile card bounds. That suite has not yet run: GitHub
rejected publication with HTTP 403 (resource not accessible by integration),
and command-line Git has no authenticated credentials. Browser checks also
confirmed dragging across markers does not select them and reset returns to
the world overview. Physical iOS/Safari testing is still
recommended before relying on platform-specific gesture behavior.

The development command accepts standard preview host/port flags. Development
uses `.next-dev`, so a production build cannot invalidate a live preview's chunks.
