export interface CustomerEvent {
  customerId: string
  occurredAt: Date
  revenue: number
  eventType: string
}

export interface RFMScore {
  customerId: string
  recencyDays: number
  frequency: number
  monetary: number
  recencyScore: number   // 1-5
  frequencyScore: number // 1-5
  monetaryScore: number  // 1-5
  rfmTotal: number       // 3-15
  segment: RFMSegment
}

export type RFMSegment =
  | 'Champions'
  | 'Loyal Customers'
  | 'Potential Loyalists'
  | 'New Customers'
  | 'Promising'
  | 'Needs Attention'
  | 'About To Sleep'
  | 'At Risk'
  | 'Cannot Lose Them'
  | 'Hibernating'
  | 'Lost'

function quintile(values: number[], value: number, higherIsBetter: boolean): number {
  const sorted = [...values].sort((a, b) => a - b)
  const len = sorted.length
  if (len === 0) return 3
  const idx = sorted.findIndex((v) => value <= v)
  const rank = idx === -1 ? len : idx
  const pct = rank / len
  if (higherIsBetter) {
    if (pct >= 0.8) return 5
    if (pct >= 0.6) return 4
    if (pct >= 0.4) return 3
    if (pct >= 0.2) return 2
    return 1
  } else {
    // lower is better (recency days)
    if (pct <= 0.2) return 5
    if (pct <= 0.4) return 4
    if (pct <= 0.6) return 3
    if (pct <= 0.8) return 2
    return 1
  }
}

function classifySegment(r: number, f: number, m: number): RFMSegment {
  const total = r + f + m
  if (r >= 4 && f >= 4 && m >= 4) return 'Champions'
  if (r >= 3 && f >= 4 && m >= 3) return 'Loyal Customers'
  if (r >= 4 && f <= 2) return 'New Customers'
  if (r >= 3 && f >= 3 && m <= 2) return 'Potential Loyalists'
  if (r === 3 && f === 3 && m === 3) return 'Needs Attention'
  if (r === 3 && f >= 2 && m >= 2 && total >= 7) return 'Promising'
  if (r === 2 && f === 3 && m === 3) return 'About To Sleep'
  if (r <= 3 && f >= 4 && m >= 4) return 'At Risk'
  if (r <= 2 && f >= 4) return 'Cannot Lose Them'
  if (r <= 2 && f <= 2 && m >= 3) return 'Hibernating'
  if (r === 1 && total <= 5) return 'Lost'
  return 'Needs Attention'
}

export function computeRFM(events: CustomerEvent[], referenceDate: Date = new Date()): RFMScore[] {
  // Aggregate per customer
  const customerMap = new Map<
    string,
    { lastDate: Date; purchaseDates: Date[]; revenue: number }
  >()

  for (const event of events) {
    const entry = customerMap.get(event.customerId) ?? {
      lastDate: event.occurredAt,
      purchaseDates: [],
      revenue: 0,
    }
    if (event.occurredAt > entry.lastDate) entry.lastDate = event.occurredAt
    if (event.revenue > 0) {
      entry.purchaseDates.push(event.occurredAt)
      entry.revenue += event.revenue
    }
    customerMap.set(event.customerId, entry)
  }

  const rawScores = Array.from(customerMap.entries()).map(([customerId, data]) => ({
    customerId,
    recencyDays: Math.floor(
      (referenceDate.getTime() - data.lastDate.getTime()) / (1000 * 60 * 60 * 24)
    ),
    frequency: data.purchaseDates.length,
    monetary: data.revenue,
  }))

  const allRecency = rawScores.map((s) => s.recencyDays)
  const allFrequency = rawScores.map((s) => s.frequency)
  const allMonetary = rawScores.map((s) => s.monetary)

  return rawScores.map((s) => {
    const r = quintile(allRecency, s.recencyDays, false) // lower days = better
    const f = quintile(allFrequency, s.frequency, true)
    const m = quintile(allMonetary, s.monetary, true)
    return {
      customerId: s.customerId,
      recencyDays: s.recencyDays,
      frequency: s.frequency,
      monetary: s.monetary,
      recencyScore: r,
      frequencyScore: f,
      monetaryScore: m,
      rfmTotal: r + f + m,
      segment: classifySegment(r, f, m),
    }
  })
}

export function getSegmentColor(segment: RFMSegment): string {
  const colors: Record<RFMSegment, string> = {
    Champions: '#10b981',
    'Loyal Customers': '#6366f1',
    'Potential Loyalists': '#8b5cf6',
    'New Customers': '#3b82f6',
    Promising: '#06b6d4',
    'Needs Attention': '#f59e0b',
    'About To Sleep': '#f97316',
    'At Risk': '#ef4444',
    'Cannot Lose Them': '#dc2626',
    Hibernating: '#6b7280',
    Lost: '#374151',
  }
  return colors[segment] ?? '#6b7280'
}

export function getRFMSegmentDescription(segment: RFMSegment): string {
  const descriptions: Record<RFMSegment, string> = {
    Champions: 'Bought recently, buy often and spend the most.',
    'Loyal Customers': 'Spend good money. Responsive to promotions.',
    'Potential Loyalists': 'Recent customers with average frequency.',
    'New Customers': 'Bought most recently, but not often.',
    Promising: 'Recent shoppers, but haven\'t spent much.',
    'Needs Attention': 'Above average recency, frequency and monetary values.',
    'About To Sleep': 'Below average recency, frequency and monetary values.',
    'At Risk': 'Spent big money and purchased often, but long time ago.',
    'Cannot Lose Them': 'Made biggest purchases, and often, but haven\'t returned.',
    Hibernating: 'Last purchase was long back, low spenders and low number of orders.',
    Lost: 'Lowest recency, frequency and monetary scores.',
  }
  return descriptions[segment] ?? ''
}
