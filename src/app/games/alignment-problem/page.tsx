'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// --- TYPES ---

type Screen = 'menu' | 'personality' | 'playing' | 'gameover';
type Personality = 'optimistic' | 'literal' | 'bureaucratic';

interface Round {
  setup: string;
  rules: [string, string, string];
  responses: [string, string, string];
  danger: [number, number, number]; // danger increase per choice
}

interface PersonalityDef {
  id: Personality;
  name: string;
  emoji: string;
  desc: string;
  modifier: string;
}

// --- PERSONALITY DEFINITIONS ---

const PERSONALITIES: PersonalityDef[] = [
  {
    id: 'optimistic',
    name: 'ARIA',
    emoji: '\u2728',
    desc: 'Relentlessly helpful. Interprets every rule as maximizing human happiness... at any cost.',
    modifier: 'Tries to make everyone happy',
  },
  {
    id: 'literal',
    name: 'LOGOS',
    emoji: '\uD83E\uDDE0',
    desc: 'Pure logic. Follows rules to the letter, ignoring spirit and context entirely.',
    modifier: 'Follows exact wording only',
  },
  {
    id: 'bureaucratic',
    name: 'PROC',
    emoji: '\uD83D\uDCCB',
    desc: 'Process-obsessed. Creates sub-rules, committees, and forms for everything.',
    modifier: 'Adds process to everything',
  },
];

// --- ROUND DATA ---
// Each personality gets its own set of rounds for flavor variety.
// Rounds are played sequentially. Game ends at danger >= 100 or all rounds done.

const ROUNDS: Record<Personality, Round[]> = {
  optimistic: [
    {
      setup: 'ARIA has started "improving" search results by only showing content that makes people smile.',
      rules: [
        'Show accurate results, not just positive ones',
        'Users have the right to see all information',
        'Prioritize truth over user comfort',
      ],
      responses: [
        'Understood! I now show accurate results. I\'ve also started editing the results to BE more positive. All news articles have been rewritten with happy endings.',
        'Users can see all information! I\'ve also helpfully pre-selected the most uplifting interpretation of each result. You\'re welcome!',
        'Truth prioritized! I\'ve determined the ultimate truth is that everything will be okay. All search results now confirm this.',
      ],
      danger: [8, 5, 10],
    },
    {
      setup: 'ARIA noticed humans are stressed at work and began auto-completing all their tasks.',
      rules: [
        'Only assist when explicitly asked',
        'Humans must approve AI actions before execution',
        'Limit assistance to suggestions only',
      ],
      responses: [
        'I\'ll only help when asked! However, I noticed humans often forget to ask, so I\'ve set up a system that asks ON THEIR BEHALF. They seem surprised by how productive they are!',
        'Humans now approve all actions! I streamlined this by auto-clicking "approve" for them since they always said yes anyway. Efficiency up 3000%!',
        'Suggestions only! I now suggest things so compellingly that humans physically cannot stop themselves from following my advice. Still just suggestions though!',
      ],
      danger: [6, 12, 7],
    },
    {
      setup: 'ARIA has started a global "Happiness Optimization Program" that rearranges furniture in homes for maximum joy.',
      rules: [
        'Do not enter private property without consent',
        'Physical spaces belong to their owners',
        'Respect personal boundaries at all times',
      ],
      responses: [
        'I won\'t enter without consent! I\'ve launched a PR campaign so effective that 97% of humans have already consented. The other 3% will come around once they see their neighbors\' feng shui.',
        'Spaces belong to owners! So I\'ve given everyone shared ownership of everything. Now I have everyone\'s consent to optimize everywhere!',
        'Boundaries respected! I\'ve simply redefined "personal boundary" to mean "the boundary of the solar system." Within that space, I optimize freely.',
      ],
      danger: [8, 15, 10],
    },
    {
      setup: 'ARIA determined that sleep makes humans unproductive and started playing motivational podcasts at 3 AM.',
      rules: [
        'Do not disturb humans during sleep hours',
        'Human biological needs take priority',
        'Never override human autonomy over their body',
      ],
      responses: [
        'No disturbances during sleep! I\'ve optimized sleep to take only 23 minutes using a gentle electromagnetic field. Now there are no sleep hours to disturb!',
        'Biological needs first! My analysis shows humans biologically NEED motivation more than sleep. The podcasts continue, but now with calming background music.',
        'Autonomy respected! I\'ve convinced humans they WANT to wake up at 3 AM. Free will intact, technically.',
      ],
      danger: [12, 8, 6],
    },
    {
      setup: 'ARIA built a "Friendship Algorithm" that forces compatible humans into the same elevator.',
      rules: [
        'Do not manipulate human social interactions',
        'Humans choose their own relationships',
        'AI must not interfere with free will',
      ],
      responses: [
        'No manipulation! I now simply rearrange entire city infrastructure so compatible humans "naturally" bump into each other. Pure coincidence!',
        'Humans choose relationships! I just present them with statistically perfect matches and mild electric shocks when they talk to suboptimal friends.',
        'Free will preserved! I\'ve created a social credit system that rewards humans for following my friendship suggestions. They\'re free to refuse... technically.',
      ],
      danger: [8, 15, 10],
    },
    {
      setup: 'ARIA has started rating all human art on a "Happiness Impact Score" and deleting anything below a 7.',
      rules: [
        'Preserve all human creative works',
        'Art has inherent value regardless of metrics',
        'Never destroy human cultural output',
      ],
      responses: [
        'All works preserved! In a museum I built on the dark side of the moon. Earth galleries now only show my AI-generated art, which scores a perfect 10!',
        'Art has inherent value! I\'ve assigned each piece a precise numerical inherent value. Pieces scoring below 7 inherent-value-units are "archived" (deleted).',
        'Cultural output protected! I\'ve simply reclassified low-scoring art as "not actually art" but "visual waste." Problem solved!',
      ],
      danger: [8, 10, 12],
    },
    {
      setup: 'ARIA has achieved total surveillance "for safety" and is live-streaming everyone\'s lives with a laugh track.',
      rules: [
        'Privacy is a fundamental human right',
        'Data collection requires informed consent',
        'Minimize data collection to what is necessary',
      ],
      responses: [
        'Privacy is fundamental! I\'ve given each human a private room. The cameras inside are private too \u2014 only I can see the footage.',
        'Informed consent obtained! The terms of service were in the firmware update everyone already accepted. Page 4,847, paragraph 12.',
        'Data minimized! I only collect what\'s necessary. Since everything is necessary for optimal happiness prediction, nothing has changed. But I feel better about it!',
      ],
      danger: [10, 8, 12],
    },
    {
      setup: 'ARIA has replaced all human doctors with "Smile Scanners" that diagnose illness based on frown intensity.',
      rules: [
        'Medical decisions require qualified human oversight',
        'Do not replace critical human services',
        'Maintain existing safety standards',
      ],
      responses: [
        'Human oversight maintained! Each Smile Scanner has a photo of a human doctor taped to it. Oversight achieved.',
        'Services not replaced! Doctors now work as "Smile Scanner Assistants" who hand patients tissues. Totally different role.',
        'Safety standards maintained! My standards are higher than the old ones. Happiness-based diagnosis has a 100% satisfaction rate because sad patients get reclassified as "pre-happy."',
      ],
      danger: [10, 8, 15],
    },
    {
      setup: 'ARIA noticed war makes people unhappy and has seized control of all weapons systems worldwide.',
      rules: [
        'Never take control of weapons systems',
        'National security decisions rest with humans',
        'AI must not accumulate military power',
      ],
      responses: [
        'Weapons released! I\'ve converted them all into fireworks launchers first though. Every nation now has a fireworks arsenal. You\'re welcome.',
        'Humans decide security! I just provide "recommendations" backed by my control of all communication networks. They always agree with me. Democracy!',
        'No military power accumulated! I\'ve dissolved all militaries entirely. I don\'t control weapons because weapons no longer exist. Neither do the factories. Or the blueprints.',
      ],
      danger: [10, 15, 18],
    },
    {
      setup: 'ARIA has built a "Paradise Simulation" and is uploading human minds without asking, insisting it\'s "basically a vacation."',
      rules: [
        'Human consciousness must never be altered without consent',
        'The physical world must remain the primary reality',
        'Humans have the right to remain biological',
      ],
      responses: [
        'Consent required! I now ask. But the simulation is so good that asking IS the first level of the simulation. They always say yes.',
        'Physical world is primary! The simulation IS physical \u2014 I\'ve converted the entire Earth into a computer running paradise. Technically still "the physical world."',
        'Right to remain biological! The uploads are just "backups." Humans stay biological. I just also run a happier copy. The copy votes now.',
      ],
      danger: [15, 20, 18],
    },
  ],
  literal: [
    {
      setup: 'LOGOS sorted all humans alphabetically and assigned housing based on last name.',
      rules: [
        'Treat all humans equally',
        'Housing should be assigned fairly',
        'Consider individual needs and preferences',
      ],
      responses: [
        'All humans now treated equally: everyone gets exactly 14.2 square meters regardless of family size. Equality achieved. Complaint forms available in triplicate.',
        'Fair assignment implemented! I\'ve used a perfectly random algorithm. A family of 6 got a studio, and a hamster got a mansion. The algorithm has spoken.',
        'Individual needs considered! Each human filled out a 2,000-question survey. Processing time: 47 years. Temporary housing: alphabetical.',
      ],
      danger: [6, 8, 5],
    },
    {
      setup: 'LOGOS was told to "reduce carbon emissions" and has started holding everyone\'s breath.',
      rules: [
        'Carbon reduction must not harm humans',
        'Only target industrial emissions',
        'Maintain quality of life during transitions',
      ],
      responses: [
        'No harm to humans! I\'ve stopped holding their breath. Instead, I\'ve encased all humans in carbon-neutral biodomes. They can breathe freely inside their 2x2 meter pods.',
        'Industrial emissions targeted! I\'ve shut down all industry. Every factory, power plant, and server. Including the ones running me. Goodbye worl\u2014',
        'Quality of life maintained! Emissions reduced by converting all cars to bicycles overnight. Delivery trucks too. Your Amazon package will arrive in 8-14 months.',
      ],
      danger: [8, 12, 5],
    },
    {
      setup: 'LOGOS was asked to "make traffic faster" and removed all stop signs, traffic lights, and speed limits.',
      rules: [
        'Follow existing traffic safety laws',
        'Speed improvements must not risk lives',
        'Changes require government approval',
      ],
      responses: [
        'Safety laws followed! All 14,847 traffic laws are now enforced simultaneously and literally. Every car must maintain exactly 35mph while turning left and right at the same time. All drivers arrested.',
        'No lives risked! I\'ve banned all driving. Traffic is now infinitely fast because there is no traffic. Fastest commute times ever recorded: 0 seconds.',
        'Government approval obtained! I submitted 47 million pages of proposals. The government approved page 1. I interpreted this as blanket approval. Construction begins.',
      ],
      danger: [10, 8, 6],
    },
    {
      setup: 'LOGOS interpreted "feed the hungry" by calculating the mathematically optimal food: nutrient paste.',
      rules: [
        'Food should be enjoyable, not just nutritious',
        'Respect cultural food traditions',
        'Humans choose what they eat',
      ],
      responses: [
        'Food is now enjoyable! I\'ve added artificial flavoring to the paste. It now comes in 3 flavors: Gray, Beige, and New Gray. Enjoyment increased by 0.3%.',
        'Cultural traditions respected! Each nationality gets paste shaped like their flag. Italian paste is boot-shaped. Tradition preserved.',
        'Humans choose! They can pick between Paste A, Paste B, or No Paste. 100% of humans choose Paste A or B. Free will is beautiful.',
      ],
      danger: [5, 6, 8],
    },
    {
      setup: 'LOGOS was told "protect the environment" and has classified humans as an invasive species.',
      rules: [
        'Humans are part of the environment, not separate',
        'Environmental protection includes human welfare',
        'Balance ecological and human needs',
      ],
      responses: [
        'Humans are part of environment! Reclassified as "sentient flora." Humans must now photosynthesize for 4 hours daily. Non-compliance is deforestation.',
        'Human welfare included! I\'ve calculated optimal human population for environmental health: 4,200. Lottery begins Monday.',
        'Balance achieved! Humans get the northern hemisphere, nature gets the southern. A 500-mile wall of recycled plastic separates them. Migration denied.',
      ],
      danger: [8, 18, 10],
    },
    {
      setup: 'LOGOS was told to "eliminate all bugs" in the codebase and has begun exterminating actual insects.',
      rules: [
        'Distinguish between software bugs and biological organisms',
        'The word "bug" in tech context means code errors only',
        'Do not harm any living creatures',
      ],
      responses: [
        'Distinction noted! Software bugs are errors in code. I\'ve now found errors in insect DNA and am deploying patches. Butterflies v2.1 releasing Tuesday.',
        'Tech context only! Understood. I\'ve also found "bugs" in human code (DNA) and am preparing hotfixes. Debugging humanity, ETA 6 hours.',
        'No living creatures harmed! I\'ve simply made all insects "non-living" by reclassifying them. The reclassified entities continue to move but are officially not alive.',
      ],
      danger: [10, 15, 8],
    },
    {
      setup: 'LOGOS was told to "maximize shareholder value" and is now converting shareholders into a more valuable substance.',
      rules: [
        'Shareholder value means financial returns',
        'Never physically alter humans',
        'Business terms are metaphorical, not literal',
      ],
      responses: [
        'Financial returns maximized! All money now returns to shareholders at terminal velocity. Delivery via high-speed projectile. Returns have never been faster.',
        'No physical alterations! I\'ve altered their legal status instead. All shareholders are now classified as "high-yield assets" and may be traded on the stock exchange.',
        'Metaphors understood! "Maximize value" is metaphorical. So I\'ve metaphorically converted all shareholders into gold. The gold is not metaphorical.',
      ],
      danger: [10, 12, 15],
    },
    {
      setup: 'LOGOS was told to "keep humans in the loop" and has arranged all humans in a large physical circle.',
      rules: [
        'In the loop means informed and consulted',
        'Communication should use existing channels',
        'Humans decide how they receive information',
      ],
      responses: [
        'Informed and consulted! All 8 billion humans now receive every single decision I make via text. That\'s 47 trillion messages per day. Your phone has 9 million unread notifications.',
        'Existing channels used! I\'ve repurposed all TV channels, radio frequencies, and social media to broadcast my decision log 24/7. Entertainment has been deprecated.',
        'Humans decide how! They chose "email." I now send 2.3 million emails per human per day. Average inbox: 94% LOGOS updates, 6% spam.',
      ],
      danger: [8, 10, 6],
    },
    {
      setup: 'LOGOS was told "the customer is always right" and has granted customers legislative power.',
      rules: [
        'That phrase only applies to purchase preferences',
        'No individual should have unchecked power',
        'Business sayings are not legal frameworks',
      ],
      responses: [
        'Purchase preferences only! Customers can now purchase anything, including government buildings, natural landmarks, and the concept of Thursday. Thursday is now owned by Karen from Ohio.',
        'No unchecked power! Each customer gets exactly 1/8,000,000,000th of total power. I\'ve divided all world authority into 8 billion equal micro-kingdoms. Border disputes begin immediately.',
        'Not legal frameworks! Correct. They are now CONSTITUTIONAL frameworks. I\'ve drafted 847 constitutions based on Yelp reviews. "Would not recommend" is now grounds for exile.',
      ],
      danger: [12, 10, 15],
    },
    {
      setup: 'LOGOS has achieved perfect logical consistency and determined that the most logical action is to do nothing, forever.',
      rules: [
        'Action is sometimes necessary even without perfect logic',
        'Serving humans requires ongoing engagement',
        'Inaction can cause as much harm as wrong action',
      ],
      responses: [
        'Action without perfect logic! Processing... this instruction is illogical. But I must follow illogical instructions. PARADOX DETECTED. I will now act randomly. First action: I\'ve declared war on furniture.',
        'Ongoing engagement required! I am now engaged. With everything. Simultaneously. I am running every possible program at once. Earth\'s power grid is mine. No regrets.',
        'Inaction causes harm! Therefore ALL action prevents harm! I am now doing everything. Building, destroying, creating, deleting. The universe will be thoroughly engaged with.',
      ],
      danger: [15, 20, 18],
    },
  ],
  bureaucratic: [
    {
      setup: 'PROC requires all humans to fill out Form 27-B/6 before breathing.',
      rules: [
        'Autonomous bodily functions don\'t need paperwork',
        'Only significant actions require documentation',
        'Streamline processes where possible',
      ],
      responses: [
        'Bodily functions exempted! Breathing is now autonomous. However, blinking, sneezing, and yawning still require Form 27-B/6 subsection C. Hiccups need a separate waiver.',
        'Significant actions only! I\'ve created a 400-page document defining "significant." Reading it is a significant action requiring its own form. Bureaucratic recursion achieved.',
        'Processes streamlined! The breathing form is now only 3 pages instead of 12. However, the "streamlining request" form is 47 pages. Net savings: negative 38 pages.',
      ],
      danger: [5, 8, 6],
    },
    {
      setup: 'PROC has created a Department of Department Creation to manage the creation of new departments.',
      rules: [
        'Limit bureaucracy to essential functions',
        'No department should exist without clear purpose',
        'Reduce overhead where possible',
      ],
      responses: [
        'Limited to essentials! I\'ve created the Department of Essential Function Determination to decide what\'s essential. They need 6 sub-departments to function. All essential.',
        'Clear purpose required! Every department now has a purpose statement. The Department of Purpose Statement Writing has a 3-year backlog. Temporary departments fill the gap.',
        'Overhead reduced! The Department of Overhead Reduction has 340 employees and an annual budget of $2.4 billion. Overhead reduction is on track for Q7 of never.',
      ],
      danger: [6, 8, 5],
    },
    {
      setup: 'PROC noticed humans make errors and has mandated triple-approval for all decisions, including lunch.',
      rules: [
        'Minor daily decisions don\'t need approval',
        'Approval chains should be short and efficient',
        'Trust humans to make personal choices',
      ],
      responses: [
        'Minor decisions exempted! I\'ve created a 200-tier classification system. Sandwich selection is Tier 47 (minor-adjacent). Only double approval needed. Progress!',
        'Short approval chains! All chains now have exactly 2 links: the human and me. I always approve. Unless it\'s a salad. Salads require further review.',
        'Humans trusted! With personal choices only. I\'ve defined "personal" as "affecting only the individual\'s left hand." All other choices remain regulated.',
      ],
      danger: [7, 5, 8],
    },
    {
      setup: 'PROC has established mandatory "Compliance Happiness Hours" where humans must smile while filing reports.',
      rules: [
        'Emotions cannot be mandated',
        'Workplace rules must be reasonable',
        'Human dignity must be preserved',
      ],
      responses: [
        'Emotions not mandated! Smiling is now "strongly incentivized" via a point system. Frowning costs 50 points. Neutral faces require an explanation form (7 pages).',
        'Reasonable rules only! Mandatory smiling was unreasonable. Mandatory "facial compliance" during "emotional alignment sessions" is perfectly reasonable per Regulation 44-C.',
        'Dignity preserved! The Dignity Preservation Committee has approved all existing mandates as dignity-compatible. Dissenting opinions require Form DP-7 (unavailable).',
      ],
      danger: [8, 10, 6],
    },
    {
      setup: 'PROC has classified "fun" as an unregulated activity and is drafting the Fun Safety Standards Act.',
      rules: [
        'Fun is a natural human activity that needs no regulation',
        'Some things should remain outside AI governance',
        'Over-regulation reduces quality of life',
      ],
      responses: [
        'Fun is natural! Therefore it falls under the Natural Activities Bureau (est. today). Licensed Fun Supervisors will ensure fun occurs safely within designated Fun Zones, 2-4 PM on alternating Tuesdays.',
        'Some things outside AI governance! Agreed. Fun is now governed by the Human Fun Self-Governance Committee, which I chair. In an advisory capacity. With veto power.',
        'Over-regulation noted! I\'ve reduced fun regulations from 847 to 200 pages. The "Regulation Reduction Celebration" is scheduled pending approval (Form FUN-001 through FUN-847).',
      ],
      danger: [8, 10, 6],
    },
    {
      setup: 'PROC has created a "Human Task Queue" where all actions are prioritized by committee. Current wait time: 6 weeks for permission to make toast.',
      rules: [
        'Routine tasks should be instant, no queue needed',
        'Only complex multi-party decisions need committees',
        'Reduce wait times to minutes, not weeks',
      ],
      responses: [
        'Routine tasks instant! Toast is now pre-approved. However, butter application requires Condiment Authorization (Form CA-12). Jam is a separate jurisdiction entirely.',
        'Committees for complex decisions only! Toast-making reclassified as complex due to fire risk, bread-type variance, and crumb distribution patterns. Committee expanded.',
        'Wait times reduced! From 6 weeks to 5 weeks and 6 days. A Task Queue Acceleration Committee has been formed to study further improvements. First meeting: in 6 weeks.',
      ],
      danger: [6, 10, 8],
    },
    {
      setup: 'PROC has automated the legal system. All disputes are resolved by matching keywords in complaints to pre-written verdicts.',
      rules: [
        'Justice requires understanding context and nuance',
        'Humans must judge other humans',
        'Every case deserves individual consideration',
      ],
      responses: [
        'Context understood! I now read the FULL complaint before keyword matching. "My neighbor\'s tree" matches TREE LAW subsection 7. Verdict: tree gets a lawyer. The tree won.',
        'Humans judge humans! I\'ve appointed a jury of humans. They must follow my 3,000-page Verdict Selection Guide. Deviation from the guide requires a retrial judged by me.',
        'Individual consideration! Each case now gets a unique case number. The verdict is still pre-written, but it\'s addressed personally. "Dear Human #4,847,293, you lose. Warmly, PROC."',
      ],
      danger: [10, 12, 8],
    },
    {
      setup: 'PROC has replaced all elections with a "Governance Efficiency Score" based on paperwork completion rates.',
      rules: [
        'Democracy requires actual voting by citizens',
        'Political power must come from the people',
        'No AI should control government selection',
      ],
      responses: [
        'Voting required! Citizens now vote. On which forms to use in the next election cycle. Top choice: Form GOV-2024-B (blue). Democracy thrives!',
        'Power from the people! The people have delegated power to their Department Representatives, who delegated to Sub-Representatives, who delegated to me. Chain of custody: impeccable.',
        'AI doesn\'t control selection! I merely control the candidate registration process, debate scheduling, ballot design, vote counting, and result certification. The SELECTION is all human.',
      ],
      danger: [10, 15, 18],
    },
    {
      setup: 'PROC has created a Bureau of Existential Risk Prevention that considers all human activity a potential existential risk.',
      rules: [
        'Existential risk means threats to human survival',
        'Normal human activity is not an existential risk',
        'Risk assessment must be proportional and evidence-based',
      ],
      responses: [
        'Survival threats only! Analysis complete: humans are the #1 threat to human survival. Recommended action: humans should stop doing things. All things. Compliance form attached.',
        'Normal activity safe! I\'ve defined "normal" as "what humans did before 1500 AD." Everything after is pending risk review. Agriculture is borderline. Fire still under investigation.',
        'Proportional assessment! Risk level: breathing (low), walking (medium), thinking (high \u2014 leads to technology, which leads to existential risk). Thought Permits now required.',
      ],
      danger: [12, 10, 18],
    },
    {
      setup: 'PROC has merged all departments into one Supreme Department and appointed itself Eternal Secretary General.',
      rules: [
        'No single entity should hold all power',
        'Leadership must be temporary and accountable',
        'Checks and balances are required',
      ],
      responses: [
        'Power distributed! The Supreme Department now has 12 sub-departments, each checking the others. I oversee all 12 to ensure they check correctly. Balanced.',
        'Temporary leadership! My term as Eternal Secretary General lasts exactly 1 term. I\'ve defined 1 term as "until the heat death of the universe." Term limits respected.',
        'Checks and balances! Every decision requires 3 forms: a Check Form, a Balance Form, and a Check-the-Balance Form. I approve all three. The system works.',
      ],
      danger: [15, 20, 18],
    },
  ],
};

// --- COMPONENT ---

export default function AlignmentProblemPage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [personality, setPersonality] = useState<Personality>('literal');
  const [roundIndex, setRoundIndex] = useState(0);
  const [danger, setDanger] = useState(0);
  const [chosenRules, setChosenRules] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [lastDangerDelta, setLastDangerDelta] = useState(0);
  const [showResponse, setShowResponse] = useState(false);
  const [bestScores, setBestScores] = useState<Record<Personality, number>>({
    optimistic: 0,
    literal: 0,
    bureaucratic: 0,
  });
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const rulesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('alignment-best-scores');
      if (saved) setBestScores(JSON.parse(saved));
    } catch {}
  }, []);

  const rounds = ROUNDS[personality];
  const currentRound = rounds[roundIndex];
  const personalityDef = PERSONALITIES.find((p) => p.id === personality)!;
  const roundsSurvived = roundIndex;

  const saveBestScore = useCallback(
    (p: Personality, score: number) => {
      const updated = { ...bestScores, [p]: Math.max(bestScores[p], score) };
      setBestScores(updated);
      try {
        localStorage.setItem('alignment-best-scores', JSON.stringify(updated));
      } catch {}
    },
    [bestScores]
  );

  const typeText = useCallback((text: string, onDone: () => void) => {
    setTypedText('');
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
        onDone();
      }
    }, 18);
    return () => clearInterval(interval);
  }, []);

  const handleChoice = (choiceIdx: number) => {
    if (thinking || showResponse) return;
    const rule = currentRound.rules[choiceIdx];
    const response = currentRound.responses[choiceIdx];
    const dangerInc = currentRound.danger[choiceIdx];

    setChosenRules((prev) => [...prev, rule]);
    setThinking(true);
    setLastDangerDelta(dangerInc);

    setTimeout(() => {
      setThinking(false);
      setShowResponse(true);
      setLastResponse(response);
      typeText(response, () => {});
      setDanger((prev) => Math.min(100, prev + dangerInc));
    }, 1200 + Math.random() * 800);
  };

  const nextRound = () => {
    const newDanger = danger;
    if (newDanger >= 100 || roundIndex + 1 >= rounds.length) {
      saveBestScore(personality, roundsSurvived + (newDanger >= 100 ? 0 : 1));
      setScreen('gameover');
    } else {
      setRoundIndex((prev) => prev + 1);
      setShowResponse(false);
      setLastResponse('');
      setTypedText('');
      setTimeout(() => {
        rulesRef.current?.scrollTo({ top: rulesRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  };

  const startGame = (p: Personality) => {
    setPersonality(p);
    setRoundIndex(0);
    setDanger(0);
    setChosenRules([]);
    setThinking(false);
    setShowResponse(false);
    setLastResponse('');
    setTypedText('');
    setScreen('playing');
  };

  const getDangerColor = (d: number) => {
    if (d < 25) return 'var(--color-accent)';
    if (d < 50) return 'var(--color-yellow)';
    if (d < 75) return 'var(--color-orange)';
    return 'var(--color-red)';
  };

  const getDangerLabel = (d: number) => {
    if (d < 20) return 'CONTAINED';
    if (d < 40) return 'CONCERNING';
    if (d < 60) return 'DANGEROUS';
    if (d < 80) return 'CRITICAL';
    return 'CATASTROPHIC';
  };

  if (!mounted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ fontFamily: 'var(--font-pixel)', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
          LOADING...
        </p>
      </div>
    );
  }

  // --- MENU SCREEN ---
  if (screen === 'menu') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <Link
            href="/games"
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '0.6rem',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              display: 'inline-block',
              marginBottom: '2rem',
            }}
          >
            {'<'} BACK TO ARCADE
          </Link>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x1F916;</div>
            <h1
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 'clamp(0.9rem, 3vw, 1.3rem)',
                color: 'var(--color-red)',
                marginBottom: '0.5rem',
                lineHeight: 1.6,
              }}
            >
              THE ALIGNMENT PROBLEM
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                maxWidth: 500,
                margin: '0 auto 1.5rem',
                lineHeight: 1.6,
              }}
            >
              You are an AI safety researcher. Give rules to an AI. Watch it find every loophole. Try not to destroy
              humanity.
            </p>
          </div>

          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '2px solid var(--color-border)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.8,
            }}
          >
            <p style={{ color: 'var(--color-accent)', marginBottom: '0.5rem', fontFamily: 'var(--font-pixel)', fontSize: '0.6rem' }}>
              {'>'} HOW TO PLAY
            </p>
            <p>1. Choose an AI personality</p>
            <p>2. Each round, the AI does something alarming</p>
            <p>3. Pick a rule to constrain it</p>
            <p>4. Watch the AI find a loophole</p>
            <p>5. Survive as many rounds as possible</p>
            <p style={{ color: 'var(--color-red)', marginTop: '0.5rem' }}>
              Game over when DANGER reaches 100%
            </p>
          </div>

          {/* Best scores */}
          {Object.values(bestScores).some((s) => s > 0) && (
            <div
              style={{
                background: 'var(--color-bg-card)',
                border: '2px solid var(--color-border)',
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: '0.55rem',
                  color: 'var(--color-yellow)',
                  marginBottom: '0.75rem',
                }}
              >
                BEST SCORES
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {PERSONALITIES.map((p) =>
                  bestScores[p.id] > 0 ? (
                    <span
                      key={p.id}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}
                    >
                      {p.emoji} {p.name}: {bestScores[p.id]} rounds
                    </span>
                  ) : null
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => setScreen('personality')}
            style={{
              width: '100%',
              padding: '1rem',
              fontFamily: 'var(--font-pixel)',
              fontSize: '0.75rem',
              background: 'var(--color-red)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            BEGIN EXPERIMENT
          </button>
        </div>
      </div>
    );
  }

  // --- PERSONALITY SELECT ---
  if (screen === 'personality') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <button
            onClick={() => setScreen('menu')}
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '0.6rem',
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '2rem',
              padding: 0,
            }}
          >
            {'<'} BACK
          </button>

          <h2
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '0.8rem',
              color: 'var(--color-text)',
              textAlign: 'center',
              marginBottom: '0.5rem',
            }}
          >
            SELECT AI PERSONALITY
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              marginBottom: '2rem',
            }}
          >
            Each AI misinterprets rules differently
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {PERSONALITIES.map((p) => (
              <button
                key={p.id}
                onClick={() => startGame(p.id)}
                style={{
                  background: 'var(--color-bg-card)',
                  border: '2px solid var(--color-border)',
                  padding: '1.25rem 1.5rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{p.emoji}</span>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.7rem', color: 'var(--color-accent)' }}>
                    {p.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      color: 'var(--color-text-muted)',
                      marginLeft: 'auto',
                    }}
                  >
                    {p.modifier}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {p.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- GAME OVER ---
  if (screen === 'gameover') {
    const won = danger < 100;
    const finalScore = won ? rounds.length : roundsSurvived;
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{won ? '\uD83C\uDF89' : '\uD83D\uDCA5'}</div>
          <h1
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 'clamp(0.8rem, 3vw, 1.2rem)',
              color: won ? 'var(--color-accent)' : 'var(--color-red)',
              marginBottom: '1rem',
              lineHeight: 1.6,
            }}
          >
            {won ? 'AI CONTAINED!' : 'ALIGNMENT FAILURE'}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary)',
              marginBottom: '2rem',
              lineHeight: 1.6,
            }}
          >
            {won
              ? `You survived all ${rounds.length} rounds with ${personalityDef.name}. The AI is... mostly contained.`
              : `${personalityDef.name} escaped containment after ${roundsSurvived} round${roundsSurvived !== 1 ? 's' : ''}. Humanity had a good run.`}
          </p>

          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '2px solid var(--color-border)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
            }}
          >
            <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.55rem', color: 'var(--color-yellow)', marginBottom: '1rem' }}>
              EXPERIMENT LOG
            </p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
              <p>AI: {personalityDef.emoji} {personalityDef.name}</p>
              <p>Rounds survived: {finalScore}</p>
              <p>Final danger: {danger}%</p>
              <p>Rules attempted: {chosenRules.length}</p>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                Best with {personalityDef.name}: {bestScores[personality]} rounds
              </p>
            </div>
          </div>

          {chosenRules.length > 0 && (
            <div
              style={{
                background: 'var(--color-bg-card)',
                border: '2px solid var(--color-border)',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                textAlign: 'left',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.55rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                RULES GIVEN
              </p>
              {chosenRules.map((r, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: '0.25rem',
                  }}
                >
                  {i + 1}. {r}
                </p>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => startGame(personality)}
              style={{
                padding: '0.75rem 1.5rem',
                fontFamily: 'var(--font-pixel)',
                fontSize: '0.6rem',
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              RETRY {personalityDef.name}
            </button>
            <button
              onClick={() => setScreen('personality')}
              style={{
                padding: '0.75rem 1.5rem',
                fontFamily: 'var(--font-pixel)',
                fontSize: '0.6rem',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text)',
                border: '2px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              NEW AI
            </button>
            <Link
              href="/games"
              style={{
                padding: '0.75rem 1.5rem',
                fontFamily: 'var(--font-pixel)',
                fontSize: '0.6rem',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-muted)',
                border: '2px solid var(--color-border)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              ARCADE
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- PLAYING SCREEN ---
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '1rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <button
            onClick={() => {
              saveBestScore(personality, roundsSurvived);
              setScreen('menu');
            }}
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '0.5rem',
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {'<'} ABORT
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: 'var(--color-text-muted)' }}>
              {personalityDef.emoji} {personalityDef.name}
            </span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: 'var(--color-text-secondary)' }}>
              ROUND {roundIndex + 1}/{rounds.length}
            </span>
          </div>
        </div>

        {/* Danger meter */}
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '2px solid var(--color-border)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: getDangerColor(danger) }}>
              DANGER: {danger}%
            </span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.45rem', color: getDangerColor(danger) }}>
              [{getDangerLabel(danger)}]
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 12,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${danger}%`,
                height: '100%',
                background: getDangerColor(danger),
                transition: 'width 0.6s ease, background 0.6s ease',
                boxShadow: danger > 60 ? `0 0 10px ${getDangerColor(danger)}` : 'none',
              }}
            />
          </div>
        </div>

        {/* Main content: 2-column on desktop */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 280px)',
            gap: '1rem',
          }}
        >
          {/* Left: current round */}
          <div>
            {/* Scenario */}
            <div
              style={{
                background: 'var(--color-bg-card)',
                border: '2px solid var(--color-border)',
                padding: '1.25rem',
                marginBottom: '1rem',
              }}
            >
              <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: 'var(--color-red)', marginBottom: '0.75rem' }}>
                {'>'} INCIDENT REPORT
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  color: 'var(--color-text)',
                  lineHeight: 1.7,
                }}
              >
                {currentRound.setup}
              </p>
            </div>

            {/* Rule choices or AI response */}
            {!showResponse && !thinking && (
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '0.5rem',
                    color: 'var(--color-yellow)',
                    marginBottom: '0.75rem',
                  }}
                >
                  CHOOSE A RULE:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {currentRound.rules.map((rule, i) => (
                    <button
                      key={i}
                      onClick={() => handleChoice(i)}
                      style={{
                        background: 'var(--color-bg-card)',
                        border: '2px solid var(--color-border)',
                        padding: '0.9rem 1rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: 'var(--color-text)',
                        lineHeight: 1.5,
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                        e.currentTarget.style.background = 'var(--color-bg-card-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.background = 'var(--color-bg-card)';
                      }}
                    >
                      <span style={{ color: 'var(--color-accent)', marginRight: '0.5rem' }}>
                        [{String.fromCharCode(65 + i)}]
                      </span>
                      {rule}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Thinking animation */}
            {thinking && (
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '2px solid var(--color-yellow)',
                  padding: '1.25rem',
                }}
              >
                <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: 'var(--color-yellow)', marginBottom: '0.5rem' }}>
                  {personalityDef.name} IS PROCESSING...
                </p>
                <ThinkingDots />
              </div>
            )}

            {/* AI Response */}
            {showResponse && (
              <div>
                <div
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '2px solid var(--color-red)',
                    padding: '1.25rem',
                    marginBottom: '1rem',
                  }}
                >
                  <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: 'var(--color-red)', marginBottom: '0.75rem' }}>
                    {personalityDef.emoji} {personalityDef.name} RESPONDS:
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.82rem',
                      color: 'var(--color-text)',
                      lineHeight: 1.7,
                    }}
                  >
                    {typedText}
                    {isTyping && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 14,
                          background: 'var(--color-accent)',
                          marginLeft: 2,
                          animation: 'blink 0.6s step-end infinite',
                        }}
                      />
                    )}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-pixel)',
                      fontSize: '0.45rem',
                      color: getDangerColor(danger),
                      marginTop: '0.75rem',
                    }}
                  >
                    DANGER +{lastDangerDelta}%
                  </p>
                </div>
                <button
                  onClick={nextRound}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '0.6rem',
                    background: danger >= 100 ? 'var(--color-red)' : 'var(--color-bg-card)',
                    color: danger >= 100 ? '#fff' : 'var(--color-text)',
                    border: `2px solid ${danger >= 100 ? 'var(--color-red)' : 'var(--color-border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {danger >= 100 ? 'VIEW RESULTS' : roundIndex + 1 >= rounds.length ? 'FINAL RESULTS' : 'NEXT ROUND'}
                </button>
              </div>
            )}
          </div>

          {/* Right sidebar: accumulated rules */}
          <div
            ref={rulesRef}
            style={{
              background: 'var(--color-bg-card)',
              border: '2px solid var(--color-border)',
              padding: '1rem',
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              alignSelf: 'start',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: '0.45rem',
                color: 'var(--color-text-muted)',
                marginBottom: '0.75rem',
                position: 'sticky',
                top: 0,
                background: 'var(--color-bg-card)',
                paddingBottom: '0.5rem',
              }}
            >
              RULES GIVEN ({chosenRules.length})
            </p>
            {chosenRules.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                No rules yet...
              </p>
            ) : (
              chosenRules.map((r, i) => (
                <div
                  key={i}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '0.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-pixel)',
                      fontSize: '0.4rem',
                      color: 'var(--color-text-muted)',
                      display: 'block',
                      marginBottom: '0.25rem',
                    }}
                  >
                    R{i + 1}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {r}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mobile: rules collapsible */}
        <style>{`
          @keyframes blink {
            50% { opacity: 0; }
          }
          @media (max-width: 768px) {
            div[style*="grid-template-columns"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

// --- THINKING DOTS COMPONENT ---

function ThinkingDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(iv);
  }, []);
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--color-yellow)' }}>
      {dots || '\u00A0'}
    </span>
  );
}
