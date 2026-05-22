import type { ReputationTier, RuleStatus } from '../types/index.js';
import { CONFIDENCE_WEIGHTS, CONFIDENCE_THRESHOLDS } from '../constants/index.js';

// ─── Parameter Types ──────────────────────────────────────────────────────────

export interface ComputeConfidenceParams {
  /** Number of user confirmations for this rule */
  confirmations: number;
  /** Whether any evidence attachment is a receipt/invoice image */
  has_receipt_evidence: boolean;
  /** Whether any evidence attachment is a screenshot */
  has_screenshot_evidence: boolean;
  /** Reputation tier of the user who submitted the rule */
  submitter_tier: ReputationTier;
  /** Whether an admin has explicitly verified this rule */
  admin_verified: boolean;
  /** Number of disputes raised against this rule */
  disputes: number;
  /** Calendar days since the last confirmation (0 if confirmed today) */
  days_since_last_confirmation: number;
  /** Whether this rule conflicts with another rule that has a higher confidence score */
  conflicts_with_higher_confidence: boolean;
}

// ─── computeConfidenceScore ───────────────────────────────────────────────────

/**
 * Computes the confidence score (0–100) for a merchant rule.
 *
 * Formula:
 *   base = 0
 *   + min(confirmations * 8, 40)
 *   + (has_receipt_evidence ? 20 : 0)
 *   + (has_screenshot_evidence ? 10 : 0)
 *   + submitter_reputation_bonus (0/5/10/15/20 by tier)
 *   + (admin_verified ? 30 : 0)
 *   − disputes * 12
 *   − days_since_last_confirmation * 0.15
 *   − (conflicts_with_higher_confidence ? 25 : 0)
 *
 * Result is clamped to [0, 100].
 */
export function computeConfidenceScore(params: ComputeConfidenceParams): number {
  const {
    confirmations,
    has_receipt_evidence,
    has_screenshot_evidence,
    submitter_tier,
    admin_verified,
    disputes,
    days_since_last_confirmation,
    conflicts_with_higher_confidence,
  } = params;

  const w = CONFIDENCE_WEIGHTS;

  let score = 0;

  // Confirmations (capped)
  score += Math.min(confirmations * w.per_confirmation, w.max_confirmation_points);

  // Evidence bonuses
  if (has_receipt_evidence) score += w.receipt_evidence_bonus;
  if (has_screenshot_evidence) score += w.screenshot_evidence_bonus;

  // Submitter reputation bonus
  score += w.submitter_reputation_bonus[submitter_tier];

  // Admin verification
  if (admin_verified) score += w.admin_verified_bonus;

  // Dispute penalty
  score -= disputes * w.per_dispute_penalty;

  // Temporal decay
  score -= days_since_last_confirmation * w.daily_decay_rate;

  // Conflict penalty
  if (conflicts_with_higher_confidence) score -= w.conflict_penalty;

  // Clamp to [0, 100]
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

// ─── getStatusFromScore ───────────────────────────────────────────────────────

/**
 * Maps a confidence score to a RuleStatus.
 *
 * If the rule has active disputes and score < 60, the status is 'disputed'.
 * Otherwise the status is determined by CONFIDENCE_THRESHOLDS.
 */
export function getStatusFromScore(score: number, hasDisputes: boolean): RuleStatus {
  const clamped = Math.max(0, Math.min(100, score));

  // Active disputes override provisional/pending statuses
  if (hasDisputes && clamped < 60) {
    return 'disputed';
  }

  const [pendingMin, pendingMax] = CONFIDENCE_THRESHOLDS['pending'];
  const [provisionalMin, provisionalMax] = CONFIDENCE_THRESHOLDS['provisional'];
  const [verifiedMin, verifiedMax] = CONFIDENCE_THRESHOLDS['verified'];

  if (clamped >= pendingMin && clamped <= pendingMax) return 'pending';
  if (clamped >= provisionalMin && clamped <= provisionalMax) return 'provisional';
  if (clamped >= verifiedMin && clamped <= verifiedMax) return 'verified';

  // score >= 85 (trusted range)
  return 'trusted';
}
