export type RuleStatus =
  | "pending"
  | "provisional"
  | "verified"
  | "trusted"
  | "disputed"
  | "expired";

export type ReputationTier =
  | "newcomer"
  | "contributor"
  | "trusted"
  | "expert"
  | "maven";

export interface ConfidenceParams {
  confirmations: number;
  hasReceiptEvidence: boolean;
  hasScreenshotEvidence: boolean;
  submitterTier: ReputationTier;
  adminVerified: boolean;
  disputes: number;
  daysSinceLastConfirmation: number;
  conflictsWithHigherConfidence: boolean;
}

const TIER_BONUS: Record<ReputationTier, number> = {
  newcomer: 0,
  contributor: 5,
  trusted: 10,
  expert: 15,
  maven: 20,
};

export function computeConfidenceScore(params: ConfidenceParams): number {
  let score = 0;

  score += Math.min(params.confirmations * 8, 40);
  score += params.hasReceiptEvidence ? 20 : 0;
  score += params.hasScreenshotEvidence ? 10 : 0;
  score += TIER_BONUS[params.submitterTier];
  score += params.adminVerified ? 30 : 0;
  score -= params.disputes * 12;
  score -= params.daysSinceLastConfirmation * 0.15;
  score -= params.conflictsWithHigherConfidence ? 25 : 0;

  return Math.max(0, Math.round(score));
}

export function getStatusFromScore(
  score: number,
  hasActiveDisputes: boolean
): RuleStatus {
  if (hasActiveDisputes && score < 60) return "disputed";
  if (score >= 85) return "trusted";
  if (score >= 60) return "verified";
  if (score >= 30) return "provisional";
  return "pending";
}
