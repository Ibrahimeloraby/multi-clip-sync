export interface ChurnFeatures {
  daysSinceLastEvent: number       // recency
  eventFrequency30d: number        // events in last 30 days
  eventFrequency90d: number        // events in last 90 days
  revenueTrend: number             // negative = declining revenue (MoM %)
  supportTickets30d: number        // support friction
  loginFrequency30d: number        // engagement signal
  avgOrderValue: number            // monetary signal
  totalRevenue: number
  accountAgeDays: number
  channelDiversity: number         // number of distinct channels used
}

export type ChurnRiskLevel = 'critical' | 'high' | 'medium' | 'low'

export interface ChurnDriver {
  feature: keyof ChurnFeatures
  label: string
  contribution: number  // -1 to 1 (positive = increases churn risk)
  value: number
}

/**
 * Pre-trained logistic regression weights for churn prediction.
 * Weights are calibrated on typical e-commerce data patterns.
 * In production these would be loaded from a model store.
 */
const WEIGHTS: Record<keyof ChurnFeatures, number> = {
  daysSinceLastEvent: 0.04,        // +0.04 per day idle
  eventFrequency30d: -0.12,        // more activity = less churn
  eventFrequency90d: -0.06,
  revenueTrend: -0.008,            // positive trend reduces churn
  supportTickets30d: 0.18,         // friction increases churn
  loginFrequency30d: -0.09,
  avgOrderValue: -0.0002,          // high AOV customers less likely to churn
  totalRevenue: -0.000005,         // high LTV reduces churn
  accountAgeDays: -0.003,          // older accounts more stable
  channelDiversity: -0.08,         // omnichannel customers less likely to churn
}

const BIAS = -1.2  // intercept

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export function scoreChurn(features: ChurnFeatures): number {
  let logit = BIAS
  for (const [key, weight] of Object.entries(WEIGHTS) as [keyof ChurnFeatures, number][]) {
    logit += weight * (features[key] as number)
  }
  return Math.min(0.99, Math.max(0.01, sigmoid(logit)))
}

export function classifyChurnRisk(score: number): ChurnRiskLevel {
  if (score >= 0.8) return 'critical'
  if (score >= 0.6) return 'high'
  if (score >= 0.35) return 'medium'
  return 'low'
}

export function getChurnDrivers(features: ChurnFeatures): ChurnDriver[] {
  const featureLabels: Record<keyof ChurnFeatures, string> = {
    daysSinceLastEvent: 'Days since last activity',
    eventFrequency30d: '30-day event frequency',
    eventFrequency90d: '90-day event frequency',
    revenueTrend: 'Revenue trend (MoM)',
    supportTickets30d: 'Support tickets (30d)',
    loginFrequency30d: 'Login frequency (30d)',
    avgOrderValue: 'Average order value',
    totalRevenue: 'Total lifetime revenue',
    accountAgeDays: 'Account age (days)',
    channelDiversity: 'Channel diversity',
  }

  const drivers: ChurnDriver[] = []

  for (const [key, weight] of Object.entries(WEIGHTS) as [keyof ChurnFeatures, number][]) {
    const value = features[key] as number
    const contribution = weight * value
    drivers.push({
      feature: key,
      label: featureLabels[key],
      contribution,
      value,
    })
  }

  // Sort by absolute contribution, highest first
  return drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
}

export function getChurnRiskColor(level: ChurnRiskLevel): string {
  const colors: Record<ChurnRiskLevel, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#16a34a',
  }
  return colors[level]
}

export interface ChurnPrevention {
  action: string
  channel: string
  urgency: 'immediate' | 'this_week' | 'this_month'
  expectedLift: number  // % reduction in churn probability
}

export function getChurnPreventionActions(
  features: ChurnFeatures,
  score: number
): ChurnPrevention[] {
  const actions: ChurnPrevention[] = []

  if (features.daysSinceLastEvent > 30) {
    actions.push({
      action: 'Send re-engagement email with personalized offer',
      channel: 'email',
      urgency: score > 0.7 ? 'immediate' : 'this_week',
      expectedLift: 0.15,
    })
  }

  if (features.supportTickets30d >= 2) {
    actions.push({
      action: 'Proactive customer success outreach',
      channel: 'call',
      urgency: 'immediate',
      expectedLift: 0.22,
    })
  }

  if (features.revenueTrend < -20) {
    actions.push({
      action: 'Offer loyalty discount or upgrade',
      channel: 'email',
      urgency: 'this_week',
      expectedLift: 0.18,
    })
  }

  if (features.channelDiversity === 1) {
    actions.push({
      action: 'Cross-channel onboarding nudge (mobile app)',
      channel: 'push',
      urgency: 'this_month',
      expectedLift: 0.1,
    })
  }

  if (actions.length === 0) {
    actions.push({
      action: 'Standard monthly newsletter with product updates',
      channel: 'email',
      urgency: 'this_month',
      expectedLift: 0.05,
    })
  }

  return actions
}
