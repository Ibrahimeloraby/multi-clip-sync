import type { ReputationTier } from '../types/index.js';

// ─── Reputation Tiers ─────────────────────────────────────────────────────────

export const REPUTATION_TIERS: Record<ReputationTier, number> = {
  newcomer: 0,
  contributor: 50,
  trusted: 250,
  expert: 750,
  maven: 2000,
} as const;

export const REPUTATION_TIER_ORDER: ReputationTier[] = [
  'newcomer',
  'contributor',
  'trusted',
  'expert',
  'maven',
];

// ─── Reputation Events ────────────────────────────────────────────────────────

export const REPUTATION_EVENTS: Record<string, number> = {
  // Rule contributions
  rule_submitted: 5,
  rule_verified: 15,
  rule_trusted: 25,
  rule_disputed_penalty: -10,
  rule_expired_penalty: -5,

  // Confirmations
  rule_confirmed: 3,
  rule_confirmation_disputed: -2,

  // Transactions
  transaction_logged: 1,
  receipt_uploaded: 2,
  recommendation_followed: 2,

  // Community actions
  merchant_created: 10,
  merchant_verified_bonus: 5,
  upvote_received: 1,
  downvote_received: -1,

  // Admin actions
  admin_bonus: 50,
  admin_penalty: -50,

  // Monthly rewards
  monthly_top_10: 20,
  monthly_top_1: 50,
} as const;

// ─── Confidence Thresholds ────────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLDS: Record<string, [number, number]> = {
  pending: [0, 29],
  provisional: [30, 59],
  verified: [60, 84],
  trusted: [85, 100],
} as const;

// ─── Confidence Weights ───────────────────────────────────────────────────────

export const CONFIDENCE_WEIGHTS = {
  /** Points per confirmation, capped at MAX_CONFIRMATION_POINTS */
  per_confirmation: 8,
  /** Maximum points from confirmations */
  max_confirmation_points: 40,
  /** Bonus for receipt/invoice evidence */
  receipt_evidence_bonus: 20,
  /** Bonus for screenshot evidence */
  screenshot_evidence_bonus: 10,
  /** Submitter reputation bonus by tier */
  submitter_reputation_bonus: {
    newcomer: 0,
    contributor: 5,
    trusted: 10,
    expert: 15,
    maven: 20,
  } as Record<ReputationTier, number>,
  /** Bonus when an admin explicitly verifies the rule */
  admin_verified_bonus: 30,
  /** Penalty per dispute */
  per_dispute_penalty: 12,
  /** Daily decay for each day since last confirmation */
  daily_decay_rate: 0.15,
  /** Penalty if rule conflicts with a higher-confidence rule */
  conflict_penalty: 25,
} as const;

// ─── UAE Loyalty Programs ─────────────────────────────────────────────────────

export const UAE_PROGRAM_SLUGS: string[] = [
  // Airlines
  'emirates-skywards',
  'etihad-guest',
  'flydubai-open-skies',
  'air-arabia-airewards',

  // Hotels
  'marriott-bonvoy',
  'hilton-honors',
  'ihg-one-rewards',
  'accor-live-limitless',
  'rotana-rewards',

  // Banks
  'mashreq-smiles',
  'enbd-skywards',
  'adcb-touchpoints',
  'fab-etihad-guest',
  'hsbc-air-miles',
  'cbd-etihad',
  'rakbank-titanium',

  // Retail
  'noon-noonpoints',
  'carrefour-my-club',
  'lulu-lulu-rewards',
  'spinneys-smart-savers',
  'emaar-one',
  'mall-of-the-emirates',
  'dubai-mall-dc',

  // Telecom
  'etisalat-smiles',
  'du-du-rewards',

  // Government / Transport
  'rta-nol-plus',
  'dubai-now',

  // Fitness & Entertainment
  'wellness-pass',
  'du-arena',
  'vox-cinemas-rewards',
  'reel-cinemas-rewards',
] as const;

// ─── Spend Categories ─────────────────────────────────────────────────────────

export const SPEND_CATEGORIES: string[] = [
  'groceries',
  'dining',
  'fuel',
  'online',
  'travel',
  'telecom',
  'entertainment',
  'other',
] as const;

// ─── Free Tier Limits ─────────────────────────────────────────────────────────

export const MAX_PROGRAMS_FREE_TIER = 3;
export const MAX_RECEIPT_UPLOADS_FREE = 10;

// ─── General Constants ────────────────────────────────────────────────────────

export const UAE_TIMEZONE = 'Asia/Dubai'; // UTC+4
export const GEOFENCE_RADIUS_METERS = 200;
export const GEOFENCE_COOLDOWN_HOURS = 4;
export const MAX_GEOFENCE_PROMPTS_PER_DAY = 2;
export const RULE_EXPIRY_NO_ACTIVITY_DAYS = 30;
export const RULE_AUTO_PROVISIONAL_DAYS = 180;
