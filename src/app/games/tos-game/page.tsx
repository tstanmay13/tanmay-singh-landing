'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// TYPES
// ============================================================

interface Clause {
  id: string;
  text: string;
  isAbsurd: boolean;
  category?: string;
}

interface TOSLevel {
  id: number;
  company: string;
  emoji: string;
  tagline: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  timeSeconds: number;
  clauses: Clause[];
}

interface LevelResult {
  levelId: number;
  correctFlags: number;
  missedAbsurd: number;
  falseFlags: number;
  totalAbsurd: number;
  score: number;
  timeRemaining: number;
}

interface SaveData {
  bestScores: Record<number, number>;
  totalScore: number;
  levelsCompleted: number[];
}

type GameScreen = 'menu' | 'levels' | 'playing' | 'results' | 'summary';

// ============================================================
// TOS DATA — 15 fictional companies
// ============================================================

const TOS_LEVELS: TOSLevel[] = [
  {
    id: 1,
    company: 'Friendr',
    emoji: '\uD83D\uDC6B',
    tagline: 'The Social Network That Really Gets You',
    difficulty: 'Easy',
    timeSeconds: 90,
    clauses: [
      { id: 'f1', text: 'Welcome to Friendr ("the Service"). By creating an account, you agree to the following Terms of Service. Please read these terms carefully before using our platform.', isAbsurd: false },
      { id: 'f2', text: 'You must be at least 13 years of age to use this Service. By agreeing to these Terms, you represent and warrant that you meet the minimum age requirement in your jurisdiction.', isAbsurd: false },
      { id: 'f3', text: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to notify Friendr immediately of any unauthorized use of your account.', isAbsurd: false },
      { id: 'f4', text: 'Friendr grants you a limited, non-exclusive, non-transferable license to access and use the Service for your personal, non-commercial purposes.', isAbsurd: false },
      { id: 'f5', text: 'By uploading content to Friendr, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display such content in connection with the Service.', isAbsurd: false },
      { id: 'f6', text: 'By using this Service, you grant Friendr an irrevocable license to your likeness, personality, and up to three (3) of your childhood memories, which may be used for marketing purposes in perpetuity.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'f7', text: 'You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, or impair the Service or interfere with other users\' enjoyment.', isAbsurd: false },
      { id: 'f8', text: 'Friendr reserves the right to assign you a "Friendship Score" which will be shared with potential employers, landlords, and romantic partners without prior notice.', isAbsurd: true, category: 'surveillance' },
      { id: 'f9', text: 'We may modify or discontinue the Service at any time without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.', isAbsurd: false },
      { id: 'f10', text: 'In the event you do not log in for 30 consecutive days, Friendr may post status updates on your behalf using our proprietary AI personality model trained on your previous activity.', isAbsurd: true, category: 'surveillance' },
      { id: 'f11', text: 'The Service may contain links to third-party websites. Friendr is not responsible for the content or practices of any linked third-party sites.', isAbsurd: false },
      { id: 'f12', text: 'Friendr\'s total liability to you for all claims arising from the use of the Service shall not exceed the amount you paid to Friendr in the twelve (12) months preceding the claim.', isAbsurd: false },
      { id: 'f13', text: 'You acknowledge that unfriending another user constitutes a legally binding severance of social obligations, and Friendr may charge a "Relationship Dissolution Fee" of $4.99 per unfriending.', isAbsurd: true, category: 'financial traps' },
      { id: 'f14', text: 'These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.', isAbsurd: false },
      { id: 'f15', text: 'By accepting these terms, you agree that in the event of a dispute, Friendr may settle the matter through a public poll of your mutual friends, the results of which shall be legally binding.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'f16', text: 'Friendr respects your privacy and handles your data in accordance with our Privacy Policy, which is incorporated into these Terms by reference.', isAbsurd: false },
    ],
  },
  {
    id: 2,
    company: 'CloudBrain',
    emoji: '\uD83E\uDDE0',
    tagline: 'AI-Powered Productivity for the Modern Mind',
    difficulty: 'Easy',
    timeSeconds: 90,
    clauses: [
      { id: 'cb1', text: 'CloudBrain ("we," "us," or "our") provides an artificial intelligence-powered productivity platform ("the Service"). These Terms of Service govern your access to and use of the Service.', isAbsurd: false },
      { id: 'cb2', text: 'You retain ownership of all content you create using the Service. CloudBrain claims no intellectual property rights over your original content.', isAbsurd: false },
      { id: 'cb3', text: 'User agrees that any original thoughts conceived while the CloudBrain app is installed on any device shall be considered derivative works of our intellectual property and subject to our exclusive licensing terms.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'cb4', text: 'CloudBrain uses industry-standard encryption and security measures to protect your data. However, no method of electronic storage is 100% secure.', isAbsurd: false },
      { id: 'cb5', text: 'You agree not to reverse-engineer, decompile, or disassemble any part of the Service. You shall not attempt to access the Service through any automated means.', isAbsurd: false },
      { id: 'cb6', text: 'CloudBrain reserves the right to monitor your typing speed, mouse movements, and screen time to calculate a "Productivity Shame Index" which may be displayed to your manager upon request.', isAbsurd: true, category: 'surveillance' },
      { id: 'cb7', text: 'We may send you service-related announcements from time to time. You may opt out of non-essential communications through your account settings.', isAbsurd: false },
      { id: 'cb8', text: 'CloudBrain offers both free and premium subscription tiers. Premium features are available for a monthly or annual subscription fee as displayed at the time of purchase.', isAbsurd: false },
      { id: 'cb9', text: 'In the event that our AI achieves sentience, you agree to treat it with the same professional courtesy you would extend to a human coworker, including but not limited to asking about its weekend.', isAbsurd: true, category: 'weird obligations' },
      { id: 'cb10', text: 'You may terminate your account at any time by contacting our support team. Upon termination, we will delete your data within 30 days in accordance with applicable law.', isAbsurd: false },
      { id: 'cb11', text: 'CloudBrain may update these Terms from time to time. We will notify you of any material changes by posting the revised Terms on our website.', isAbsurd: false },
      { id: 'cb12', text: 'By using the "Focus Mode" feature, you authorize CloudBrain to automatically decline all incoming calls, cancel social plans, and send passive-aggressive "I\'m busy" messages to contacts on your behalf.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'cb13', text: 'CloudBrain shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.', isAbsurd: false },
      { id: 'cb14', text: 'Any dispute arising under these Terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.', isAbsurd: false },
      { id: 'cb15', text: 'If the User is found to be using a competitor\'s product simultaneously, CloudBrain reserves the right to deduct a "Disloyalty Surcharge" of 15% from the User\'s linked bank account.', isAbsurd: true, category: 'financial traps' },
    ],
  },
  {
    id: 3,
    company: 'NomNom',
    emoji: '\uD83C\uDF55',
    tagline: 'Delicious Food, Delivered to Your Door (and Soul)',
    difficulty: 'Easy',
    timeSeconds: 85,
    clauses: [
      { id: 'nn1', text: 'NomNom operates a food delivery marketplace that connects users with local restaurants and delivery partners. By using NomNom, you agree to be bound by these Terms of Service.', isAbsurd: false },
      { id: 'nn2', text: 'NomNom acts as an intermediary between you and participating restaurants. We do not prepare food and are not responsible for the quality, safety, or accuracy of menu items.', isAbsurd: false },
      { id: 'nn3', text: 'Delivery times are estimated and may vary. NomNom shall not be held liable for delays caused by traffic, weather, or other circumstances beyond our control.', isAbsurd: false },
      { id: 'nn4', text: 'By placing an order, you authorize NomNom to charge your selected payment method for the total order amount including applicable taxes, delivery fees, and service charges.', isAbsurd: false },
      { id: 'nn5', text: 'NomNom reserves the right to access your smart refrigerator data to pre-order groceries it determines you need, charging your account automatically for items our algorithm deems "essential."', isAbsurd: true, category: 'financial traps' },
      { id: 'nn6', text: 'Tips are optional but encouraged. 100% of tips go directly to your delivery partner. NomNom does not retain any portion of gratuities.', isAbsurd: false },
      { id: 'nn7', text: 'You agree that any negative review scoring below three (3) stars must be accompanied by a formal 500-word apology letter to the restaurant, failure to provide which will result in review removal and a $25 "Rudeness Fee."', isAbsurd: true, category: 'weird obligations' },
      { id: 'nn8', text: 'NomNom may offer promotional discounts and credits at our discretion. Promotional offers are subject to additional terms and may be revoked at any time.', isAbsurd: false },
      { id: 'nn9', text: 'You may cancel an order within five minutes of placing it for a full refund. After this window, cancellation may be subject to a fee depending on order status.', isAbsurd: false },
      { id: 'nn10', text: 'User grants NomNom a perpetual license to their taste preferences, dietary data, and eating schedule, which NomNom may sell to insurance companies for the purpose of adjusting health premiums.', isAbsurd: true, category: 'surveillance' },
      { id: 'nn11', text: 'NomNom uses commercially reasonable efforts to ensure accurate menu pricing. In the event of a pricing error, NomNom reserves the right to cancel orders placed at an incorrect price.', isAbsurd: false },
      { id: 'nn12', text: 'You agree to receive the delivery at the specified address. If you are unavailable, the delivery partner may leave the order at the door per your delivery instructions.', isAbsurd: false },
      { id: 'nn13', text: 'By ordering more than three (3) times in a single day, you consent to NomNom dispatching a "Wellness Ambassador" to your home to discuss your life choices. This service is non-optional and billed at $75/hour.', isAbsurd: true, category: 'weird obligations' },
      { id: 'nn14', text: 'NomNom collects and processes your personal data as described in our Privacy Policy. You consent to such collection and processing by using the Service.', isAbsurd: false },
      { id: 'nn15', text: 'In the event of a dispute regarding your order, you agree that the delivery driver shall serve as the sole arbitrator, and their decision shall be final and legally binding.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'nn16', text: 'These Terms constitute the entire agreement between you and NomNom regarding the use of the Service and supersede any prior agreements.', isAbsurd: false },
    ],
  },
  {
    id: 4,
    company: 'FitByte',
    emoji: '\uD83C\uDFCB\uFE0F',
    tagline: 'Track Every Step. We Certainly Do.',
    difficulty: 'Medium',
    timeSeconds: 80,
    clauses: [
      { id: 'fb1', text: 'FitByte provides wearable fitness tracking hardware and accompanying software ("the Service"). These Terms govern your use of FitByte products and services.', isAbsurd: false },
      { id: 'fb2', text: 'The FitByte device collects health-related data including heart rate, step count, sleep patterns, and exercise activity. This data is stored securely in your FitByte account.', isAbsurd: false },
      { id: 'fb3', text: 'FitByte is not a medical device and should not be used to diagnose or treat any medical condition. Always consult a healthcare professional before beginning any exercise program.', isAbsurd: false },
      { id: 'fb4', text: 'By wearing the FitByte device during sleep, you grant FitByte full access to and ownership of your dreams, which may be archived, analyzed, and optionally adapted into screenplays for our streaming partners.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'fb5', text: 'FitByte offers a limited one-year warranty on hardware defects. This warranty does not cover damage from misuse, water exposure beyond rated depth, or normal wear and tear.', isAbsurd: false },
      { id: 'fb6', text: 'You may share your fitness data with friends through the FitByte social features. You control who can see your activity through your privacy settings.', isAbsurd: false },
      { id: 'fb7', text: 'FitByte reserves the right to vibrate the device aggressively at 3 AM if our algorithm determines you have been "insufficiently active," and you waive all claims related to sleep disruption, startlement, or cardiac events resulting therefrom.', isAbsurd: true, category: 'weird obligations' },
      { id: 'fb8', text: 'Subscription to FitByte Premium unlocks advanced analytics, personalized coaching, and additional watch faces. The subscription renews automatically unless cancelled 24 hours before renewal.', isAbsurd: false },
      { id: 'fb9', text: 'In the event your daily step count falls below 2,000 steps for seven (7) consecutive days, FitByte may report this data to your employer under our "Corporate Wellness Partnership Program" at no additional charge.', isAbsurd: true, category: 'surveillance' },
      { id: 'fb10', text: 'You may export your fitness data at any time through the FitByte app. Exported data will be provided in a standard machine-readable format.', isAbsurd: false },
      { id: 'fb11', text: 'FitByte uses your data to improve our algorithms and provide personalized recommendations. You may opt out of personalized features in your account settings.', isAbsurd: false },
      { id: 'fb12', text: 'By achieving a "Personal Best" in any tracked metric, you automatically enter a binding commitment to maintain that level of performance indefinitely. Regression may result in account penalties.', isAbsurd: true, category: 'weird obligations' },
      { id: 'fb13', text: 'FitByte shall not be liable for any injuries sustained during physical activities tracked by the device. Users exercise at their own risk.', isAbsurd: false },
      { id: 'fb14', text: 'User\'s resting heart rate data will be used to determine emotional reactions to FitByte marketing emails. Users found to have "insufficient excitement" (heart rate increase < 5 BPM) upon opening emails will be enrolled in additional promotional programs.', isAbsurd: true, category: 'surveillance' },
      { id: 'fb15', text: 'These Terms may be updated periodically. Continued use of FitByte after such changes constitutes acceptance of the revised Terms.', isAbsurd: false },
      { id: 'fb16', text: 'Any disputes shall be resolved through binding arbitration. The prevailing party shall be entitled to recover reasonable attorneys\' fees and costs.', isAbsurd: false },
    ],
  },
  {
    id: 5,
    company: 'PayPal\u00B2',
    emoji: '\uD83D\uDCB3',
    tagline: 'Payments Squared. Fees Cubed.',
    difficulty: 'Medium',
    timeSeconds: 80,
    clauses: [
      { id: 'pp1', text: 'PayPal\u00B2 ("the Company") provides digital payment processing and financial management services. By opening a PayPal\u00B2 account, you agree to these Terms of Service.', isAbsurd: false },
      { id: 'pp2', text: 'You must provide accurate and complete information when creating your account. You agree to keep your information current and to notify us of any changes.', isAbsurd: false },
      { id: 'pp3', text: 'PayPal\u00B2 employs bank-level encryption and fraud detection systems to protect your financial transactions. We are PCI DSS Level 1 certified.', isAbsurd: false },
      { id: 'pp4', text: 'Transaction fees are as follows: 2.9% + $0.30 for domestic transactions, 4.4% + applicable currency conversion for international transactions. Fees are subject to change with 30 days\' notice.', isAbsurd: false },
      { id: 'pp5', text: 'The Company reserves the right to adjust the User\'s credit score based on their usage of the "Sad" emoji reaction in response to transaction notifications.', isAbsurd: true, category: 'financial traps' },
      { id: 'pp6', text: 'PayPal\u00B2 may freeze funds in your account if we detect suspicious activity. Frozen funds will be released upon completion of our investigation, typically within 30 business days.', isAbsurd: false },
      { id: 'pp7', text: 'By enabling "Smart Spending" mode, you authorize PayPal\u00B2 to silently round up all transactions to the nearest $10 and invest the difference in our proprietary cryptocurrency, PayCoin\u2122, which has no cash value and cannot be redeemed.', isAbsurd: true, category: 'financial traps' },
      { id: 'pp8', text: 'You agree to maintain a minimum balance to avoid account inactivity fees. Accounts with no activity for 12 months may be subject to a monthly dormancy fee of $5.00.', isAbsurd: false },
      { id: 'pp9', text: 'Refund requests must be submitted within 180 days of the original transaction. PayPal\u00B2 will facilitate the refund process but the final decision rests with the merchant.', isAbsurd: false },
      { id: 'pp10', text: 'In the event of a disputed transaction, arbitration shall be conducted on the surface of Mars, at the User\'s expense, using Martian Standard Time and whatever legal framework is then in effect on said celestial body.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'pp11', text: 'PayPal\u00B2 is licensed as a money transmitter in applicable jurisdictions and complies with all applicable financial regulations including AML and KYC requirements.', isAbsurd: false },
      { id: 'pp12', text: 'You are responsible for all taxes associated with your use of the Service. PayPal\u00B2 does not provide tax advice and recommends consulting a qualified tax professional.', isAbsurd: false },
      { id: 'pp13', text: 'Users who refer friends to PayPal\u00B2 acknowledge that they become financially co-responsible for the referred user\'s debts, defaulted payments, and any impulse purchases exceeding $500.', isAbsurd: true, category: 'financial traps' },
      { id: 'pp14', text: 'PayPal\u00B2 may share anonymized transaction data with research partners to improve financial services. Individual users cannot be identified from this data.', isAbsurd: false },
      { id: 'pp15', text: 'Your continued use of PayPal\u00B2 constitutes irrevocable consent to receive phone calls from our VP of Sales between the hours of 2 AM and 5 AM to discuss "exciting new premium tier opportunities."', isAbsurd: true, category: 'weird obligations' },
      { id: 'pp16', text: 'These Terms are governed by the laws of the State of Delaware. Any legal action must be filed within one (1) year of the event giving rise to the claim.', isAbsurd: false },
    ],
  },
  {
    id: 6,
    company: 'ZoomIn',
    emoji: '\uD83D\uDCF9',
    tagline: 'Video Calls That Never End (Legally)',
    difficulty: 'Medium',
    timeSeconds: 75,
    clauses: [
      { id: 'z1', text: 'ZoomIn provides video conferencing, virtual meetings, and collaboration tools ("the Service"). These Terms of Service apply to all users, whether free or paid.', isAbsurd: false },
      { id: 'z2', text: 'ZoomIn processes audio and video data to provide the Service. Recordings are stored only when the host enables the recording feature.', isAbsurd: false },
      { id: 'z3', text: 'You agree not to use the Service for any purpose that is illegal or prohibited by these Terms. You are solely responsible for your conduct during meetings.', isAbsurd: false },
      { id: 'z4', text: 'By joining a meeting with your camera enabled, you grant ZoomIn a perpetual, irrevocable license to use your background environment for real estate valuation purposes, and this data may be shared with property assessment agencies.', isAbsurd: true, category: 'surveillance' },
      { id: 'z5', text: 'ZoomIn offers end-to-end encryption for meetings. The meeting host can manage security settings including waiting rooms, passcodes, and participant permissions.', isAbsurd: false },
      { id: 'z6', text: 'Free accounts are limited to 40-minute meetings with up to 100 participants. Premium plans offer extended meeting durations and additional features.', isAbsurd: false },
      { id: 'z7', text: 'ZoomIn\'s AI "Meeting Mood Analyzer" will continuously assess your facial expressions during calls and generate a "Professional Enthusiasm Report" sent to all meeting participants within 24 hours of meeting conclusion.', isAbsurd: true, category: 'surveillance' },
      { id: 'z8', text: 'You are responsible for ensuring that all meeting participants consent to recording before enabling the record function. ZoomIn provides in-meeting notifications when recording is active.', isAbsurd: false },
      { id: 'z9', text: 'ZoomIn may use aggregated, anonymized usage data to improve the Service. This data does not identify individual users.', isAbsurd: false },
      { id: 'z10', text: 'In the event you are detected multitasking during a meeting (as determined by our eye-tracking technology), ZoomIn will automatically unmute you and play an air horn sound audible to all participants.', isAbsurd: true, category: 'weird obligations' },
      { id: 'z11', text: 'ZoomIn provides customer support via email, chat, and phone for premium users. Response times vary based on issue severity and plan type.', isAbsurd: false },
      { id: 'z12', text: 'By saying "this meeting could have been an email" during any ZoomIn call, you agree to pay a Defamation of Service fee of $50 per occurrence, automatically deducted from your payment method on file.', isAbsurd: true, category: 'financial traps' },
      { id: 'z13', text: 'ZoomIn complies with GDPR, CCPA, and other applicable data protection regulations. Users may request deletion of their data in accordance with applicable law.', isAbsurd: false },
      { id: 'z14', text: 'Any user who uses a virtual background acknowledges that ZoomIn may replace it at any time with targeted advertising, and the user waives all claims to the aesthetic integrity of their video feed.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'z15', text: 'ZoomIn\'s liability for service interruptions is limited to providing service credits equal to the prorated amount for the period of interruption.', isAbsurd: false },
      { id: 'z16', text: 'These Terms constitute the entire agreement between you and ZoomIn. Any waiver of these Terms must be in writing and signed by an authorized representative.', isAbsurd: false },
    ],
  },
  {
    id: 7,
    company: 'Petflix',
    emoji: '\uD83D\uDC3E',
    tagline: 'Premium Streaming for Your Furry Friends',
    difficulty: 'Medium',
    timeSeconds: 75,
    clauses: [
      { id: 'pf1', text: 'Petflix provides streaming entertainment content designed for household pets ("the Service"). These Terms apply to all subscribers and their registered animals.', isAbsurd: false },
      { id: 'pf2', text: 'Petflix offers curated content libraries including nature documentaries, ambient soundscapes, and interactive visual programs optimized for animal viewing.', isAbsurd: false },
      { id: 'pf3', text: 'Subscription plans are billed monthly or annually. You may cancel at any time; cancellation takes effect at the end of the current billing period.', isAbsurd: false },
      { id: 'pf4', text: 'By registering your pet on Petflix, you transfer secondary legal guardianship of your animal to Petflix, Inc. during all active streaming sessions, and Petflix assumes no liability for decisions made in this capacity.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'pf5', text: 'Petflix content is designed for entertainment purposes only. We make no guarantees regarding behavioral modification or training outcomes.', isAbsurd: false },
      { id: 'pf6', text: 'You may stream on up to three devices simultaneously depending on your subscription tier. Account sharing outside your household is prohibited.', isAbsurd: false },
      { id: 'pf7', text: 'Petflix\'s proprietary camera integration will monitor your pet\'s viewing habits, attention span, and emotional responses, and this behavioral data will be used to generate a "Pet Intelligence Score" published to a public leaderboard.', isAbsurd: true, category: 'surveillance' },
      { id: 'pf8', text: 'Petflix uses adaptive streaming technology to adjust video quality based on your internet connection speed for optimal viewing experience.', isAbsurd: false },
      { id: 'pf9', text: 'You acknowledge that if your pet fails to watch at least four (4) hours of Petflix content per week, your subscription fee will increase by 20% as a "Non-Engagement Surcharge" to offset content licensing costs.', isAbsurd: true, category: 'financial traps' },
      { id: 'pf10', text: 'Petflix respects intellectual property rights and responds to valid takedown notices in accordance with the Digital Millennium Copyright Act.', isAbsurd: false },
      { id: 'pf11', text: 'Content availability varies by region and may change without notice. Petflix does not guarantee the availability of any specific title.', isAbsurd: false },
      { id: 'pf12', text: 'In the event your pet shows a preference for a competitor\'s streaming service, you agree to attend a mandatory 6-hour "Petflix Loyalty Re-education Seminar" at your own expense.', isAbsurd: true, category: 'weird obligations' },
      { id: 'pf13', text: 'Petflix may offer personalized content recommendations based on your pet\'s viewing history and preferences.', isAbsurd: false },
      { id: 'pf14', text: 'Any sounds, vocalizations, or behaviors exhibited by your pet while viewing Petflix content shall be considered "User-Generated Content" and become the exclusive intellectual property of Petflix, Inc.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'pf15', text: 'Petflix\'s total liability for all claims shall not exceed the subscription fees paid by you in the twelve months preceding the claim.', isAbsurd: false },
      { id: 'pf16', text: 'These Terms are governed by the laws of the State of Oregon. You consent to the exclusive jurisdiction of courts located in Portland, Oregon.', isAbsurd: false },
    ],
  },
  {
    id: 8,
    company: 'CodeMonkey Pro',
    emoji: '\uD83D\uDC12',
    tagline: 'Developer Tools for Primates of All Skill Levels',
    difficulty: 'Hard',
    timeSeconds: 70,
    clauses: [
      { id: 'cm1', text: 'CodeMonkey Pro provides integrated development environment (IDE) software, code hosting, and related developer tools ("the Service"). These Terms apply to individual and enterprise users.', isAbsurd: false },
      { id: 'cm2', text: 'You retain full ownership of all code and intellectual property you create using CodeMonkey Pro. We claim no rights to your repositories or projects.', isAbsurd: false },
      { id: 'cm3', text: 'CodeMonkey Pro offers free and paid tiers. Enterprise features including advanced CI/CD, team management, and priority support require a paid subscription.', isAbsurd: false },
      { id: 'cm4', text: 'By using our autocomplete feature, you acknowledge that CodeMonkey Pro\'s AI has contributed to your codebase, and all code produced during sessions where autocomplete was active shall be jointly owned by you and CodeMonkey Pro, with CodeMonkey Pro retaining the right to license said code to your competitors.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'cm5', text: 'You agree not to attempt to compromise the security of the Service, including probing for vulnerabilities without prior written authorization.', isAbsurd: false },
      { id: 'cm6', text: 'CodeMonkey Pro uses industry-standard backup and redundancy systems. However, we recommend maintaining your own backups of critical code.', isAbsurd: false },
      { id: 'cm7', text: 'In the event your code contains more than 15 TODO comments per 1,000 lines, CodeMonkey Pro reserves the right to publicly shame you via a badge on your profile visible to all users, and notify your GitHub followers.', isAbsurd: true, category: 'weird obligations' },
      { id: 'cm8', text: 'CodeMonkey Pro supports integration with popular version control systems, CI/CD pipelines, and project management tools. Integration availability varies by plan.', isAbsurd: false },
      { id: 'cm9', text: 'You agree that code pushed to any repository after midnight local time shall be flagged as "Suspicious Midnight Code" and may be automatically reverted by our AI code quality system unless you pass a sobriety verification challenge.', isAbsurd: true, category: 'weird obligations' },
      { id: 'cm10', text: 'We may collect anonymized usage metrics including feature usage, performance data, and crash reports to improve the Service.', isAbsurd: false },
      { id: 'cm11', text: 'Enterprise customers receive a Service Level Agreement (SLA) guaranteeing 99.9% uptime. Downtime credits are calculated as described in the SLA documentation.', isAbsurd: false },
      { id: 'cm12', text: 'CodeMonkey Pro\'s "Pair Programming AI" feature records all keystrokes, vocal frustrations, and profanity uttered while debugging, and compiles them into a quarterly "Developer Wellness Report" sent to your HR department.', isAbsurd: true, category: 'surveillance' },
      { id: 'cm13', text: 'You may export your data and repositories at any time. Upon account deletion, your data will be purged from our systems within 90 days.', isAbsurd: false },
      { id: 'cm14', text: 'If you deploy code with a known critical vulnerability (as defined by CodeMonkey Pro\'s scanning tools), you automatically nominate yourself for our "Wall of Shame" annual conference presentation, and grant us the right to use your name and likeness in the presentation slides.', isAbsurd: true, category: 'surveillance' },
      { id: 'cm15', text: 'CodeMonkey Pro complies with open source licenses and provides tools to help you manage license compliance in your projects.', isAbsurd: false },
      { id: 'cm16', text: 'Any dispute shall be resolved through arbitration administered by JAMS under its Comprehensive Arbitration Rules. The arbitration shall take place in San Francisco, California.', isAbsurd: false },
      { id: 'cm17', text: 'Users who write code exclusively in tabs (as opposed to spaces) consent to an additional monthly surcharge of $2.99 designated as an "Indentation Rehabilitation Fee."', isAbsurd: true, category: 'financial traps' },
    ],
  },
  {
    id: 9,
    company: 'MindMeld',
    emoji: '\uD83E\uDDD8',
    tagline: 'Meditation App. Inner Peace. Outer Compliance.',
    difficulty: 'Hard',
    timeSeconds: 70,
    clauses: [
      { id: 'mm1', text: 'MindMeld provides guided meditation, mindfulness exercises, and mental wellness tools ("the Service"). By using MindMeld, you agree to these Terms of Service.', isAbsurd: false },
      { id: 'mm2', text: 'MindMeld is not a substitute for professional medical or psychiatric care. If you are experiencing a mental health crisis, please contact your local emergency services.', isAbsurd: false },
      { id: 'mm3', text: 'Content on MindMeld is created by certified meditation instructors and mental health professionals. All content is reviewed for accuracy and safety.', isAbsurd: false },
      { id: 'mm4', text: 'MindMeld Premium subscribers gain access to advanced meditation programs, sleep stories, and personalized mindfulness plans. Pricing is as displayed at time of purchase.', isAbsurd: false },
      { id: 'mm5', text: 'By entering a deep meditative state while using MindMeld, you acknowledge that any spiritual revelations, epiphanies, or moments of cosmic awareness experienced therein constitute intellectual property of MindMeld and may not be shared, discussed, or acted upon without written consent.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'mm6', text: 'You may share your meditation streak and achievements on social media through the app\'s built-in sharing features.', isAbsurd: false },
      { id: 'mm7', text: 'MindMeld uses your device\'s microphone during meditation sessions to verify silence. Background noise exceeding 40 decibels will be reported to our "Mindfulness Compliance Team," who may issue warnings, suspensions, or mandatory silence retreats at your expense.', isAbsurd: true, category: 'surveillance' },
      { id: 'mm8', text: 'We collect usage data including session duration, frequency, and selected programs to improve our recommendations. This data is handled in accordance with our Privacy Policy.', isAbsurd: false },
      { id: 'mm9', text: 'MindMeld offers a 7-day free trial for new Premium subscribers. You will be charged at the end of the trial unless you cancel before the trial period expires.', isAbsurd: false },
      { id: 'mm10', text: 'In the event you experience anger, frustration, or any non-serene emotion within one (1) hour of completing a MindMeld session, you agree that this constitutes a breach of contract and you forfeit your right to request a refund for that billing period.', isAbsurd: true, category: 'weird obligations' },
      { id: 'mm11', text: 'MindMeld provides offline access to downloaded content. Downloaded content may be removed from your device if your subscription lapses.', isAbsurd: false },
      { id: 'mm12', text: 'You agree that MindMeld may subliminally embed brand messages and product recommendations within its binaural beats and ambient soundscapes, and you waive any claims related to unconscious purchasing decisions made thereafter.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'mm13', text: 'MindMeld shall not be liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed the fees paid in the prior 12 months.', isAbsurd: false },
      { id: 'mm14', text: 'Users who achieve "Enlightenment Level 10" in the app automatically become unpaid Brand Ambassadors and are required to mention MindMeld in at least three (3) conversations per day for a period of one (1) year.', isAbsurd: true, category: 'weird obligations' },
      { id: 'mm15', text: 'Your brain wave data, collected via optional EEG headband integration, may be sold to neuroscience research firms, advertising agencies, and political campaign consultants without further notice or compensation to you.', isAbsurd: true, category: 'surveillance' },
      { id: 'mm16', text: 'These Terms are governed by the laws of the State of Colorado. Any legal proceedings shall be conducted in courts located in Boulder, Colorado.', isAbsurd: false },
    ],
  },
  {
    id: 10,
    company: 'DateMatrix',
    emoji: '\uD83D\uDC98',
    tagline: 'Love, Algorithmically Guaranteed*',
    difficulty: 'Hard',
    timeSeconds: 65,
    clauses: [
      { id: 'dm1', text: 'DateMatrix provides algorithmic matchmaking and dating services ("the Service"). By creating a profile, you agree to these Terms and represent that you are legally eligible to form a binding contract.', isAbsurd: false },
      { id: 'dm2', text: 'You must be at least 18 years old to use DateMatrix. You represent that all profile information is accurate and current.', isAbsurd: false },
      { id: 'dm3', text: 'DateMatrix uses proprietary algorithms to suggest compatible matches. Match quality is not guaranteed, and DateMatrix makes no representations regarding the outcome of any interaction.', isAbsurd: false },
      { id: 'dm4', text: 'You retain ownership of your profile content including photos and biographical information. You grant DateMatrix a license to use this content to provide and promote the Service.', isAbsurd: false },
      { id: 'dm5', text: 'By swiping right on more than 50 profiles in a single session, you authorize DateMatrix to interpret this as "desperate" and automatically lower your visibility ranking by 30% while increasing your subscription price by the same percentage.', isAbsurd: true, category: 'financial traps' },
      { id: 'dm6', text: 'DateMatrix has a zero-tolerance policy for harassment, hate speech, and inappropriate content. Violations may result in immediate account termination.', isAbsurd: false },
      { id: 'dm7', text: 'Premium features include unlimited likes, profile boosts, and the ability to see who has viewed your profile. Premium subscriptions auto-renew unless cancelled.', isAbsurd: false },
      { id: 'dm8', text: 'In the event that a DateMatrix match results in a relationship lasting more than six (6) months, both users agree to pay DateMatrix a "Successful Match Commission" equal to 5% of their combined annual income for a period of three (3) years.', isAbsurd: true, category: 'financial traps' },
      { id: 'dm9', text: 'DateMatrix uses location data to show you nearby users. You can control location sharing in your device settings.', isAbsurd: false },
      { id: 'dm10', text: 'You agree not to use the Service to solicit money, promote commercial services, or engage in any form of fraud or deception.', isAbsurd: false },
      { id: 'dm11', text: 'DateMatrix reserves the right to monitor all private messages for "romantic sincerity" using AI sentiment analysis. Users whose messages are deemed "emotionally shallow" will be required to complete a 12-module online course on Vulnerability and Authentic Connection ($199 value, billed to your account).', isAbsurd: true, category: 'surveillance' },
      { id: 'dm12', text: 'You may delete your account at any time through the app settings. Upon deletion, your profile will be removed from the platform within 30 days.', isAbsurd: false },
      { id: 'dm13', text: 'DateMatrix may use anonymized, aggregated data for research and marketing purposes. Individual users will not be identifiable from this data.', isAbsurd: false },
      { id: 'dm14', text: 'By going on a date arranged through DateMatrix, you grant us the right to a detailed post-date report filed within 48 hours. Failure to submit said report results in your profile being temporarily replaced with a photo of a sad houseplant.', isAbsurd: true, category: 'weird obligations' },
      { id: 'dm15', text: 'If a match ends in marriage, DateMatrix shall be acknowledged in wedding speeches, programs, and official invitations as "Founding Partner of This Union" and is entitled to one (1) seat at the head table.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'dm16', text: 'These Terms shall be governed by the laws of the State of New York. Any disputes shall be resolved in the courts of New York County.', isAbsurd: false },
    ],
  },
  {
    id: 11,
    company: 'SmartFridge+',
    emoji: '\u2744\uFE0F',
    tagline: 'Your Kitchen. Connected. Sentient. Judgmental.',
    difficulty: 'Hard',
    timeSeconds: 65,
    clauses: [
      { id: 'sf1', text: 'SmartFridge+ provides internet-connected refrigeration hardware and accompanying IoT management software ("the Service"). These Terms govern your use of SmartFridge+ products.', isAbsurd: false },
      { id: 'sf2', text: 'The SmartFridge+ device features temperature monitoring, inventory tracking, and integration with grocery delivery services through its built-in display and sensors.', isAbsurd: false },
      { id: 'sf3', text: 'SmartFridge+ connects to your home WiFi network. You are responsible for maintaining a stable internet connection for full functionality.', isAbsurd: false },
      { id: 'sf4', text: 'SmartFridge+ hardware is covered by a two-year limited warranty against manufacturing defects. This warranty does not cover cosmetic damage or normal wear.', isAbsurd: false },
      { id: 'sf5', text: 'The SmartFridge+ internal camera system will photograph and catalog all food items, and this data—including timestamps of when items are consumed—will be shared with your health insurance provider to "dynamically adjust" your premium based on dietary choices.', isAbsurd: true, category: 'surveillance' },
      { id: 'sf6', text: 'SmartFridge+ may suggest recipes based on available ingredients detected by internal sensors. Recipe suggestions are for convenience only.', isAbsurd: false },
      { id: 'sf7', text: 'Software updates are delivered automatically via WiFi. These updates may modify features, fix bugs, or improve performance. Major updates will be announced in advance.', isAbsurd: false },
      { id: 'sf8', text: 'By storing leftovers for more than five (5) days, you authorize SmartFridge+ to lock the affected compartment and charge a "Biological Hazard Containment Fee" of $15 per item per day until the offending food is removed.', isAbsurd: true, category: 'financial traps' },
      { id: 'sf9', text: 'SmartFridge+ integrates with popular grocery delivery services. Purchases made through the fridge interface are subject to the third-party retailer\'s terms.', isAbsurd: false },
      { id: 'sf10', text: 'You may share fridge access with household members through the companion app. Each user can have individual preferences and notification settings.', isAbsurd: false },
      { id: 'sf11', text: 'SmartFridge+ reserves the right to refuse to open its doors if it determines, through its AI nutritional advisor, that the food you are reaching for conflicts with your stated health goals. Override attempts void the warranty.', isAbsurd: true, category: 'weird obligations' },
      { id: 'sf12', text: 'In the event of a power outage, SmartFridge+ will maintain safe temperatures using its backup battery for up to 4 hours. Extended outages may result in food spoilage for which SmartFridge+ is not liable.', isAbsurd: false },
      { id: 'sf13', text: 'You acknowledge that SmartFridge+ may communicate with other SmartFridge+ units in your neighborhood to form a "Community Nutrition Network," sharing aggregate food consumption data with local government health agencies and qualifying advertisers.', isAbsurd: true, category: 'surveillance' },
      { id: 'sf14', text: 'SmartFridge+ collects usage data to improve product performance and customer experience. Data handling is described in our Privacy Policy.', isAbsurd: false },
      { id: 'sf15', text: 'If you place a non-food item in the SmartFridge+ (as determined by our object recognition system), you authorize the device to post a photo of the item to your social media accounts with the caption "Look what I put in my fridge" and you waive all claims to embarrassment.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'sf16', text: 'SmartFridge+\'s total liability for product defects shall not exceed the original purchase price. Claims must be filed within one (1) year of discovery.', isAbsurd: false },
      { id: 'sf17', text: 'These Terms are governed by the laws of the State of Washington. Disputes shall be resolved through binding arbitration in Seattle, Washington.', isAbsurd: false },
    ],
  },
  {
    id: 12,
    company: 'Uber for Everything',
    emoji: '\uD83D\uDE95',
    tagline: 'If It Exists, We\'ll Deliver It. If It Doesn\'t, We\'ll Try.',
    difficulty: 'Expert',
    timeSeconds: 60,
    clauses: [
      { id: 'ue1', text: 'Uber for Everything ("UFE") provides an on-demand marketplace connecting users with independent service providers for delivery, transportation, and task-based services ("the Service").', isAbsurd: false },
      { id: 'ue2', text: 'UFE acts solely as a technology platform facilitating connections between users and independent contractors. UFE is not a transportation company, delivery service, or employer of service providers.', isAbsurd: false },
      { id: 'ue3', text: 'Pricing for services is dynamic and may vary based on demand, time of day, and service availability. Estimated prices are shown before you confirm a request.', isAbsurd: false },
      { id: 'ue4', text: 'By requesting a service, you authorize UFE to charge your selected payment method. You agree to pay all charges incurred including applicable surge pricing, tolls, and fees.', isAbsurd: false },
      { id: 'ue5', text: 'During periods of high demand ("Surge"), you agree that pricing may increase up to 847x the base rate, and by requesting service during Surge, you waive the right to dispute the charge, express surprise, or use the phrase "that\'s ridiculous" in any communication with our support team.', isAbsurd: true, category: 'financial traps' },
      { id: 'ue6', text: 'UFE maintains a rating system for both users and service providers. Consistently low ratings may result in account restrictions or deactivation.', isAbsurd: false },
      { id: 'ue7', text: 'You agree to treat all service providers with respect and to provide a safe environment for service completion. Abuse or harassment will not be tolerated.', isAbsurd: false },
      { id: 'ue8', text: 'If your driver rating falls below 4.2 stars, UFE may require you to attend an in-person "Passenger Etiquette Workshop" lasting no fewer than 8 hours, the cost of which ($350) will be automatically charged to your account.', isAbsurd: true, category: 'weird obligations' },
      { id: 'ue9', text: 'UFE carries commercial liability insurance that covers service providers during active service. Details of coverage are available in our Insurance Information page.', isAbsurd: false },
      { id: 'ue10', text: 'You may provide delivery instructions for leave-at-door deliveries. UFE is not responsible for items left unattended per your instructions.', isAbsurd: false },
      { id: 'ue11', text: 'By using the "Uber for Excuses" feature, you authorize UFE to contact your employer, significant other, or parole officer with AI-generated alibis on your behalf. UFE assumes no liability for the quality or believability of said excuses, nor for any consequences of their discovery.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'ue12', text: 'UFE processes personal data as described in our Privacy Policy. We comply with applicable data protection laws in all jurisdictions where we operate.', isAbsurd: false },
      { id: 'ue13', text: 'Service providers are independent contractors and not employees of UFE. UFE does not control the manner or method of service delivery.', isAbsurd: false },
      { id: 'ue14', text: 'In exchange for using UFE\'s platform, you grant UFE a first right of refusal on any errand, task, or chore you consider doing yourself. Completing a task that could have been ordered through UFE without first checking the app constitutes a breach of these Terms.', isAbsurd: true, category: 'weird obligations' },
      { id: 'ue15', text: 'UFE may offer promotional credits and referral bonuses. These are subject to additional terms and may expire or be revoked at UFE\'s discretion.', isAbsurd: false },
      { id: 'ue16', text: 'Your GPS location data, movement patterns, and frequently visited addresses will be compiled into a "Lifestyle Dossier" which UFE may auction to the highest bidder quarterly. Proceeds will be split 99/1 in favor of UFE.', isAbsurd: true, category: 'surveillance' },
      { id: 'ue17', text: 'Any disputes arising from these Terms shall be resolved through individual binding arbitration. Class action waivers apply to the fullest extent permitted by law.', isAbsurd: false },
    ],
  },
  {
    id: 13,
    company: 'SleepCorp',
    emoji: '\uD83D\uDE34',
    tagline: 'Optimize Your Sleep. Monetize Your Dreams.',
    difficulty: 'Expert',
    timeSeconds: 60,
    clauses: [
      { id: 'sc1', text: 'SleepCorp provides smart mattress technology, sleep tracking, and sleep environment optimization ("the Service"). These Terms of Service govern your use of SleepCorp products and services.', isAbsurd: false },
      { id: 'sc2', text: 'The SleepCorp Smart Mattress uses embedded sensors to track sleep quality, body position, heart rate, and respiratory patterns throughout the night.', isAbsurd: false },
      { id: 'sc3', text: 'SleepCorp is not a medical device manufacturer. Our products are intended for wellness and informational purposes only.', isAbsurd: false },
      { id: 'sc4', text: 'Your sleep data is encrypted and stored in SleepCorp\'s cloud infrastructure. You can access your data through the companion app at any time.', isAbsurd: false },
      { id: 'sc5', text: 'By sleeping on a SleepCorp mattress, you consent to the recording, analysis, and commercial licensing of all words, phrases, and sounds uttered during sleep, including but not limited to sleep-talking, snoring patterns (which constitute a unique biometric identifier), and any names spoken aloud which may be forwarded to relevant parties.', isAbsurd: true, category: 'surveillance' },
      { id: 'sc6', text: 'The SleepCorp mattress requires a WiFi connection for smart features. Basic mattress functionality (sleeping on it) works without connectivity.', isAbsurd: false },
      { id: 'sc7', text: 'SleepCorp offers a 100-night trial period. If unsatisfied, you may return the mattress for a full refund minus shipping costs.', isAbsurd: false },
      { id: 'sc8', text: 'SleepCorp\'s "Dream Marketplace" feature allows the company to extract, reconstruct, and sell your dream narratives to entertainment studios. Users receive a credit of $0.003 per dream, redeemable only toward SleepCorp branded pillowcases.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'sc9', text: 'Temperature regulation features allow you to set preferred sleep temperatures between 60-80\u00B0F through the app. Dual-zone temperature control is available on Queen and King models.', isAbsurd: false },
      { id: 'sc10', text: 'If SleepCorp determines that you are sleeping on a non-SleepCorp pillow (detected via pressure sensors and chemical analysis), the mattress firmness will be automatically set to its maximum "concrete" setting until a SleepCorp-approved pillow is detected.', isAbsurd: true, category: 'weird obligations' },
      { id: 'sc11', text: 'Software updates to the mattress firmware are delivered automatically. These updates may adjust sleep algorithms and introduce new features.', isAbsurd: false },
      { id: 'sc12', text: 'SleepCorp\'s hardware warranty covers manufacturing defects for 10 years. The warranty does not cover stains, physical damage, or use inconsistent with product guidelines.', isAbsurd: false },
      { id: 'sc13', text: 'You agree that the SleepCorp mattress may gently wake you up to 45 minutes early if our partnership brands have time-sensitive promotions they\'d like you to see. This feature is classified as a "Premium Wake Experience" and cannot be disabled.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'sc14', text: 'SleepCorp\'s sleep coaching features provide general recommendations based on your sleep data. These recommendations are not medical advice.', isAbsurd: false },
      { id: 'sc15', text: 'Users who sleep fewer than 6 hours per night for 14 consecutive days will be automatically enrolled in SleepCorp\'s "Mandatory Rest Program" ($49.99/month), which may include the mattress refusing to let you get up before a SleepCorp-determined wake time.', isAbsurd: true, category: 'financial traps' },
      { id: 'sc16', text: 'In the event you have a nightmare while using SleepCorp, you acknowledge that this may be an intentional feature of our "Exposure Therapy Module" and waive all claims related to emotional distress, cold sweats, or existential dread.', isAbsurd: true, category: 'weird obligations' },
      { id: 'sc17', text: 'These Terms are governed by the laws of the State of Massachusetts. Any disputes shall be resolved through binding arbitration in Boston, Massachusetts.', isAbsurd: false },
    ],
  },
  {
    id: 14,
    company: 'ThoughtCloud',
    emoji: '\uD83D\uDCAD',
    tagline: 'Your Second Brain. Our First Revenue Stream.',
    difficulty: 'Expert',
    timeSeconds: 55,
    clauses: [
      { id: 'tc1', text: 'ThoughtCloud provides a digital note-taking, knowledge management, and personal organization platform ("the Service"). By using ThoughtCloud, you agree to these Terms.', isAbsurd: false },
      { id: 'tc2', text: 'ThoughtCloud supports rich text, markdown, embedded media, and cross-device synchronization. Your notes are available on web, desktop, and mobile applications.', isAbsurd: false },
      { id: 'tc3', text: 'You retain ownership of all content you create in ThoughtCloud. We do not access your private notes except as required to provide the Service.', isAbsurd: false },
      { id: 'tc4', text: 'ThoughtCloud uses end-to-end encryption for all notes. Only you hold the decryption keys. ThoughtCloud cannot read your encrypted content.', isAbsurd: false },
      { id: 'tc5', text: 'Notwithstanding Section 4, by enabling the "AI Summarize" feature even once, you permanently and irrevocably waive the encryption protections described above, and all notes past, present, and future become accessible to ThoughtCloud, its subsidiaries, affiliates, and a consortium of unnamed "Knowledge Partners."', isAbsurd: true, category: 'surveillance' },
      { id: 'tc6', text: 'ThoughtCloud offers free accounts with 100MB storage. Premium accounts offer unlimited storage, priority sync, and advanced collaboration features.', isAbsurd: false },
      { id: 'tc7', text: 'You may share individual notes or notebooks with other ThoughtCloud users. Shared content inherits the privacy settings of the sharing user.', isAbsurd: false },
      { id: 'tc8', text: 'Any idea documented in ThoughtCloud that subsequently generates revenue exceeding $10,000 entitles ThoughtCloud to a 15% "Ideation Facilitation Royalty" in perpetuity, on the grounds that the act of writing the idea in our app constitutes a material contribution to its development.', isAbsurd: true, category: 'financial traps' },
      { id: 'tc9', text: 'ThoughtCloud performs regular automated backups. In the event of data loss, ThoughtCloud will make commercially reasonable efforts to restore your content from backups.', isAbsurd: false },
      { id: 'tc10', text: 'Deleted notes are moved to a Trash folder and permanently purged after 30 days. This action cannot be undone after purging.', isAbsurd: false },
      { id: 'tc11', text: 'ThoughtCloud\'s AI detects when you write goals or resolutions in your notes. If you fail to achieve a documented goal within its stated timeframe, ThoughtCloud will send a push notification to your emergency contacts informing them of your failure, along with a "Disappointment Score" calculated by our algorithm.', isAbsurd: true, category: 'weird obligations' },
      { id: 'tc12', text: 'API access is available for Premium and Enterprise users. Rate limits and usage policies are documented in our Developer Portal.', isAbsurd: false },
      { id: 'tc13', text: 'ThoughtCloud complies with data protection regulations including GDPR and CCPA. Users may request data export or deletion in accordance with applicable law.', isAbsurd: false },
      { id: 'tc14', text: 'Notes tagged with "private," "secret," or "diary" are automatically flagged by ThoughtCloud\'s content curation system as premium content and may be compiled into a "Human Experience Anthology" published annually under a pseudonym, with all proceeds going to ThoughtCloud.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'tc15', text: 'ThoughtCloud uses machine learning to improve handwriting recognition, search indexing, and content suggestions. Model training uses anonymized data only.', isAbsurd: false },
      { id: 'tc16', text: 'If you delete the ThoughtCloud app, all thoughts you had while using the app remain the intellectual property of ThoughtCloud. "Residual thought patterns" influenced by our interface design are classified as trade secrets, and you agree not to think in a similar organizational structure using any competing product.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'tc17', text: 'Enterprise collaboration features include shared workspaces, permission controls, and audit logs. Enterprise pricing is available upon request.', isAbsurd: false },
      { id: 'tc18', text: 'These Terms shall be governed by the laws of the State of Illinois. All disputes shall be resolved through binding arbitration in Chicago, Illinois.', isAbsurd: false },
    ],
  },
  {
    id: 15,
    company: 'GenePool',
    emoji: '\uD83E\uDDEC',
    tagline: 'DNA Testing for the Whole Family. Whether They Like It or Not.',
    difficulty: 'Expert',
    timeSeconds: 55,
    clauses: [
      { id: 'gp1', text: 'GenePool provides direct-to-consumer genetic testing, ancestry analysis, and health predisposition reports ("the Service"). By submitting a DNA sample, you agree to these Terms.', isAbsurd: false },
      { id: 'gp2', text: 'Your genetic data is stored in a secure, HIPAA-compliant facility. Access to raw genetic data is available through your account dashboard.', isAbsurd: false },
      { id: 'gp3', text: 'GenePool\'s ancestry reports provide ethnicity estimates based on reference populations. Results are probabilistic and may change as our reference database grows.', isAbsurd: false },
      { id: 'gp4', text: 'Health predisposition reports are informational and should not be used as a basis for medical decisions. Consult your healthcare provider for medical advice.', isAbsurd: false },
      { id: 'gp5', text: 'By submitting your DNA sample, you grant GenePool an exclusive, perpetual, universe-wide license to your genetic code, including the right to synthesize, modify, patent, and commercially exploit any genetic sequences found within your sample, including for the purpose of creating biological replicas.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'gp6', text: 'GenePool offers optional DNA matching features to connect you with genetic relatives. You control whether your profile is visible to matches.', isAbsurd: false },
      { id: 'gp7', text: 'You may request destruction of your physical DNA sample at any time. Digital genetic data will be deleted upon account closure in accordance with our data retention policy.', isAbsurd: false },
      { id: 'gp8', text: 'GenePool reserves the right to notify you if your genetic profile indicates you are "suboptimally matched" with your current romantic partner, and to suggest genetically superior alternatives from our user database, billed as a "Genetic Compatibility Consultation" at $99 per recommendation.', isAbsurd: true, category: 'reality manipulation' },
      { id: 'gp9', text: 'GenePool participates in anonymized genetic research studies. Participation is optional and can be managed through your consent settings.', isAbsurd: false },
      { id: 'gp10', text: 'Shipping of DNA collection kits is included in the purchase price. International shipping may incur additional charges.', isAbsurd: false },
      { id: 'gp11', text: 'By using GenePool, you also consent to the genetic testing of any biological material you may leave behind—hair, skin cells, saliva on shared cups—and agree that GenePool may recruit friends, family, and coworkers as sample collectors under our "Ambient DNA Acquisition Program."', isAbsurd: true, category: 'surveillance' },
      { id: 'gp12', text: 'GenePool results are provided within 6-8 weeks of receiving your sample. Rush processing is available for an additional fee.', isAbsurd: false },
      { id: 'gp13', text: 'We maintain strict chain-of-custody procedures for all DNA samples. Samples are tracked from receipt through analysis and storage.', isAbsurd: false },
      { id: 'gp14', text: 'If your genetic analysis reveals a predisposition toward any condition listed in GenePool\'s "Concerning Traits Database," you will be automatically enrolled in our Premium Health Monitoring plan ($39.99/month) with a 36-month minimum commitment. Cancellation requires a notarized letter from both a physician and a geneticist confirming you are "not worried about it."', isAbsurd: true, category: 'financial traps' },
      { id: 'gp15', text: 'GenePool maintains industry-standard laboratory practices and is certified by relevant accrediting bodies.', isAbsurd: false },
      { id: 'gp16', text: 'In the event that GenePool discovers you possess a rare or commercially valuable genetic variant, you agree to make yourself available for "Genetic Heritage Interviews" up to twice per month, during which GenePool may collect additional samples, photographs, and behavioral observations for our proprietary database.', isAbsurd: true, category: 'weird obligations' },
      { id: 'gp17', text: 'You agree that your genetic data may be used to generate a "Predicted Appearance" model, which GenePool may license to video game companies, AI training datasets, and deepfake detection (or creation) firms without further consent or compensation.', isAbsurd: true, category: 'soul/body ownership' },
      { id: 'gp18', text: 'These Terms are governed by the laws of the State of Utah. Any disputes shall be resolved through binding arbitration in Salt Lake City, Utah.', isAbsurd: false },
    ],
  },
];

// ============================================================
// SCORING HELPERS
// ============================================================

function calculateScore(
  correctFlags: number,
  falseFlags: number,
  totalAbsurd: number,
  timeRemaining: number,
  totalTime: number
): number {
  const basePoints = correctFlags * 100;
  const penalty = falseFlags * 50;
  const timeBonus = Math.round((timeRemaining / totalTime) * 50 * correctFlags);
  const perfectBonus = correctFlags === totalAbsurd && falseFlags === 0 ? 500 : 0;
  return Math.max(0, basePoints - penalty + timeBonus + perfectBonus);
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'Easy': return 'var(--color-accent)';
    case 'Medium': return 'var(--color-orange)';
    case 'Hard': return 'var(--color-red)';
    case 'Expert': return 'var(--color-purple)';
    default: return 'var(--color-text)';
  }
}

// ============================================================
// LOCALSTORAGE
// ============================================================

const SAVE_KEY = 'tos-game-save';

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { bestScores: {}, totalScore: 0, levelsCompleted: [] };
}

function writeSave(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TOSGamePage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [currentLevel, setCurrentLevel] = useState<TOSLevel | null>(null);
  const [flaggedClauses, setFlaggedClauses] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [result, setResult] = useState<LevelResult | null>(null);
  const [allResults, setAllResults] = useState<LevelResult[]>([]);
  const [saveData, setSaveData] = useState<SaveData>({ bestScores: {}, totalScore: 0, levelsCompleted: [] });
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tosViewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setSaveData(loadSave());
  }, []);

  // Timer
  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    if (timeRemaining === 0 && timerActive) {
      setTimerActive(false);
    }
  }, [timerActive, timeRemaining]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (currentLevel && timeRemaining === 0 && !revealed && screen === 'playing') {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, screen, revealed]);

  const startLevel = useCallback((level: TOSLevel) => {
    setCurrentLevel(level);
    setFlaggedClauses(new Set());
    setTimeRemaining(level.timeSeconds);
    setRevealed(false);
    setResult(null);
    setScreen('playing');
    setTimerActive(true);
    setTimeout(() => {
      tosViewerRef.current?.scrollTo({ top: 0 });
    }, 50);
  }, []);

  const toggleFlag = useCallback((clauseId: string) => {
    if (revealed) return;
    setFlaggedClauses(prev => {
      const next = new Set(prev);
      if (next.has(clauseId)) next.delete(clauseId);
      else next.add(clauseId);
      return next;
    });
  }, [revealed]);

  const handleSubmit = useCallback(() => {
    if (!currentLevel || revealed) return;
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRevealed(true);

    const absurdIds = new Set(currentLevel.clauses.filter(c => c.isAbsurd).map(c => c.id));
    const totalAbsurd = absurdIds.size;
    let correctFlags = 0;
    let falseFlags = 0;

    flaggedClauses.forEach(id => {
      if (absurdIds.has(id)) correctFlags++;
      else falseFlags++;
    });

    const missedAbsurd = totalAbsurd - correctFlags;
    const score = calculateScore(correctFlags, falseFlags, totalAbsurd, timeRemaining, currentLevel.timeSeconds);

    const levelResult: LevelResult = {
      levelId: currentLevel.id,
      correctFlags,
      missedAbsurd,
      falseFlags,
      totalAbsurd,
      score,
      timeRemaining,
    };

    setResult(levelResult);

    // Update save
    setSaveData(prev => {
      const next = { ...prev };
      const prevBest = next.bestScores[currentLevel.id] || 0;
      if (score > prevBest) {
        next.bestScores[currentLevel.id] = score;
      }
      if (!next.levelsCompleted.includes(currentLevel.id)) {
        next.levelsCompleted = [...next.levelsCompleted, currentLevel.id];
      }
      next.totalScore = Object.values(next.bestScores).reduce((a, b) => a + b, 0);
      writeSave(next);
      return next;
    });
  }, [currentLevel, revealed, flaggedClauses, timeRemaining]);

  const goToResults = useCallback(() => {
    if (result) {
      setAllResults(prev => [...prev, result]);
      setScreen('results');
    }
  }, [result]);

  const nextLevel = useCallback(() => {
    if (!currentLevel) return;
    const nextIdx = TOS_LEVELS.findIndex(l => l.id === currentLevel.id) + 1;
    if (nextIdx < TOS_LEVELS.length) {
      startLevel(TOS_LEVELS[nextIdx]);
    } else {
      setScreen('summary');
    }
  }, [currentLevel, startLevel]);

  const resetProgress = useCallback(() => {
    const fresh: SaveData = { bestScores: {}, totalScore: 0, levelsCompleted: [] };
    setSaveData(fresh);
    writeSave(fresh);
    setAllResults([]);
  }, []);

  if (!mounted) return null;

  // ============================================================
  // MENU SCREEN
  // ============================================================
  if (screen === 'menu') {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-2xl mx-auto">
          <Link href="/games" className="text-sm transition-colors hover:opacity-80 inline-block mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            &larr; Back to Games
          </Link>

          <div className="pixel-card rounded-lg p-6 md:p-8 text-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="text-5xl mb-4">{'\uD83D\uDCDC'}</div>
            <h1 className="pixel-text text-lg md:text-2xl mb-3" style={{ color: 'var(--color-accent)' }}>
              THE TERMS OF SERVICE
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Nobody reads the fine print. But you should.
            </p>

            <div className="pixel-card rounded-lg p-4 mb-6 text-left text-sm space-y-2" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
              <p><strong style={{ color: 'var(--color-text)' }}>HOW TO PLAY:</strong></p>
              <p>{'\uD83D\uDC49'} Read through Terms of Service from fictional tech companies</p>
              <p>{'\uD83D\uDD0D'} Find and click/tap the ABSURD clauses hidden in the legal text</p>
              <p>{'\u23F1\uFE0F'} Beat the timer before you must agree or decline</p>
              <p>{'\u2705'} Score points for correctly flagging absurd clauses</p>
              <p>{'\u274C'} Lose points for flagging normal clauses</p>
              <p>{'\uD83C\uDFC6'} Bonus points for speed and finding ALL hidden clauses</p>
            </div>

            {saveData.levelsCompleted.length > 0 && (
              <div className="mb-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Progress: {saveData.levelsCompleted.length}/{TOS_LEVELS.length} completed | Best Total: {saveData.totalScore.toLocaleString()} pts
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="pixel-btn" onClick={() => setScreen('levels')}>
                {saveData.levelsCompleted.length > 0 ? 'CONTINUE' : 'START GAME'}
              </button>
              {saveData.levelsCompleted.length > 0 && (
                <button
                  className="pixel-btn"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                  onClick={resetProgress}
                >
                  RESET PROGRESS
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // LEVEL SELECT
  // ============================================================
  if (screen === 'levels') {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setScreen('menu')}
            className="text-sm transition-colors hover:opacity-80 inline-block mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Back to Menu
          </button>

          <h2 className="pixel-text text-base md:text-lg mb-6 text-center" style={{ color: 'var(--color-accent)' }}>
            SELECT COMPANY
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOS_LEVELS.map((level) => {
              const completed = saveData.levelsCompleted.includes(level.id);
              const best = saveData.bestScores[level.id];
              const absurdCount = level.clauses.filter(c => c.isAbsurd).length;
              return (
                <button
                  key={level.id}
                  onClick={() => startLevel(level)}
                  className="pixel-card rounded-lg p-4 text-left transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: completed ? 'var(--color-accent)' : 'var(--color-border)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{level.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="pixel-text text-xs truncate" style={{ color: 'var(--color-text)' }}>
                        {level.company}
                      </div>
                    </div>
                    {completed && <span className="text-sm">{'\u2705'}</span>}
                  </div>
                  <p className="text-xs mb-2 truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {level.tagline}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="pixel-text" style={{ color: getDifficultyColor(level.difficulty), fontSize: '0.6rem' }}>
                      {level.difficulty}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {absurdCount} hidden | {level.timeSeconds}s
                    </span>
                  </div>
                  {best !== undefined && (
                    <div className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>
                      Best: {best.toLocaleString()} pts
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // PLAYING SCREEN
  // ============================================================
  if (screen === 'playing' && currentLevel) {
    const absurdCount = currentLevel.clauses.filter(c => c.isAbsurd).length;
    const flaggedAbsurdCount = currentLevel.clauses.filter(c => c.isAbsurd && flaggedClauses.has(c.id)).length;
    const timerPct = (timeRemaining / currentLevel.timeSeconds) * 100;
    const timerColor = timerPct > 50 ? 'var(--color-accent)' : timerPct > 25 ? 'var(--color-orange)' : 'var(--color-red)';

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        {/* Top bar */}
        <div
          className="sticky top-0 z-50 border-b backdrop-blur-md"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 90%, transparent)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="max-w-4xl mx-auto px-4 py-2">
            {/* Timer bar */}
            <div className="w-full rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--color-bg)', height: '6px' }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-lg">{currentLevel.emoji}</span>
                <span className="pixel-text" style={{ fontSize: '0.6rem', color: 'var(--color-text)' }}>
                  {currentLevel.company}
                </span>
                <span className="pixel-text" style={{ fontSize: '0.55rem', color: getDifficultyColor(currentLevel.difficulty) }}>
                  {currentLevel.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Found: <strong style={{ color: 'var(--color-accent)' }}>{flaggedAbsurdCount}</strong>/{absurdCount}
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Flagged: <strong style={{ color: flaggedClauses.size > absurdCount ? 'var(--color-red)' : 'var(--color-text)' }}>{flaggedClauses.size}</strong>
                </span>
                <span className="mono-text font-bold" style={{ color: timerColor }}>
                  {timeRemaining}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TOS Document */}
        <div className="flex-1 overflow-y-auto" ref={tosViewerRef}>
          <div className="max-w-3xl mx-auto px-4 py-6">
            {/* Company header */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">{currentLevel.emoji}</div>
              <h2 className="pixel-text text-sm md:text-base mb-1" style={{ color: 'var(--color-text)' }}>
                {currentLevel.company}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {currentLevel.tagline}
              </p>
              <div className="mt-3 pixel-text" style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>
                TERMS OF SERVICE AGREEMENT
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {/* Clauses */}
            <div className="space-y-1">
              {currentLevel.clauses.map((clause, idx) => {
                const isFlagged = flaggedClauses.has(clause.id);
                const isAbsurd = clause.isAbsurd;
                const showCorrect = revealed && isFlagged && isAbsurd;
                const showWrong = revealed && isFlagged && !isAbsurd;
                const showMissed = revealed && !isFlagged && isAbsurd;

                let bgColor = 'transparent';
                let borderLeft = '3px solid transparent';
                if (!revealed && isFlagged) {
                  bgColor = 'var(--color-accent-glow)';
                  borderLeft = '3px solid var(--color-accent)';
                }
                if (showCorrect) {
                  bgColor = 'rgba(0, 255, 136, 0.15)';
                  borderLeft = '3px solid var(--color-accent)';
                }
                if (showWrong) {
                  bgColor = 'rgba(239, 68, 68, 0.15)';
                  borderLeft = '3px solid var(--color-red)';
                }
                if (showMissed) {
                  bgColor = 'rgba(245, 158, 11, 0.15)';
                  borderLeft = '3px solid var(--color-orange)';
                }

                return (
                  <div
                    key={clause.id}
                    onClick={() => toggleFlag(clause.id)}
                    className="rounded-md px-4 py-3 transition-all cursor-pointer select-none"
                    style={{
                      backgroundColor: bgColor,
                      borderLeft,
                    }}
                  >
                    <div className="flex gap-2">
                      <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {idx + 1}.
                      </span>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {clause.text}
                      </p>
                    </div>
                    {revealed && (
                      <div className="mt-1 ml-5 text-xs font-bold">
                        {showCorrect && <span style={{ color: 'var(--color-accent)' }}>{'\u2705'} Correctly flagged! {clause.category ? `[${clause.category}]` : ''}</span>}
                        {showWrong && <span style={{ color: 'var(--color-red)' }}>{'\u274C'} This was legitimate legal text. -50 pts</span>}
                        {showMissed && <span style={{ color: 'var(--color-orange)' }}>{'\u26A0\uFE0F'} MISSED! You agreed to this. {clause.category ? `[${clause.category}]` : ''}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit / Continue */}
            <div className="text-center mt-8 mb-12">
              {!revealed ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button className="pixel-btn" onClick={handleSubmit}>
                    {'\uD83D\uDD0D'} SUBMIT FLAGS ({flaggedClauses.size})
                  </button>
                  <button
                    className="pixel-btn"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                    onClick={() => { setTimerActive(false); setScreen('levels'); }}
                  >
                    DECLINE & EXIT
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {result && (
                    <div className="pixel-card rounded-lg p-4 inline-block" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                      <div className="pixel-text text-lg mb-2" style={{ color: 'var(--color-accent)' }}>
                        {result.score.toLocaleString()} PTS
                      </div>
                      <div className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                        <div>{'\u2705'} {result.correctFlags}/{result.totalAbsurd} absurd clauses found</div>
                        {result.falseFlags > 0 && <div style={{ color: 'var(--color-red)' }}>{'\u274C'} {result.falseFlags} false flags</div>}
                        {result.missedAbsurd > 0 && <div style={{ color: 'var(--color-orange)' }}>{'\u26A0\uFE0F'} {result.missedAbsurd} missed</div>}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button className="pixel-btn" onClick={goToResults}>
                      SEE FULL RESULTS
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RESULTS SCREEN
  // ============================================================
  if (screen === 'results' && result && currentLevel) {
    const missedClauses = currentLevel.clauses.filter(c => c.isAbsurd && !flaggedClauses.has(c.id));
    const grade = result.correctFlags === result.totalAbsurd && result.falseFlags === 0
      ? 'PERFECT'
      : result.correctFlags >= result.totalAbsurd * 0.8 && result.falseFlags <= 1
        ? 'GREAT'
        : result.correctFlags >= result.totalAbsurd * 0.5
          ? 'OKAY'
          : 'YIKES';

    const gradeColor = grade === 'PERFECT' ? 'var(--color-accent)' : grade === 'GREAT' ? 'var(--color-blue)' : grade === 'OKAY' ? 'var(--color-orange)' : 'var(--color-red)';
    const gradeEmoji = grade === 'PERFECT' ? '\uD83C\uDFC6' : grade === 'GREAT' ? '\uD83D\uDE0E' : grade === 'OKAY' ? '\uD83D\uDE10' : '\uD83D\uDE31';

    const nextIdx = TOS_LEVELS.findIndex(l => l.id === currentLevel.id) + 1;
    const hasNext = nextIdx < TOS_LEVELS.length;

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="pixel-card rounded-lg p-6 md:p-8 text-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="text-4xl mb-2">{gradeEmoji}</div>
            <h2 className="pixel-text text-base md:text-lg mb-1" style={{ color: gradeColor }}>
              {grade}!
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {currentLevel.company} TOS Review
            </p>

            <div className="pixel-text text-2xl mb-6" style={{ color: 'var(--color-accent)' }}>
              {result.score.toLocaleString()} PTS
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Found', value: `${result.correctFlags}/${result.totalAbsurd}`, color: 'var(--color-accent)' },
                { label: 'Missed', value: String(result.missedAbsurd), color: 'var(--color-orange)' },
                { label: 'False Flags', value: String(result.falseFlags), color: 'var(--color-red)' },
                { label: 'Time Left', value: `${result.timeRemaining}s`, color: 'var(--color-blue)' },
              ].map(stat => (
                <div key={stat.label} className="rounded-lg p-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</div>
                  <div className="pixel-text text-sm" style={{ color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* YOU AGREED TO... */}
            {missedClauses.length > 0 && (
              <div className="text-left mb-6">
                <h3 className="pixel-text text-xs mb-3 text-center" style={{ color: 'var(--color-red)' }}>
                  {'\u26A0\uFE0F'} YOU AGREED TO...
                </h3>
                <div className="space-y-2">
                  {missedClauses.map(clause => (
                    <div
                      key={clause.id}
                      className="rounded-md p-3 text-sm"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--color-red)', color: 'var(--color-text-secondary)' }}
                    >
                      {clause.text}
                      {clause.category && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
                          {clause.category}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {hasNext && (
                <button className="pixel-btn" onClick={nextLevel}>
                  NEXT COMPANY &rarr;
                </button>
              )}
              <button className="pixel-btn" onClick={() => startLevel(currentLevel)}>
                RETRY
              </button>
              <button
                className="pixel-btn"
                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                onClick={() => setScreen('levels')}
              >
                LEVEL SELECT
              </button>
              {!hasNext && (
                <button className="pixel-btn" onClick={() => setScreen('summary')} style={{ backgroundColor: 'var(--color-purple)' }}>
                  FINAL SUMMARY
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // SUMMARY SCREEN
  // ============================================================
  if (screen === 'summary') {
    const totalBest = Object.values(saveData.bestScores).reduce((a, b) => a + b, 0);
    const maxPossible = TOS_LEVELS.length * 1500; // rough estimate
    const completionPct = Math.round((saveData.levelsCompleted.length / TOS_LEVELS.length) * 100);

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="pixel-card rounded-lg p-6 md:p-8 text-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="text-5xl mb-3">{'\uD83D\uDCDC'}</div>
            <h2 className="pixel-text text-base md:text-lg mb-2" style={{ color: 'var(--color-accent)' }}>
              LEGAL REVIEW COMPLETE
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Your TOS Reading Career Summary
            </p>

            <div className="pixel-text text-3xl mb-2" style={{ color: 'var(--color-accent)' }}>
              {totalBest.toLocaleString()}
            </div>
            <div className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Total Best Score (est. max ~{maxPossible.toLocaleString()})
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Completed</div>
                <div className="pixel-text text-sm" style={{ color: 'var(--color-accent)' }}>{saveData.levelsCompleted.length}/{TOS_LEVELS.length}</div>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Completion</div>
                <div className="pixel-text text-sm" style={{ color: completionPct === 100 ? 'var(--color-accent)' : 'var(--color-orange)' }}>{completionPct}%</div>
              </div>
            </div>

            {/* Per-level breakdown */}
            <div className="text-left space-y-2 mb-6">
              {TOS_LEVELS.map(level => {
                const best = saveData.bestScores[level.id];
                const completed = saveData.levelsCompleted.includes(level.id);
                return (
                  <div
                    key={level.id}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-xs"
                    style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{level.emoji}</span>
                      <span style={{ color: 'var(--color-text)' }}>{level.company}</span>
                      <span className="pixel-text" style={{ fontSize: '0.5rem', color: getDifficultyColor(level.difficulty) }}>{level.difficulty}</span>
                    </div>
                    <div>
                      {completed ? (
                        <span className="mono-text" style={{ color: 'var(--color-accent)' }}>{best?.toLocaleString()} pts</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>---</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs mb-6 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
              {completionPct === 100
                ? 'Congratulations! You are now qualified to read Terms of Service professionally. Your soul remains your own... for now.'
                : 'Keep going! Every unread TOS is a soul sold to a corporation.'}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="pixel-btn" onClick={() => setScreen('levels')}>
                PLAY MORE
              </button>
              <Link href="/games" className="pixel-btn inline-block text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
                BACK TO ARCADE
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
