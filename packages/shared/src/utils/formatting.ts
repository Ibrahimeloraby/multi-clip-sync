import type { ReputationTier } from '../types/index.js';
import { REPUTATION_TIERS, REPUTATION_TIER_ORDER } from '../constants/index.js';

// ─── Currency Formatting ──────────────────────────────────────────────────────

/**
 * Formats a number as UAE Dirham string.
 * e.g. 1234.5 → "AED 1,234.50"
 */
export function formatAED(amount: number): string {
  const formatted = new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `AED ${formatted}`;
}

// ─── Points Formatting ────────────────────────────────────────────────────────

/** Program-specific point labels */
const PROGRAM_POINT_LABELS: Record<string, string> = {
  'emirates-skywards': 'Skywards Miles',
  'etihad-guest': 'Etihad Miles',
  'flydubai-open-skies': 'Open Skies Points',
  'air-arabia-airewards': 'airRewards Points',
  'marriott-bonvoy': 'Bonvoy Points',
  'hilton-honors': 'Hilton Points',
  'ihg-one-rewards': 'IHG Points',
  'accor-live-limitless': 'ALL Points',
  'rotana-rewards': 'Rotana Points',
  'mashreq-smiles': 'Smiles Points',
  'enbd-skywards': 'Skywards Miles',
  'adcb-touchpoints': 'Touchpoints',
  'fab-etihad-guest': 'Etihad Miles',
  'hsbc-air-miles': 'Air Miles',
  'cbd-etihad': 'Etihad Miles',
  'rakbank-titanium': 'RAKrewards Points',
  'noon-noonpoints': 'NoonPoints',
  'carrefour-my-club': 'MyClub Points',
  'lulu-lulu-rewards': 'LuLu Points',
  'spinneys-smart-savers': 'Smart Savers Points',
  'emaar-one': 'Emaar One Points',
  'etisalat-smiles': 'Smiles Points',
  'du-du-rewards': 'Du Rewards Points',
  'rta-nol-plus': 'Nol Credits',
  'vox-cinemas-rewards': 'VOX Points',
  'reel-cinemas-rewards': 'Reel Points',
};

/**
 * Formats a points amount with the program-specific label.
 * e.g. formatPoints(1500, 'emirates-skywards') → "1,500 Skywards Miles"
 */
export function formatPoints(amount: number, programSlug: string): string {
  const label = PROGRAM_POINT_LABELS[programSlug] ?? 'Points';
  const formatted = new Intl.NumberFormat('en-AE').format(Math.round(amount));
  return `${formatted} ${label}`;
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

/**
 * Formats an ISO date string as a human-readable relative date.
 * e.g. "2025-07-15T00:00:00Z" → "in 57 days" or "in 2 months"
 *
 * Arabic locale is respected when lang === 'ar'.
 */
export function formatExpiry(date: string, lang: 'en' | 'ar'): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const locale = lang === 'ar' ? 'ar-AE' : 'en-AE';

  // Already expired
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (lang === 'ar') {
      if (absDays < 30) return `منذ ${absDays} يوم`;
      if (absDays < 365) return `منذ ${Math.floor(absDays / 30)} شهر`;
      return `منذ ${Math.floor(absDays / 365)} سنة`;
    }
    if (absDays === 1) return 'yesterday';
    if (absDays < 30) return `${absDays} days ago`;
    if (absDays < 365) return `${Math.floor(absDays / 30)} months ago`;
    return `${Math.floor(absDays / 365)} years ago`;
  }

  // Expires today
  if (diffDays === 0) {
    return lang === 'ar' ? 'ينتهي اليوم' : 'expires today';
  }

  // Expires tomorrow
  if (diffDays === 1) {
    return lang === 'ar' ? 'ينتهي غداً' : 'expires tomorrow';
  }

  // Within 7 days — show exact day count
  if (diffDays <= 7) {
    if (lang === 'ar') return `ينتهي خلال ${diffDays} أيام`;
    return `expires in ${diffDays} days`;
  }

  // Within 60 days — show weeks
  if (diffDays <= 60) {
    const weeks = Math.round(diffDays / 7);
    if (lang === 'ar') return `ينتهي خلال ${weeks} أسبوع`;
    return `expires in ${weeks} week${weeks !== 1 ? 's' : ''}`;
  }

  // Use Intl.RelativeTimeFormat for longer periods
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffDays < 365) {
    const months = Math.round(diffDays / 30);
    return rtf.format(months, 'month');
  }

  const years = Math.round(diffDays / 365);
  return rtf.format(years, 'year');
}

// ─── Reputation Helpers ───────────────────────────────────────────────────────

/**
 * Returns the ReputationTier for a given score.
 */
export function getReputationTier(score: number): ReputationTier {
  let currentTier: ReputationTier = 'newcomer';
  for (const tier of REPUTATION_TIER_ORDER) {
    if (score >= REPUTATION_TIERS[tier]) {
      currentTier = tier;
    } else {
      break;
    }
  }
  return currentTier;
}

export interface TierProgress {
  tier: ReputationTier;
  nextTier: ReputationTier | null;
  /** Progress towards next tier as a fraction 0–1 */
  progress: number;
  /** Points needed to reach the next tier; null if already at max tier */
  pointsToNext: number | null;
}

/**
 * Returns detailed tier progress information for a given score.
 */
export function getTierProgress(score: number): TierProgress {
  const tier = getReputationTier(score);
  const tierIndex = REPUTATION_TIER_ORDER.indexOf(tier);
  const isMaxTier = tierIndex === REPUTATION_TIER_ORDER.length - 1;

  if (isMaxTier) {
    return {
      tier,
      nextTier: null,
      progress: 1,
      pointsToNext: null,
    };
  }

  const nextTier = REPUTATION_TIER_ORDER[tierIndex + 1];
  const currentThreshold = REPUTATION_TIERS[tier];
  const nextThreshold = REPUTATION_TIERS[nextTier];
  const pointsIntoTier = score - currentThreshold;
  const tierRange = nextThreshold - currentThreshold;
  const progress = Math.min(1, Math.max(0, pointsIntoTier / tierRange));
  const pointsToNext = nextThreshold - score;

  return {
    tier,
    nextTier,
    progress,
    pointsToNext: Math.max(0, pointsToNext),
  };
}
