export interface TransactionHistory {
  customerId: string
  transactions: Array<{
    date: Date
    amount: number
  }>
  firstPurchaseDate: Date
  lastPurchaseDate: Date
}

export interface CLVEstimate {
  customerId: string
  historicalCLV: number
  predictedCLV: number         // over timeHorizon days
  predictedTransactions: number
  avgOrderValue: number
  purchaseFrequencyPerYear: number
  confidenceLow: number
  confidenceHigh: number
}

export interface PurchasePrediction {
  customerId: string
  predictedNextPurchaseDate: Date
  probabilityWithin30Days: number
  probabilityWithin90Days: number
  expectedAmount: number
}

/**
 * BG/NBD-inspired CLV estimation.
 * Simplified but realistic: uses alive probability + purchase rate estimation.
 * BG/NBD parameters α, β, r, a, b are approximated from the transaction pattern.
 */

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
}

function geometricMean(values: number[]): number {
  if (values.length === 0) return 0
  return Math.exp(values.reduce((sum, v) => sum + Math.log(Math.max(v, 0.001)), 0) / values.length)
}

/**
 * Estimate the probability a customer is still "alive" (not churned).
 * Based on recency and frequency patterns.
 */
function estimateAliveProb(history: TransactionHistory, referenceDate: Date): number {
  const n = history.transactions.length
  if (n === 0) return 0.05

  const T = daysBetween(history.firstPurchaseDate, referenceDate)  // total observation period
  const tx = daysBetween(history.firstPurchaseDate, history.lastPurchaseDate)  // recency
  const recencyRatio = tx / Math.max(T, 1)

  // If customer purchased recently relative to their history, they're likely alive
  const daysSinceLast = daysBetween(history.lastPurchaseDate, referenceDate)

  // Estimate expected inter-purchase time
  let avgInterPurchase = 30  // default 30 days
  if (n >= 2) {
    const sorted = [...history.transactions].sort((a, b) => a.date.getTime() - b.date.getTime())
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date))
    }
    avgInterPurchase = geometricMean(gaps)
  }

  // Alive probability decreases as time since last purchase exceeds expected interval
  const relativeRecency = daysSinceLast / Math.max(avgInterPurchase, 1)
  const aliveProb = Math.exp(-0.5 * relativeRecency) * (0.5 + 0.5 * recencyRatio)

  return Math.min(0.99, Math.max(0.01, aliveProb))
}

export function estimateCLV(
  history: TransactionHistory,
  timeHorizonDays: number,
  discountRate = 0.1,
  referenceDate: Date = new Date()
): CLVEstimate {
  const n = history.transactions.length
  const totalRevenue = history.transactions.reduce((sum, t) => sum + t.amount, 0)
  const historicalCLV = totalRevenue

  if (n === 0) {
    return {
      customerId: history.customerId,
      historicalCLV: 0,
      predictedCLV: 0,
      predictedTransactions: 0,
      avgOrderValue: 0,
      purchaseFrequencyPerYear: 0,
      confidenceLow: 0,
      confidenceHigh: 0,
    }
  }

  const avgOrderValue = totalRevenue / n
  const observationDays = Math.max(
    daysBetween(history.firstPurchaseDate, referenceDate),
    1
  )
  const purchaseFrequencyPerYear = (n / observationDays) * 365

  // BG/NBD simplified: expected transactions = alive_prob * freq_rate * horizon
  const aliveProb = estimateAliveProb(history, referenceDate)
  const dailyRate = n / observationDays
  const predictedTransactions = aliveProb * dailyRate * timeHorizonDays

  // Apply discount rate (daily discount)
  const dailyDiscount = discountRate / 365
  const discountFactor = timeHorizonDays > 0
    ? (1 - Math.exp(-dailyDiscount * timeHorizonDays)) / dailyDiscount
    : timeHorizonDays

  const predictedCLV = predictedTransactions * avgOrderValue * (discountFactor / timeHorizonDays)

  // Confidence interval (±30% of predicted, adjusted by data volume)
  const uncertainty = Math.max(0.1, 0.5 - 0.05 * n)
  return {
    customerId: history.customerId,
    historicalCLV,
    predictedCLV,
    predictedTransactions,
    avgOrderValue,
    purchaseFrequencyPerYear,
    confidenceLow: predictedCLV * (1 - uncertainty),
    confidenceHigh: predictedCLV * (1 + uncertainty),
  }
}

export function predictNextPurchase(
  history: TransactionHistory,
  referenceDate: Date = new Date()
): PurchasePrediction {
  const n = history.transactions.length
  const avgOrderValue = n > 0
    ? history.transactions.reduce((sum, t) => sum + t.amount, 0) / n
    : 0

  if (n === 0) {
    return {
      customerId: history.customerId,
      predictedNextPurchaseDate: new Date(referenceDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      probabilityWithin30Days: 0.1,
      probabilityWithin90Days: 0.25,
      expectedAmount: 0,
    }
  }

  // Estimate inter-purchase interval
  const sorted = [...history.transactions].sort((a, b) => a.date.getTime() - b.date.getTime())
  let avgInterPurchaseDays = 30
  if (n >= 2) {
    const gaps = sorted.slice(1).map((t, i) => daysBetween(sorted[i].date, t.date))
    avgInterPurchaseDays = geometricMean(gaps)
  }

  // Exponential distribution: P(next purchase within t days) = 1 - e^(-rate * t)
  const rate = 1 / Math.max(avgInterPurchaseDays, 1)
  const daysSinceLast = daysBetween(history.lastPurchaseDate, referenceDate)
  const expectedDaysUntilNext = Math.max(0, avgInterPurchaseDays - daysSinceLast)

  const predictedNextPurchaseDate = new Date(
    referenceDate.getTime() + expectedDaysUntilNext * 24 * 60 * 60 * 1000
  )

  const aliveProb = estimateAliveProb(history, referenceDate)
  const p30 = aliveProb * (1 - Math.exp(-rate * 30))
  const p90 = aliveProb * (1 - Math.exp(-rate * 90))

  return {
    customerId: history.customerId,
    predictedNextPurchaseDate,
    probabilityWithin30Days: Math.min(0.99, p30),
    probabilityWithin90Days: Math.min(0.99, p90),
    expectedAmount: avgOrderValue,
  }
}

export function calculateHistoricalCLV(history: TransactionHistory): number {
  return history.transactions.reduce((sum, t) => sum + t.amount, 0)
}
