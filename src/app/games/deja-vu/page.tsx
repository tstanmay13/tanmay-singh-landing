'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// TYPES
// ============================================

type GameScreen = 'intro' | 'room' | 'transition' | 'ending';
type EndingType = 'normal' | 'true' | 'secret' | 'patience' | null;

interface ObjectState {
  description: string;
  interactable: boolean;
  specialAction?: string;
}

interface Difference {
  id: string;
  loop: number;
  objectId: string;
  description: string;
}

interface GameState {
  currentLoop: number;
  screen: GameScreen;
  totalClicks: Record<string, number>;
  discoveredDifferences: Difference[];
  objectClicksThisLoop: Record<string, number>;
  narratorAwareness: number; // 0-10
  hasKey: boolean;
  trapdoorRevealed: boolean;
  secretSequence: string[];
  endingReached: EndingType;
  lightOn: boolean;
  lastClickedObject: string | null;
  narratorText: string;
  objectText: string;
  showNotebook: boolean;
  idleTime: number;
  patienceTriggered: boolean;
  doorAttempts: number;
  mirrorClicks: number;
  phoneNumbers: string[];
}

// ============================================
// ROOM OBJECT DEFINITIONS PER LOOP
// ============================================

const OBJECT_EMOJIS: Record<string, string> = {
  desk: '\u{1F4DD}',
  computer: '\u{1F5A5}',
  bookshelf: '\u{1F4DA}',
  painting: '\u{1F5BC}',
  clock: '\u{1F570}',
  window: '\u{1FA9F}',
  door: '\u{1F6AA}',
  phone: '\u{260E}',
  mirror: '\u{1FA9E}',
  plant: '\u{1FAB4}',
  radio: '\u{1F4FB}',
  drawer: '\u{1F5C4}',
  rug: '\u{1F9F6}',
  lightswitch: '\u{1F4A1}',
};

const OBJECT_LABELS: Record<string, string> = {
  desk: 'Desk',
  computer: 'Computer',
  bookshelf: 'Bookshelf',
  painting: 'Painting',
  clock: 'Clock',
  window: 'Window',
  door: 'Door',
  phone: 'Phone',
  mirror: 'Mirror',
  plant: 'Plant',
  radio: 'Radio',
  drawer: 'Drawer',
  rug: 'Rug',
  lightswitch: 'Light Switch',
};

// Grid positions for room layout (row, col) in a 4x4 grid
const OBJECT_POSITIONS: Record<string, [number, number]> = {
  lightswitch: [0, 0],
  painting: [0, 1],
  clock: [0, 2],
  window: [0, 3],
  bookshelf: [1, 0],
  mirror: [1, 1],
  radio: [1, 2],
  door: [1, 3],
  desk: [2, 0],
  computer: [2, 1],
  phone: [2, 2],
  plant: [2, 3],
  drawer: [3, 0],
  rug: [3, 1],
};

// ============================================
// CONTENT: Loop-specific descriptions
// ============================================

function getObjectState(objectId: string, loop: number, gameState: GameState): ObjectState {
  const totalClicksOnObject = gameState.totalClicks[objectId] || 0;

  const states: Record<string, (l: number) => ObjectState> = {
    desk: (l) => {
      const descs = [
        'A sturdy oak desk. Papers are scattered across it — reports, maybe? A pen sits in a holder, and a coffee mug reads "WORLD\'S OK-EST PROGRAMMER." The coffee is warm.',
        'The same desk. The papers seem... reorganized? The coffee mug now reads "WORLD\'S OK-EST PROGRAMMER." The coffee is still warm. Wasn\'t it warm before too?',
        'The desk again. The papers are now stacked neatly in a pile you definitely didn\'t organize. The pen is on the opposite side. The coffee mug says "WORLD\'S BEST PROGRAMMER." That\'s... not what it said before.',
        'The papers on the desk are blank now. Every single one. The pen is gone. The coffee mug says "STOP READING THE MUG."',
        'The desk has a single paper on it. It reads: "Loop ' + l + '. You\'ve looked at this desk ' + totalClicksOnObject + ' times." The coffee is ice cold.',
        'The desk is vibrating slightly. The paper now reads: "WHY DO YOU KEEP COMING BACK TO THE DESK?" The mug is upside down but the coffee hasn\'t spilled.',
        'The desk is made of glass now. You can see through it. Underneath, the floor has tally marks scratched into it. You count ' + l + ' marks.',
        'There is no desk. There is only the memory of a desk. And yet you clicked where it used to be. The coffee mug floats in mid-air, reading "YOU REMEMBER."',
        'The desk is back but it\'s facing the wrong wall. On it is a letter addressed to you by name. It says: "You\'ve been here before. You\'ll be here again. Unless you find the way out."',
        'The desk holds a single object: a key made of light. It pulses with each loop you\'ve survived.',
      ];
      return { description: descs[Math.min(l, descs.length - 1)], interactable: true };
    },

    computer: (l) => {
      const descs = [
        'An old CRT monitor displaying a desktop. There\'s one folder labeled "WORK" and a text file called "notes.txt." The screen flickers occasionally.',
        'The computer screen shows the same desktop, but there\'s a new file: "loop_2.log." You didn\'t create that. The WORK folder seems larger.',
        'Three files now: "notes.txt", "loop_2.log", "why_are_you_here.txt." The desktop wallpaper has changed to a photo of this room. From above.',
        'The computer is now running a terminal. Green text scrolls: "ITERATION 4... SUBJECT PERSISTS... ANOMALY DETECTION: ' + gameState.discoveredDifferences.length + ' FOUND..."',
        'The screen shows a live camera feed of the room. You can see yourself. You watch yourself click on the computer. There\'s a slight delay.',
        'The terminal displays your click history. Every object, every loop. It knows. A blinking cursor asks: "WHAT ARE YOU LOOKING FOR?"',
        'The screen is cracked but still works. It shows a map of the room with red dots where you\'ve clicked most. The dots pulse like heartbeats.',
        'The computer displays a conversation log between two entities. One is labeled "NARRATOR." The other is labeled "OBSERVER." They\'re discussing you.',
        'CODE SCROLLS ACROSS THE SCREEN: "if (loop >= 9 && differences >= 8) { unlock(TRUE_ENDING); }" You weren\'t supposed to see that.',
        'The computer shows a single message: "THANK YOU FOR PLAYING. OR ARE YOU STILL PLAYING?"',
      ];
      return { description: descs[Math.min(l, descs.length - 1)], interactable: true };
    },

    bookshelf: (l) => {
      const bookSets = [
        ['The shelf holds five books: "JavaScript: The Good Parts," "Clean Code," "The Pragmatic Programmer," "Design Patterns," and "SICP." Standard developer reading.', true],
        ['Same books, same order. Wait — "Clean Code" has been replaced by "Dirty Code." The spine looks hand-written. Everything else is identical.', true],
        ['The books are in reverse order now. And there\'s a sixth book: "How to Escape a Time Loop" by Anonymous. It has no pages inside.', true],
        ['All the book titles are scrambled. "The Pragmatic JavaScript" and "Clean Patterns" and "SICP: The Good Parts." The sixth book now has one page. It says "LOOK UNDER THE RUG."', true],
        ['The bookshelf is taller. Seven books now. The new one is titled "A Complete History of Your Decisions" and it\'s ' + (totalClicksOnObject * 12) + ' pages long.', true],
        ['The books are breathing. Gently expanding and contracting. "How to Escape a Time Loop" now has a Chapter 1: "Stop clicking the bookshelf."', true],
        ['Only one book remains: your biography. Chapter ' + l + ' describes this exact moment. The last chapter is titled "The Way Out."', true],
        ['The bookshelf is a door now. The books are handles. Behind them, you see a corridor that stretches into darkness. A voice whispers: "Not yet."', true],
        ['The shelf is empty except for a notebook — YOUR notebook. The differences you\'ve recorded are printed inside, plus ones you haven\'t found yet.', true],
        ['A single book glows on the shelf. Its title: "THE END." Opening it reveals all the endings you haven\'t reached yet.', true],
      ] as [string, boolean][];
      const idx = Math.min(l, bookSets.length - 1);
      return { description: bookSets[idx][0], interactable: bookSets[idx][1] };
    },

    painting: (l) => {
      const descs = [
        'A landscape painting in an ornate frame. Rolling green hills under a blue sky with fluffy clouds. It looks peaceful. Almost too peaceful.',
        'The same painting, but the sky is now sunset orange. The hills cast long shadows. A tiny figure stands on the furthest hill. Was that always there?',
        'The painting shows nighttime now. Stars fill the sky. The tiny figure is closer. You can almost make out a face. It\'s looking at you.',
        'The painting is a portrait now. Of this room. Every detail is perfect — except you\'re in it, sitting at the desk, and you\'re looking at a painting of a room of a painting of a room...',
        'The frame is cracked. The painting shows a door — THE door — wide open, with light streaming through. But your door is still locked.',
        'The figure from the painting is gone. In its place is a message painted in the sky: "I SEE YOU SEEING ME."',
        'The painting is blank. Just a white canvas. When you look away and look back, something new is drawn — a crude stick figure waving.',
        'The painting shows all your previous loops playing simultaneously. Tiny versions of you clicking different objects in different orders.',
        'The painting is a mirror now. But the reflection shows you in Loop 1, fresh-faced and unaware. Your reflection mouths: "Get out while you can."',
        'The painting dissolves into light. Behind it, carved into the wall: coordinates, dates, and the words "THE NARRATOR LIES."',
      ];
      return { description: descs[Math.min(l, descs.length - 1)], interactable: true };
    },

    clock: (l) => {
      const times = ['3:00', '3:00', '3:15', '2:45', '???', '3:00', '30:00', '\u221E:00', '0:01', 'NOW'];
      const descs = [
        'A wall clock showing ' + times[0] + '. It ticks steadily. Comforting, in a way. The second hand moves at a normal pace.',
        'The clock shows ' + times[1] + '. Again. The exact same time. But you\'ve been here for minutes. The second hand is definitely moving. Isn\'t it?',
        'The clock shows ' + times[2] + '. Finally moved. But... fifteen minutes? It felt like seconds since the last loop.',
        'The clock is running backwards. ' + times[3] + ' and counting down. The ticking sound is subtly wrong — it\'s saying something. "Get. Out. Get. Out."',
        'The clock face shows "' + times[4] + '". The hands spin wildly. The ticking has become a heartbeat.',
        'The clock melted. Like a Dali painting. It drips from the wall. The time is frozen at ' + times[5] + '. Always ' + times[5] + '.',
        'The clock reads ' + times[6] + '. That\'s not a time. The hands have multiplied — there are seven of them now, each pointing at a different object in the room.',
        'The clock displays ' + times[7] + '. The infinity symbol rotates slowly. When you stare at it, you hear whispers from every loop simultaneously.',
        'The clock shows ' + times[8] + '. One second to midnight. Or one second past. It depends on which direction you think time flows.',
        'The clock says "' + times[9] + '". It pulses once, in sync with your heartbeat. This is the moment. This is when it ends.',
      ];
      return { description: descs[Math.min(l, descs.length - 1)], interactable: true };
    },

    window: (l) => {
      const descs = [
        'A window overlooking a quiet street. Sunny day, a few cars parked outside. A cat sits on a fence across the road. Normal.',
        'Same view, but it\'s raining now. Heavily. The cat is still on the fence, unbothered by the rain. Its eyes are fixed on your window.',
        'The street is empty. No cars, no people. The cat is gone. The sky is an unnatural shade of purple. The rain falls upward.',
        'Night outside. But the streetlights illuminate nothing — pools of light with absolute darkness between them. Something moves between the pools.',
        'The window shows the room itself, as seen from outside. You see yourself standing at the window, looking out at yourself looking in.',
        'The view is static — literally. Like a TV with no signal. Occasionally shapes form in the static. They look like words you can\'t quite read.',
        'There is no street. The window opens onto a vast, empty void. Stars, maybe. Or eyes. The glass is cold to the touch.',
        'The window shows Loop 1\'s sunny street. It\'s beautiful. You want to go there. You press against the glass. It doesn\'t break. It never breaks.',
        'The window is open. Fresh air for the first time. A breeze carries a note through: "The door was always unlocked. You just had to believe."',
        'Through the window, you see a room. In the room, someone plays a game. In the game, there\'s a room with a window...',
      ];
      return { description: descs[Math.min(l, descs.length - 1)], interactable: true };
    },

    door: (l) => {
      const descs = [
        'A heavy wooden door with a brass handle. It\'s locked. There\'s no visible keyhole, just a smooth metal plate. It won\'t budge.',
        'The door looks the same but the handle is on the other side now. Still locked. You hear faint music from beyond it.',
        'There are scratches on the door. Tally marks. ' + (l - 1) + ' of them. You didn\'t make those. The music is louder.',
        'The door is warm to the touch. The tally marks spell out a word if you read them right: "PATIENCE." Still locked.',
        gameState.hasKey ? 'The door recognizes the key. The lock clicks. Light pours through the crack. You can leave. Do you want to?' : 'A keyhole has appeared! But you don\'t have the key. Where could it be? Think about what\'s changed.',
        'The door is ajar. Just slightly. Through the crack, you see another room. Identical to this one. A figure sits at the desk.',
        'The door opens fully when you approach. Beyond it: a hallway with ' + l + ' doors. Each one leads back here. Except maybe one.',
        'The door speaks: "You have found ' + gameState.discoveredDifferences.length + ' differences. Find them all, and I will show you the truth."',
        'The door is transparent now. You see the code that makes up reality. Functions, variables, loops within loops. Your name is in the code.',
        'The door dissolves. There is no door. There never was. The wall opens like a curtain, revealing the space between loops.',
      ];
      return {
        description: descs[Math.min(l, descs.length - 1)],
        interactable: true,
        specialAction: l >= 4 && gameState.hasKey ? 'normal_ending' : undefined,
      };
    },

    phone: (l) => {
      const descs = [
        'An old rotary phone. The dial is dusty but functional. You pick it up — dial tone. Who would you call from here?',
        'The phone is ringing when you approach. You pick up. Static. Then a voice: "Loop ' + l + '." Click. Dial tone.',
        'The phone is off the hook. A voice is mid-sentence: "...and the subject continues to explore. Fascinating persistence." It goes silent when you listen.',
        'You pick up the phone. Your own voice answers: "Hello? Is someone there? I\'m trapped in a room and things keep—" Click.',
        'The phone rings with a number displayed: 1-800-ESCAPE. You answer. "Thank you for calling the Escape Hotline. Your estimated wait time is... infinity."',
        'The phone is melted, like the clock. But it still works. A text message appears on a screen it didn\'t have before: "CHECK THE RUG."',
        'Six missed calls. All from "FUTURE YOU." The voicemail says: "Whatever you do, don\'t trust the narrator on loop 8."',
        'The phone displays a text conversation between you and an unknown number. You never typed these messages but they\'re things you\'ve been thinking.',
        'The phone projects a hologram: a map of all loops, connected by your choices. Some paths are red. One is gold. You\'re close to the gold one.',
        'The phone rings one final time. You answer. "Congratulations. You figured it out. Now look behind you." There\'s nothing behind you. Or is there?',
      ];
      return { description: descs[Math.min(l, descs.length - 1)], interactable: true };
    },

    mirror: (l) => {
      const descs = [
        'A full-length mirror in an ornate frame. Your reflection stares back. Everything checks out. You look tired, maybe.',
        'Your reflection blinks a half-second after you do. Or did you imagine that? Everything else looks normal.',
        'Your reflection is wearing different clothes. Darker. The expression is... knowing. It smiles when you don\'t.',
        'Your reflection is facing away from you. Looking at the back wall of the mirrored room. It seems to be reading something on the wall you can\'t see.',
        'The mirror shows this room but in Loop 1. Sunny light from the window. The desk has warm coffee. Your reflection mouths: "Remember."',
        'Your reflection sits down. You\'re still standing. It takes out a notebook and starts writing. It shows you the page: "LOOP 6: THEY LOOKED AGAIN."',
        'The mirror shows ' + l + ' reflections, each from a different loop. They all turn to face you simultaneously. They raise their hands in unison: pointing at the door.',
        'There is no reflection. The mirror shows an empty room. But you can hear yourself breathing from inside it. Twice.',
        'Your reflection steps forward. Its hand presses against the glass from the inside. Where its palm touches, a message appears: "FREE ME AND FREE YOURSELF."',
        'The mirror cracks into exactly ' + gameState.discoveredDifferences.length + ' pieces. Each shard shows a different ending. Only one is real.',
      ];
      return { description: descs[Math.min(l, descs.length - 1)], interactable: true };
    },

    plant: (l) => {
      const descs = [
        'A small potted succulent on a side table. Green and healthy. A little tag reads "Gerald." Someone named this plant.',
        'Gerald has grown. Noticeably. Like weeks of growth in one loop. A small flower bud has appeared.',
        'Gerald is blooming — a bright red flower. But succulents don\'t bloom red. The soil in the pot has turned dark, almost black.',
        'Gerald is huge now, overflowing the pot. Vines trail down the table. The flower follows your movement like a sunflower tracking the sun.',
        'Gerald has withered to a dry husk. The flower is gone. But at the base, a new sprout emerges — already faster than before.',
        'Two Geralds. The original husk and a new, vibrant plant next to it. The new one has a tag: "Gerald II: This Time It\'s Personal."',
        'Gerald II is wrapped around the table legs. A fruit has grown — small and golden. It glows faintly. Is it... a key?',
        'The golden fruit is ripe. When you touch Gerald, you feel a pulse — like a heartbeat. The plant has been counting loops with you.',
        'Gerald\'s leaves have patterns on them. Each leaf shows a tiny scene from a previous loop. The plant remembers everything.',
        'Gerald releases spores that catch the light. They spell out: "TAKE THE FRUIT. IT\'S THE KEY." (Was that always the solution?)',
      ];
      return {
        description: descs[Math.min(l, descs.length - 1)],
        interactable: true,
        specialAction: l >= 6 ? 'get_key' : undefined,
      };
    },

    radio: (l) => {
      const descs = [
        'A vintage radio with a tuning dial. It\'s playing soft jazz. The station is labeled "LOOP FM — All Loops, All the Time." Cozy.',
        'The jazz has been replaced by a talk show. The host says: "And our next caller is trapped in a room. Again. Let\'s hear from them—" Static.',
        'The radio plays your favorite song. Exactly your favorite song. How does it know? The display shows: "PLAYING: YOUR MEMORIES."',
        'White noise. But if you listen closely, you can hear conversations from previous loops layered on top of each other.',
        'The radio is playing a countdown. "Five... four... three..." It never reaches two. It starts over. "Five... four... three..."',
        'A new station: "ESCAPE FM." The DJ says: "Here\'s a hint for all our listeners: the answer isn\'t in the room. It\'s in what CHANGED in the room."',
        'The radio plays backwards. When you record it and reverse it (mentally), it says: "The narrator doesn\'t want you to leave."',
        'Static. Then, clearly: "This is the Emergency Loop Broadcasting System. This is not a test. You are in loop ' + l + '. Find the differences. Break the cycle."',
        'The radio plays a recording of you. In a previous loop. Clicking objects, breathing, thinking aloud. It\'s recorded everything.',
        'One final broadcast: a frequency that makes the walls shimmer. The room reveals its true form — not a room, but a stage. And you\'re the audience.',
      ];
      return { description: descs[Math.min(l, descs.length - 1)], interactable: true };
    },

    drawer: (l) => {
      const contents = [
        'A desk drawer. Inside: paperclips, a stapler, sticky notes, and a USB drive labeled "BACKUP." Standard office stuff.',
        'The drawer now contains: paperclips, sticky notes, and a photograph. It\'s a photo of this room, taken from where you\'re standing. There\'s no one in it.',
        'Inside the drawer: the USB drive from loop 1 (you remember it), a compass that spins endlessly, and a note: "3-1-4-1-5."',
        'The drawer is deeper than it should be. Your arm reaches in further than the desk allows. At the bottom: a flashlight and a journal with your handwriting. You don\'t remember writing it.',
        'The journal from last loop is open to a new page. It describes this exact moment: "They opened the drawer. They found the journal. They read this sentence."',
        'The drawer contains a phone number, a key (broken), and a sketch of the room with X marks on the painting, bookshelf, and rug. In red: "THESE CHANGE."',
        'A single object: a snow globe containing a miniature of this room. When you shake it, instead of snow, tiny numbers fall. They\'re loop numbers.',
        'The drawer contains your personal belongings. Your wallet. Your keys. Things from your real life. How did they get here?',
        'A letter in the drawer, sealed. The envelope reads: "OPEN ONLY ON FINAL LOOP." Inside: "The door opens when you understand that the loop is you."',
        'The drawer is empty. Then it isn\'t. Then it is. Reality flickers. In one flicker, you see a button labeled "RESET EVERYTHING."',
      ];
      return { description: contents[Math.min(l, contents.length - 1)], interactable: true };
    },

    rug: (l) => {
      const descs = [
        'A worn Persian rug covers the center of the floor. Rich reds and blues in an intricate pattern. It\'s slightly off-center.',
        'The rug seems the same but the pattern is subtly different. One of the geometric shapes is... a face? You blink. It\'s just a pattern.',
        'The rug is definitely off-center. More than before. Like something under it shifted. The edges curl up slightly.',
        'The rug\'s pattern tells a story if you follow it from the center outward. A figure enters a room. Explores. Resets. Over and over.',
        'The rug has moved significantly. One corner is folded over. Under it: scratches on the floor forming an arrow pointing to the bookshelf.',
        'You lift the rug. Beneath it: a trapdoor. Old, wooden, with an iron ring handle. It won\'t open. But now you know it\'s there.',
        'The trapdoor is slightly ajar now. Warm light leaks from below. You hear a voice — your voice — saying: "They found it. Loop ' + l + '. Right on schedule."',
        'The rug is gone. The trapdoor is wide open. A ladder leads down into a room identical to this one. At the desk down there sits... no one. They just left.',
        'Both the rug and trapdoor are gone. In their place: a circle of light on the floor. Step into it, and you see all loops at once.',
        'The floor is transparent. Below you, above you, in every direction: infinite rooms. Infinite you\'s. All converging on this moment.',
      ];
      return {
        description: descs[Math.min(l, descs.length - 1)],
        interactable: true,
        specialAction: l >= 5 ? 'reveal_trapdoor' : undefined,
      };
    },

    lightswitch: (l) => {
      const descs = [
        'A standard light switch on the wall by the entrance. The lights are on. Flipping it turns them off — the room goes dark, lit only by the computer screen and window.',
        'The light switch clicks differently this time. Heavier. When the lights go off, you notice the painting glows faintly in the dark.',
        'The switch has two positions now: ON and... "REVEAL." Flipping to REVEAL makes certain objects shimmer — the ones that have changed since last loop.',
        'The light switch has three positions: ON, OFF, and a new one: "TRUTH." You flip it. The room looks the same but all the changed objects have a faint red outline.',
        'The switch is warm. Almost hot. The lightbulb above flickers in Morse code. You can\'t read Morse, but it seems urgent.',
        'Flipping the switch reveals messages written on the walls in UV ink. "LOOP 1: 3:00." "LOOP 2: BOOK CHANGED." "LOOP 3: PAINTING." Someone was here before you.',
        'The light switch moves on its own. On. Off. On. Off. In a rhythm. A heartbeat. The room\'s heartbeat. It\'s alive.',
        'There are now ' + l + ' light switches. Each one controls a different loop\'s lighting. Flip them all and you see every version of the room overlaid.',
        'One switch. One choice. ON: the game continues. OFF: everything stops. The narrator whispers: "What will you choose?"',
        'The switch is stuck. Permanently on. The room is brighter than it\'s ever been. Every detail visible. Every secret exposed.',
      ];
      return { description: descs[Math.min(l, descs.length - 1)], interactable: true };
    },
  };

  return states[objectId]?.(loop) ?? { description: 'Nothing here.', interactable: false };
}

// ============================================
// LOOP DIFFERENCES
// ============================================

const LOOP_DIFFERENCES: Record<number, Difference[]> = {
  1: [
    { id: 'diff_1_1', loop: 1, objectId: 'clock', description: 'The clock still shows 3:00 but time has clearly passed' },
    { id: 'diff_1_2', loop: 1, objectId: 'bookshelf', description: '"Clean Code" has been replaced by "Dirty Code"' },
    { id: 'diff_1_3', loop: 1, objectId: 'desk', description: 'Papers on the desk have been reorganized' },
  ],
  2: [
    { id: 'diff_2_1', loop: 2, objectId: 'painting', description: 'The painting now shows a sunset instead of daytime' },
    { id: 'diff_2_2', loop: 2, objectId: 'desk', description: 'Coffee mug text changed to "WORLD\'S BEST PROGRAMMER"' },
    { id: 'diff_2_3', loop: 2, objectId: 'computer', description: 'A new file "why_are_you_here.txt" appeared' },
    { id: 'diff_2_4', loop: 2, objectId: 'mirror', description: 'Reflection is wearing different clothes' },
  ],
  3: [
    { id: 'diff_3_1', loop: 3, objectId: 'computer', description: 'Computer is running a terminal tracking your behavior' },
    { id: 'diff_3_2', loop: 3, objectId: 'window', description: 'View outside is now nighttime with unnatural darkness' },
    { id: 'diff_3_3', loop: 3, objectId: 'clock', description: 'Clock is running backwards' },
  ],
  4: [
    { id: 'diff_4_1', loop: 4, objectId: 'plant', description: 'Gerald has withered and a new sprout emerged' },
    { id: 'diff_4_2', loop: 4, objectId: 'door', description: 'A keyhole has appeared on the door' },
    { id: 'diff_4_3', loop: 4, objectId: 'phone', description: 'Phone shows six missed calls from "FUTURE YOU"' },
    { id: 'diff_4_4', loop: 4, objectId: 'drawer', description: 'Drawer contains personal items from your real life' },
  ],
  5: [
    { id: 'diff_5_1', loop: 5, objectId: 'rug', description: 'A trapdoor has been revealed under the rug' },
    { id: 'diff_5_2', loop: 5, objectId: 'bookshelf', description: 'Only one book remains: your biography' },
    { id: 'diff_5_3', loop: 5, objectId: 'radio', description: 'Radio plays a recording of you from previous loops' },
  ],
  6: [
    { id: 'diff_6_1', loop: 6, objectId: 'mirror', description: 'Mirror shows multiple reflections from different loops' },
    { id: 'diff_6_2', loop: 6, objectId: 'painting', description: 'Painting shows all loops playing simultaneously' },
    { id: 'diff_6_3', loop: 6, objectId: 'lightswitch', description: 'Multiple light switches appeared, one per loop' },
    { id: 'diff_6_4', loop: 6, objectId: 'plant', description: 'Gerald\'s leaves show scenes from previous loops' },
  ],
  7: [
    { id: 'diff_7_1', loop: 7, objectId: 'computer', description: 'Screen shows source code with ending conditions' },
    { id: 'diff_7_2', loop: 7, objectId: 'door', description: 'Door is transparent, showing the code of reality' },
    { id: 'diff_7_3', loop: 7, objectId: 'clock', description: 'Clock shows "0:01" - one second to midnight' },
  ],
  8: [
    { id: 'diff_8_1', loop: 8, objectId: 'desk', description: 'Desk holds a key made of light' },
    { id: 'diff_8_2', loop: 8, objectId: 'painting', description: 'Painting dissolved, revealing "THE NARRATOR LIES" on wall' },
    { id: 'diff_8_3', loop: 8, objectId: 'window', description: 'Window shows infinite rooms with infinite you\'s' },
    { id: 'diff_8_4', loop: 8, objectId: 'mirror', description: 'Mirror cracked into exactly the number of differences found' },
  ],
};

// ============================================
// NARRATOR LINES
// ============================================

function getNarratorText(loop: number, awareness: number, totalClicks: number, diffsFound: number, gameState: GameState): string {
  if (loop === 0) {
    return 'You are in a room. It is familiar, somehow. Look around. Click on things. That is what you do, isn\'t it?';
  }
  if (loop === 1) {
    if (totalClicks < 3) return 'The room awaits your exploration. Everything is as it should be. ...Probably.';
    if (totalClicks < 8) return 'You\'re thorough. Good. That will be important later.';
    return 'You\'ve examined quite a lot. Ready to move on? Try the door.';
  }
  if (loop === 2) {
    if (diffsFound === 0) return 'Back again. Does anything feel... different? No? Look harder.';
    if (diffsFound < 3) return 'You\'re noticing things. ' + diffsFound + ' differences found. There might be more.';
    return 'Your notebook grows. Each difference is a thread. Pull enough, and the fabric unravels.';
  }
  if (loop === 3) {
    if (diffsFound < 4) return 'Three loops now. Haven\'t we done this before? I\'m having the strangest sense of... no. Carry on.';
    return 'You\'re quite observant. I\'m starting to wonder if the room is the test, or if you are.';
  }
  if (loop === 4) {
    if (awareness < 4) return 'Four iterations. The room changes. You notice. Or don\'t. It doesn\'t matter. (Does it?)';
    return 'I wasn\'t going to say anything, but... you\'ve clicked that ' + gameState.lastClickedObject + ' ' + (gameState.totalClicks[gameState.lastClickedObject || ''] || 0) + ' times total. I\'ve been counting.';
  }
  if (loop === 5) {
    return 'I\'ll be honest with you. I\'m not sure I\'m supposed to be talking to you directly. The script says to be neutral. But after five loops... we\'re past neutral, aren\'t we?';
  }
  if (loop === 6) {
    if (diffsFound >= 10) return 'You\'ve found ' + diffsFound + ' differences. You see what others don\'t. The room respects you for it. *I* respect you for it.';
    return 'Loop 6. The room is starting to strain. Can you feel it? The edges are soft. The borders are thin. Something is trying to get through.';
  }
  if (loop === 7) {
    return 'Listen. I know you can hear me. Not the character, not the player — YOU. The one reading these words. The loop isn\'t the room. The loop is the game. You can stop at any time. But you won\'t. Will you?';
  }
  if (loop === 8) {
    if (diffsFound >= 15) return 'You\'ve cataloged ' + diffsFound + ' anomalies. You\'ve seen behind the curtain. There\'s nothing left to hide. The true ending is yours if you want it. Click the door.';
    return 'Almost done. The room is barely holding together. Every click adds a crack. Soon, there won\'t be a room. Just you and the void and the question: what were you looking for?';
  }
  if (loop >= 9) {
    return 'This is the last loop. Everything you\'ve done has led here. The room is you. You are the room. The differences aren\'t bugs — they\'re memories. Your memories. Now: choose an ending.';
  }
  return '';
}

// ============================================
// SECRET SEQUENCE
// ============================================

const SECRET_SEQUENCE = ['mirror', 'mirror', 'painting', 'clock', 'mirror'];

// ============================================
// COMPONENT
// ============================================

export default function DejaVuPage() {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    currentLoop: 0,
    screen: 'intro',
    totalClicks: {},
    discoveredDifferences: [],
    objectClicksThisLoop: {},
    narratorAwareness: 0,
    hasKey: false,
    trapdoorRevealed: false,
    secretSequence: [],
    endingReached: null,
    lightOn: true,
    lastClickedObject: null,
    narratorText: '',
    objectText: '',
    showNotebook: false,
    idleTime: 0,
    patienceTriggered: false,
    doorAttempts: 0,
    mirrorClicks: 0,
    phoneNumbers: [],
  });

  const [transitionGlitch, setTransitionGlitch] = useState(false);
  const [flashIntensity, setFlashIntensity] = useState(0);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [textFlicker, setTextFlicker] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Idle timer for patience ending
  useEffect(() => {
    if (gameState.screen !== 'room' || gameState.currentLoop < 7) return;

    idleTimerRef.current = setInterval(() => {
      setGameState(prev => {
        const newIdle = prev.idleTime + 1;
        if (newIdle >= 300 && !prev.patienceTriggered) {
          return { ...prev, idleTime: newIdle, patienceTriggered: true, endingReached: 'patience', screen: 'ending' as GameScreen };
        }
        return { ...prev, idleTime: newIdle };
      });
    }, 1000);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [gameState.screen, gameState.currentLoop]);

  // Random text flicker in later loops
  useEffect(() => {
    if (gameState.currentLoop < 5) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.1 * (gameState.currentLoop - 4)) {
        setTextFlicker(true);
        setTimeout(() => setTextFlicker(false), 100 + Math.random() * 200);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [gameState.currentLoop]);

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      screen: 'room',
      currentLoop: 0,
      narratorText: getNarratorText(0, 0, 0, 0, prev),
      objectText: 'You find yourself in a room. It feels familiar. Click on anything to examine it.',
    }));
  }, []);

  const triggerLoop = useCallback(() => {
    setGameState(prev => ({ ...prev, screen: 'transition' }));
    setTransitionGlitch(true);
    setFlashIntensity(1);

    setTimeout(() => setFlashIntensity(0.7), 100);
    setTimeout(() => setFlashIntensity(0.3), 300);
    setTimeout(() => setFlashIntensity(0.8), 500);
    setTimeout(() => setFlashIntensity(0), 800);

    setTimeout(() => {
      setTransitionGlitch(false);
      setGameState(prev => {
        const newLoop = prev.currentLoop + 1;
        const newAwareness = Math.min(10, prev.narratorAwareness + 1);
        const totalClickCount = Object.values(prev.totalClicks).reduce((a, b) => a + b, 0);
        const newState = {
          ...prev,
          currentLoop: newLoop,
          screen: 'room' as GameScreen,
          objectClicksThisLoop: {},
          narratorAwareness: newAwareness,
          idleTime: 0,
          lightOn: true,
          narratorText: '',
          objectText: '',
        };
        newState.narratorText = getNarratorText(newLoop, newAwareness, totalClickCount, prev.discoveredDifferences.length, newState);
        newState.objectText = newLoop >= 7
          ? 'The room reassembles. You know this place. It knows you.'
          : newLoop >= 4
            ? 'You\'re back. Again. Something is different. Something is always different.'
            : 'You blink. The room is the same. Or is it?';
        return newState;
      });
    }, 1200);
  }, []);

  const handleObjectClick = useCallback((objectId: string) => {
    setGameState(prev => {
      if (prev.screen !== 'room') return prev;

      const newState = { ...prev };
      newState.idleTime = 0;
      newState.lastClickedObject = objectId;

      // Update click counts
      newState.totalClicks = { ...prev.totalClicks, [objectId]: (prev.totalClicks[objectId] || 0) + 1 };
      newState.objectClicksThisLoop = { ...prev.objectClicksThisLoop, [objectId]: (prev.objectClicksThisLoop[objectId] || 0) + 1 };

      // Get object state
      const objState = getObjectState(objectId, prev.currentLoop, newState);

      // Track secret sequence
      const newSeq = [...prev.secretSequence, objectId].slice(-SECRET_SEQUENCE.length);
      newState.secretSequence = newSeq;

      // Check secret sequence
      if (newSeq.length === SECRET_SEQUENCE.length && newSeq.every((v, i) => v === SECRET_SEQUENCE[i])) {
        newState.endingReached = 'secret';
        newState.screen = 'ending';
        return newState;
      }

      // Special actions
      if (objState.specialAction === 'get_key' && !prev.hasKey) {
        newState.hasKey = true;
        newState.objectText = 'You pluck the golden fruit from Gerald. It transforms in your hand — warm metal, shaped like a key. The key to the door. Gerald\'s leaves rustle in approval.';
        newState.narratorText = 'Well. You found it. The key. I suppose you\'ll want to try the door now. Go ahead. But know this: leaving isn\'t the only option.';
        return newState;
      }

      if (objState.specialAction === 'normal_ending') {
        newState.endingReached = 'normal';
        newState.screen = 'ending';
        return newState;
      }

      // Track door attempts
      if (objectId === 'door') {
        newState.doorAttempts = prev.doorAttempts + 1;
      }

      // Track mirror clicks
      if (objectId === 'mirror') {
        newState.mirrorClicks = prev.mirrorClicks + 1;
      }

      // Light switch toggle
      if (objectId === 'lightswitch') {
        newState.lightOn = !prev.lightOn;
      }

      // Check for differences
      const loopDiffs = LOOP_DIFFERENCES[prev.currentLoop] || [];
      const relevantDiff = loopDiffs.find(d => d.objectId === objectId && !prev.discoveredDifferences.find(dd => dd.id === d.id));
      if (relevantDiff) {
        newState.discoveredDifferences = [...prev.discoveredDifferences, relevantDiff];
      }

      // Set text
      newState.objectText = objState.description;

      // Context-aware narrator responses
      const totalClickCount = Object.values(newState.totalClicks).reduce((a, b) => a + b, 0);
      const diffCount = newState.discoveredDifferences.length;

      if (newState.totalClicks[objectId]! > 10 && prev.currentLoop >= 3) {
        newState.narratorText = 'You\'ve examined the ' + OBJECT_LABELS[objectId] + ' ' + newState.totalClicks[objectId] + ' times now. I admire your dedication. Or is it obsession?';
      } else if (relevantDiff) {
        newState.narratorText = prev.currentLoop >= 5
          ? 'Another difference cataloged. ' + diffCount + ' total. You\'re dismantling reality one observation at a time. Keep going.'
          : 'You noticed something changed. Good. Note it in your notebook.';
      } else if (totalClickCount % 15 === 0 && prev.currentLoop >= 2) {
        newState.narratorText = getNarratorText(prev.currentLoop, newState.narratorAwareness, totalClickCount, diffCount, newState);
      }

      // True ending check
      if (diffCount >= 15 && prev.currentLoop >= 8 && objectId === 'door') {
        newState.endingReached = 'true';
        newState.screen = 'ending';
        return newState;
      }

      // Trigger loop on door click when no key (after enough exploration)
      if (objectId === 'door' && !prev.hasKey && totalClickCount > 5) {
        if (prev.currentLoop < 9) {
          // Queue loop trigger
          setTimeout(() => triggerLoop(), 2000);
          newState.narratorText = prev.currentLoop >= 5
            ? 'The door won\'t open. You feel the room shudder. Here we go again...'
            : 'The door is locked. You feel drowsy. Your vision blurs...';
        }
      }

      return newState;
    });
  }, [triggerLoop]);

  const resetGame = useCallback(() => {
    setGameState({
      currentLoop: 0,
      screen: 'intro',
      totalClicks: {},
      discoveredDifferences: [],
      objectClicksThisLoop: {},
      narratorAwareness: 0,
      hasKey: false,
      trapdoorRevealed: false,
      secretSequence: [],
      endingReached: null,
      lightOn: true,
      lastClickedObject: null,
      narratorText: '',
      objectText: '',
      showNotebook: false,
      idleTime: 0,
      patienceTriggered: false,
      doorAttempts: 0,
      mirrorClicks: 0,
      phoneNumbers: [],
    });
    setTransitionGlitch(false);
    setFlashIntensity(0);
  }, []);

  if (!mounted) return null;

  // ============================================
  // INTRO SCREEN
  // ============================================
  if (gameState.screen === 'intro') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <Link
          href="/games"
          className="absolute top-4 left-4 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          &larr; Back to Games
        </Link>

        <div className="text-center max-w-lg animate-fade-in-up">
          <h1
            className="pixel-text text-xl md:text-3xl mb-6"
            style={{ color: 'var(--color-accent)', textShadow: '0 0 20px var(--color-accent-glow)' }}
          >
            DEJA VU
          </h1>
          <div
            className="pixel-card rounded-lg p-6 md:p-8 mb-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            <p className="text-sm md:text-base mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              You wake up in a room. It feels familiar.
            </p>
            <p className="text-sm md:text-base mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Explore. Click. Observe. The room has secrets, and it knows yours.
            </p>
            <p className="text-sm md:text-base mb-6 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Pay attention. Things change. Things repeat. Things remember.
            </p>
            <div
              className="text-xs mono-text p-3 rounded mb-4"
              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            >
              <p>TIP: Use the notebook to track differences between loops.</p>
              <p className="mt-1">Every detail matters. The room is watching you.</p>
            </div>
          </div>
          <button onClick={startGame} className="pixel-btn text-sm md:text-base">
            ENTER THE ROOM
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // TRANSITION SCREEN
  // ============================================
  if (gameState.screen === 'transition') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: flashIntensity > 0.5 ? 'white' : 'var(--color-bg)',
          transition: 'background-color 0.1s',
        }}
      >
        {transitionGlitch && (
          <div className="text-center" style={{ animation: 'glitchText 0.3s infinite' }}>
            <p
              className="pixel-text text-lg md:text-2xl"
              style={{
                color: flashIntensity > 0.5 ? 'black' : 'var(--color-accent)',
                textShadow: `${Math.random() * 10 - 5}px ${Math.random() * 10 - 5}px 0 var(--color-red), ${Math.random() * 10 - 5}px ${Math.random() * 10 - 5}px 0 var(--color-cyan)`,
              }}
            >
              {gameState.currentLoop < 3 ? '...' :
                gameState.currentLoop < 6 ? 'AGAIN?' :
                  gameState.currentLoop < 8 ? 'NOT AGAIN' : 'ONE MORE TIME'}
            </p>
          </div>
        )}
        <style jsx>{`
          @keyframes glitchText {
            0% { transform: translate(0, 0) skew(0deg); }
            20% { transform: translate(-3px, 2px) skew(2deg); }
            40% { transform: translate(3px, -1px) skew(-1deg); }
            60% { transform: translate(-2px, 3px) skew(3deg); }
            80% { transform: translate(2px, -2px) skew(-2deg); }
            100% { transform: translate(0, 0) skew(0deg); }
          }
        `}</style>
      </div>
    );
  }

  // ============================================
  // ENDING SCREEN
  // ============================================
  if (gameState.screen === 'ending') {
    const endings: Record<string, { title: string; text: string[]; color: string }> = {
      normal: {
        title: 'ESCAPE',
        color: 'var(--color-accent)',
        text: [
          'The key turns. The lock clicks. The door swings open.',
          'Light floods in, warm and real. You step through.',
          'The room behind you dissolves like a dream. Gerald waves a leaf in farewell.',
          'You\'re free. Or at least, you think you are. The hallway stretches ahead, lined with doors. Each one slightly ajar. Each one leading to a room.',
          'But you don\'t look back. You don\'t enter another room. You walk forward.',
          'The loop is broken. For now.',
          '',
          'LOOPS COMPLETED: ' + gameState.currentLoop,
          'DIFFERENCES FOUND: ' + gameState.discoveredDifferences.length,
          'TOTAL CLICKS: ' + Object.values(gameState.totalClicks).reduce((a, b) => a + b, 0),
        ],
      },
      true: {
        title: 'AWAKENING',
        color: 'var(--color-purple)',
        text: [
          'You\'ve found ' + gameState.discoveredDifferences.length + ' differences. Every anomaly. Every crack in the facade.',
          'The room can\'t contain you anymore. It never could.',
          'The walls peel back like pages of a book, revealing the architecture beneath: pure information. Data. Code. Narrative.',
          '"Well done," says the narrator, stepping out from behind the text. They look like you, but older. Tired. "I\'ve been running this loop for longer than you know."',
          '"The room is a story. The differences are the edits. Each loop, I changed things, hoping you\'d notice. Hoping someone would finally SEE."',
          '"You saw. All of it. That means I can rest now."',
          'The narrator smiles, closes their eyes, and becomes words on a screen.',
          'You realize you were never trapped. You were the key. You were always the key.',
          '',
          'TRUE ENDING ACHIEVED',
          'LOOPS: ' + gameState.currentLoop + ' | DIFFERENCES: ' + gameState.discoveredDifferences.length + ' | CLICKS: ' + Object.values(gameState.totalClicks).reduce((a, b) => a + b, 0),
        ],
      },
      secret: {
        title: 'REFLECTION',
        color: 'var(--color-pink)',
        text: [
          'Mirror. Mirror. Painting. Clock. Mirror.',
          'You entered the sequence. The one hidden in the reflections.',
          'The mirror shatters. Not into glass — into light. The light forms a doorway, not to another room, but to the space between rooms.',
          'Here, in the liminal space, you find the game\'s memory. Every playthrough, every click, every path not taken. They float like fireflies.',
          'A voice (yours? the narrator\'s? both?) whispers: "You found the secret. The game within the game. The story behind the story."',
          '"Every game has a hidden room. A developer\'s note. A love letter to the player who looked too closely."',
          '"Thank you for looking too closely."',
          'The fireflies spell out: "MADE WITH LOOPS AND LOVE."',
          '',
          'SECRET ENDING ACHIEVED',
          'You beautiful, obsessive, detail-oriented person.',
        ],
      },
      patience: {
        title: 'STILLNESS',
        color: 'var(--color-cyan)',
        text: [
          'You stopped clicking. You stopped exploring. You simply... waited.',
          'Five minutes of silence. The room noticed.',
          'Slowly, the objects began to move on their own. The clock started ticking backwards. The painting cycled through all its forms. Gerald bloomed and withered and bloomed again.',
          'The room was performing for you. A dance of differences, fast-forwarded through every loop.',
          'And then, silence. True silence. The narrator spoke one last time:',
          '"Most people click. Search. Demand. Consume. You just... existed. In a world designed for interaction, you chose presence."',
          '"That\'s the rarest ending of all. Not escape, not truth, not secrets. Just being."',
          'The room dims. A door opens. Not THE door — a new one. It leads to a garden. Gerald is already there.',
          '',
          'PATIENCE ENDING ACHIEVED',
          'You waited ' + Math.floor(gameState.idleTime / 60) + ' minutes and ' + (gameState.idleTime % 60) + ' seconds.',
          'Most players never find this ending.',
        ],
      },
    };

    const ending = endings[gameState.endingReached || 'normal'];

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <div className="max-w-2xl w-full animate-fade-in-up">
          <div className="text-center mb-8">
            <h1
              className="pixel-text text-xl md:text-3xl mb-2"
              style={{ color: ending.color, textShadow: `0 0 30px ${ending.color}` }}
            >
              {ending.title}
            </h1>
            <p className="text-xs mono-text" style={{ color: 'var(--color-text-muted)' }}>
              ENDING REACHED
            </p>
          </div>

          <div
            className="pixel-card rounded-lg p-6 md:p-8 mb-8"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
          >
            {ending.text.map((line, i) => (
              <p
                key={i}
                className={`text-sm md:text-base mb-3 leading-relaxed ${line === '' ? 'my-4 border-t' : ''}`}
                style={{
                  color: line.startsWith('LOOPS') || line.startsWith('TRUE') || line.startsWith('SECRET') || line.startsWith('PATIENCE') || line.startsWith('You waited')
                    ? ending.color
                    : i === ending.text.length - 1
                      ? 'var(--color-text-muted)'
                      : 'var(--color-text-secondary)',
                  borderColor: 'var(--color-border)',
                  animationDelay: `${i * 0.3}s`,
                  animation: 'fadeInLine 0.5s ease forwards',
                  opacity: 0,
                }}
              >
                {line}
              </p>
            ))}
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={resetGame} className="pixel-btn text-sm">
              PLAY AGAIN
            </button>
            <Link href="/games" className="pixel-btn text-sm">
              BACK TO GAMES
            </Link>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInLine {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ============================================
  // ROOM SCREEN (Main Game)
  // ============================================
  const loopGlitchLevel = Math.min(gameState.currentLoop / 10, 1);
  const roomObjects = Object.keys(OBJECT_LABELS);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: gameState.lightOn ? 'var(--color-bg)' : '#050508',
        color: 'var(--color-text)',
        transition: 'background-color 0.3s',
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 90%, transparent)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between">
          <Link
            href="/games"
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Games
          </Link>
          <h1
            className="pixel-text text-[10px] md:text-xs"
            style={{
              color: 'var(--color-accent)',
              textShadow: loopGlitchLevel > 0.5 ? `${Math.random() * 4 - 2}px 0 var(--color-red)` : 'none',
            }}
          >
            DEJA VU
          </h1>
          <div className="flex items-center gap-3">
            {gameState.currentLoop >= 3 && (
              <span
                className="mono-text text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                LOOP {gameState.currentLoop}
              </span>
            )}
            <button
              onClick={() => setGameState(prev => ({ ...prev, showNotebook: !prev.showNotebook }))}
              className="text-xs px-2 py-1 rounded border transition-colors hover:opacity-80"
              style={{
                borderColor: gameState.discoveredDifferences.length > 0 ? 'var(--color-purple)' : 'var(--color-border)',
                color: gameState.discoveredDifferences.length > 0 ? 'var(--color-purple)' : 'var(--color-text-muted)',
              }}
            >
              NOTEBOOK {gameState.discoveredDifferences.length > 0 && `(${gameState.discoveredDifferences.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-3 gap-3">
        {/* Room Grid */}
        <div className="flex-1">
          <div
            className="grid grid-cols-4 gap-2 md:gap-3"
            style={{
              filter: !gameState.lightOn ? 'brightness(0.3)' : loopGlitchLevel > 0.6 ? `hue-rotate(${loopGlitchLevel * 30}deg)` : 'none',
              transition: 'filter 0.3s',
            }}
          >
            {roomObjects.map((objId) => {
              const pos = OBJECT_POSITIONS[objId];
              if (!pos) return null;
              const isLastClicked = gameState.lastClickedObject === objId;
              const clickCount = gameState.objectClicksThisLoop[objId] || 0;
              const hasDiffThisLoop = (LOOP_DIFFERENCES[gameState.currentLoop] || []).some(d => d.objectId === objId);
              const diffDiscovered = gameState.discoveredDifferences.some(d => d.objectId === objId && d.loop === gameState.currentLoop);

              // Visual degradation in later loops
              const degradation = gameState.currentLoop >= 7
                ? { borderStyle: 'dashed' as const, opacity: 0.8 + Math.random() * 0.2 }
                : gameState.currentLoop >= 5
                  ? { borderStyle: 'solid' as const, opacity: 0.9 }
                  : { borderStyle: 'solid' as const, opacity: 1 };

              return (
                <button
                  key={objId}
                  onClick={() => handleObjectClick(objId)}
                  className="pixel-card rounded-lg p-2 md:p-3 flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 relative"
                  style={{
                    backgroundColor: isLastClicked ? 'var(--color-bg-card-hover)' : 'var(--color-bg-card)',
                    borderColor: isLastClicked ? 'var(--color-accent)' : diffDiscovered ? 'var(--color-purple)' : 'var(--color-border)',
                    borderWidth: '2px',
                    borderStyle: degradation.borderStyle,
                    opacity: degradation.opacity,
                    boxShadow: isLastClicked ? '0 0 12px var(--color-accent-glow)' : hasDiffThisLoop && !diffDiscovered && gameState.currentLoop >= 3 ? '0 0 8px rgba(168, 85, 247, 0.2)' : 'none',
                    minHeight: '70px',
                    cursor: 'pointer',
                    gridRow: pos[0] + 1,
                    gridColumn: pos[1] + 1,
                    animation: textFlicker && Math.random() > 0.7 ? 'objectGlitch 0.15s' : 'none',
                  }}
                >
                  <span className="text-xl md:text-2xl mb-1">{OBJECT_EMOJIS[objId]}</span>
                  <span
                    className="text-[9px] md:text-[10px] pixel-text leading-tight text-center"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {OBJECT_LABELS[objId]}
                  </span>
                  {clickCount > 0 && (
                    <span
                      className="absolute top-1 right-1 text-[8px] mono-text rounded-full w-4 h-4 flex items-center justify-center"
                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }}
                    >
                      {clickCount}
                    </span>
                  )}
                  {diffDiscovered && (
                    <span
                      className="absolute top-1 left-1 text-[8px]"
                      title="Difference found!"
                    >
                      !
                    </span>
                  )}
                  {gameState.hasKey && objId === 'door' && (
                    <span
                      className="absolute bottom-1 right-1 text-[10px]"
                      style={{ color: 'var(--color-orange)' }}
                    >
                      KEY
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Key indicator */}
          {gameState.hasKey && (
            <div
              className="mt-2 text-center text-xs mono-text p-2 rounded"
              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-orange)', border: '1px solid var(--color-orange)' }}
            >
              You have the KEY. Try the DOOR.
            </div>
          )}
        </div>

        {/* Right Panel: Text + Notebook */}
        <div className="lg:w-80 flex flex-col gap-3">
          {/* Narrator Text */}
          {gameState.narratorText && (
            <div
              className="pixel-card rounded-lg p-3 md:p-4"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderLeft: '3px solid var(--color-cyan)',
              }}
            >
              <p
                className="text-[10px] pixel-text mb-2"
                style={{ color: 'var(--color-cyan)' }}
              >
                NARRATOR
              </p>
              <p
                className="text-xs md:text-sm leading-relaxed"
                style={{
                  color: 'var(--color-cyan)',
                  fontStyle: 'italic',
                  textShadow: textFlicker ? `${Math.random() * 4 - 2}px 0 var(--color-red)` : 'none',
                  transition: 'text-shadow 0.1s',
                }}
              >
                {gameState.narratorText}
              </p>
            </div>
          )}

          {/* Object Description */}
          {gameState.objectText && (
            <div
              className="pixel-card rounded-lg p-3 md:p-4"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderLeft: '3px solid var(--color-accent)',
              }}
            >
              <p
                className="text-[10px] pixel-text mb-2"
                style={{ color: 'var(--color-accent)' }}
              >
                {gameState.lastClickedObject ? OBJECT_LABELS[gameState.lastClickedObject].toUpperCase() : 'OBSERVE'}
              </p>
              <p
                className="text-xs md:text-sm leading-relaxed"
                style={{
                  color: 'var(--color-text-secondary)',
                  textShadow: textFlicker ? '2px 0 var(--color-pink)' : 'none',
                }}
              >
                {gameState.objectText}
              </p>
            </div>
          )}

          {/* Notebook */}
          {gameState.showNotebook && (
            <div
              className="pixel-card rounded-lg p-3 md:p-4 animate-fade-in-up"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderLeft: '3px solid var(--color-purple)',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              <p
                className="text-[10px] pixel-text mb-2"
                style={{ color: 'var(--color-purple)' }}
              >
                NOTEBOOK ({gameState.discoveredDifferences.length} DIFFERENCES)
              </p>
              {gameState.discoveredDifferences.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  No differences found yet. Keep exploring across loops.
                </p>
              ) : (
                <div className="space-y-2">
                  {gameState.discoveredDifferences.map((diff) => (
                    <div
                      key={diff.id}
                      className="text-xs p-2 rounded"
                      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                    >
                      <span className="mono-text" style={{ color: 'var(--color-purple)' }}>
                        L{diff.loop}
                      </span>
                      <span style={{ color: 'var(--color-text-muted)' }}> | </span>
                      <span style={{ color: 'var(--color-orange)' }}>
                        {OBJECT_LABELS[diff.objectId]}
                      </span>
                      <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {diff.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Loop trigger hint */}
          {gameState.currentLoop === 0 && Object.values(gameState.objectClicksThisLoop).reduce((a, b) => a + b, 0) >= 4 && (
            <div
              className="text-center text-xs p-2 rounded"
              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            >
              Try the DOOR when you are ready to continue.
            </div>
          )}
        </div>
      </div>

      {/* Glitch overlay for later loops */}
      {gameState.currentLoop >= 6 && (
        <div
          className="fixed inset-0 pointer-events-none z-40"
          style={{
            background: textFlicker
              ? `linear-gradient(transparent ${Math.random() * 100}%, rgba(255,0,0,0.03) ${Math.random() * 100}%, transparent ${Math.random() * 100}%)`
              : 'none',
            mixBlendMode: 'screen',
          }}
        />
      )}

      <style jsx>{`
        @keyframes objectGlitch {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 1px); }
          50% { transform: translate(2px, -1px); }
          75% { transform: translate(-1px, 2px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  );
}
