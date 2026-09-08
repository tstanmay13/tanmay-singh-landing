# Little things to play with

The touch-first room at b66309d was approved and pushed to master on September 8, 2026. Production deployment 6322618440 succeeded. This next iteration lives on feat/whiskey-sour-game.

## Whiskey sour

Replaces the previous ingredient checklist with a short, forgiving cocktail game. Hold to pour rye, lemon, and turbinado; tap twice to crack a fresh egg and add the white; swipe the shaker or tap six times for the dry shake; drop three game-sized ice cubes; shake eight times; hold to double strain; finish with three bitters sprays. The tin fills, foam develops, the shaker tilts with each stroke, ice falls, the coupe fills, and bitters land on the foam.

Pour and strain controls also have a discrete tap alternative. Holding ends at the completion of each step, on pointer release/cancellation, and on blur or a hidden tab. The next ingredient requires a new gesture. Successful completion labels the room’s drink “Made by you” for the current visit. The game can be replayed.

The actual recipe is preserved in an expandable section: 2 oz rye, 1 oz fresh lemon (or ½ oz bottled), ½ oz turbinado syrup, one fresh egg white rather than carton; 30-second dry shake, add ice and shake another 30–45 seconds, double strain into a coupe, spray Angostura. Game timing is explicitly shorter than actual preparation.

## Other toys

- Gengar emerges from the sofa when greeted. Catch him at three spots around the room; the camera follows him so the activity works on a phone. He returns to his seat at the end.
- The favorite Pokémon cards begin inside a little foil-style pack. Open it to reveal Gengar, pink shiny Kyogre, and Salamence; swipe through the cards and flip them for their stories. These are illustrated favorites, not claims about exact owned editions or randomized purchases.
- A wind-up Ferrari sits in the collection. Turn the key one to three times and release it for that many laps. The car stops after its run. The toy cancels if the document is hidden and unmounts when its corner closes.
- Occasional shooting stars cross the window, and shiny Kyogre has a little shimmer. Ambient pause and reduced-motion rules include the additions.

## Performance and verification

No libraries, downloaded artwork, physics engine, audio files, analytics, persistence, or network services added. The cocktail bar and racetrack are small SVGs. Game code is reached through the existing lazy-loaded room contents; the Gengar sprite reuses the existing asset. The sour’s reducer receives timed updates only during a held pour/strain. The Ferrari updates one SVG transform outside React, with state changes only at lap boundaries.

Chrome: completed all nine cocktail stages, including a held/released pour and a swipe shake; verified the served-room label; completed all three Gengar catches; opened and flipped cards; wound and completed a three-lap Ferrari run. Phone layout checked at 390 × 844; drink controls fit in the taller sheet and cards scroll horizontally at readable sizes. Focus advances to the next cocktail action and first revealed card. A development hydration warning was traced to Grammarly-injected body attributes, not application-generated content.

The reducer has tests for complete recipe progression, release behavior, limiting large time jumps, preventing a held gesture from flowing into the next ingredient, and replay. All 113 unit tests passed before final build. Changed TypeScript passed type checking and lint.

The final production build passed. Homepage JavaScript is 8.03 KB / 112 KB first load, compared with 7.5 KB / 111 KB for the approved room. SourGame and FerrariToy are separate dynamic imports loaded only when their corresponding corners are opened.
