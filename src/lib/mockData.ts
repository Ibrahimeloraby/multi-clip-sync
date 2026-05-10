// ============================================================
// Realistic mock data for AI Customer Journey Platform
// Industry: E-commerce (mixed B2C)
// ============================================================

export interface MockCustomer {
  id: string
  email: string
  name: string
  country: string
  city: string
  totalRevenue: number
  transactionCount: number
  firstSeenAt: string
  lastSeenAt: string
  churnScore: number
  clvScore: number
  rfmSegment: string
  rfmRecency: number
  rfmFrequency: number
  rfmMonetary: number
  daysSinceLastEvent: number
  channel: string
  attributes: Record<string, unknown>
}

export interface MockEvent {
  id: string
  customerId: string
  channel: string
  eventType: string
  revenue?: number
  occurredAt: string
  properties: Record<string, unknown>
}

export interface MockSegment {
  id: string
  name: string
  description: string
  segmentType: string
  memberCount: number
  avgCLV: number
  churnRate: number
  color: string
  memberIds?: string[]
}

export interface MockKPISnapshot {
  date: string
  totalCustomers: number
  activeCustomers30d: number
  newCustomers: number
  churnedCustomers: number
  churnRate: number
  totalRevenue: number
  avgCLV: number
  avgOrderValue: number
  winBackRate: number
  retentionRate30d: number
  momGrowthRate: number
}

export interface MockAlert {
  id: string
  name: string
  metric: string
  operator: string
  threshold: number
  severity: string
  isActive: boolean
  triggeredCount: number
  lastTriggeredAt?: string
  lastValue: number
}

export interface MockPrediction {
  customerId: string
  customerName: string
  customerEmail: string
  churnScore: number
  churnRisk: string
  predictedChurnDate?: string
  predictedCLV: number
  predictedNextPurchaseDate: string
  probabilityWithin30Days: number
  recommendedAction: string
  urgency: string
  revenueAtRisk: number
}

// ============================================================
// CUSTOMERS (50 mock customers)
// ============================================================

const FIRST_NAMES = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Isabella', 'Mason', 'Sophia', 'Lucas', 'Mia', 'Benjamin', 'Charlotte', 'Elijah', 'Amelia', 'Logan', 'Harper', 'James', 'Evelyn', 'Oliver', 'Sarah', 'Michael', 'Aisha', 'Chen', 'Priya', 'Carlos', 'Yuki', 'Ahmed', 'Fatima', 'Liu']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Lee', 'Walker', 'Kumar', 'Chen', 'Patel', 'Rodriguez', 'Kim', 'Nguyen', 'Santos', 'Ali', 'Müller', 'Tanaka']
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'London', 'Paris', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'São Paulo', 'Mumbai', 'Singapore', 'Dubai', 'Amsterdam']
const COUNTRIES = ['US', 'US', 'US', 'US', 'GB', 'FR', 'DE', 'JP', 'AU', 'CA', 'BR', 'IN', 'SG', 'AE', 'NL']
const CHANNELS = ['web', 'mobile', 'email', 'in_store', 'call_center']
const RFM_SEGMENTS = ['Champions', 'Loyal Customers', 'At Risk', 'Hibernating', 'Lost', 'New Customers', 'Potential Loyalists', 'Needs Attention']

function seededRand(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const rand = seededRand(42)

function randomDate(daysAgo: number, spreadDays: number): string {
  const ms = Date.now() - (daysAgo + rand() * spreadDays) * 24 * 60 * 60 * 1000
  return new Date(ms).toISOString()
}

export const mockCustomers: MockCustomer[] = Array.from({ length: 50 }, (_, i) => {
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length]
  const lastName = LAST_NAMES[(i * 3) % LAST_NAMES.length]
  const cityIdx = Math.floor(rand() * CITIES.length)
  const lastSeenDaysAgo = Math.floor(rand() * 180)
  const firstSeenDaysAgo = lastSeenDaysAgo + Math.floor(rand() * 730 + 30)
  const txCount = Math.floor(rand() * 30 + 1)
  const avgOrder = 45 + rand() * 250
  const totalRevenue = parseFloat((txCount * avgOrder).toFixed(2))
  const churnScore = parseFloat(Math.min(0.99, Math.max(0.02, (lastSeenDaysAgo / 180) * 0.8 + rand() * 0.3 - 0.15)).toFixed(3))
  const rfmR = Math.max(1, Math.min(5, Math.round(5 - lastSeenDaysAgo / 40))) as 1|2|3|4|5
  const rfmF = Math.max(1, Math.min(5, Math.round(txCount / 6))) as 1|2|3|4|5
  const rfmM = Math.max(1, Math.min(5, Math.round(totalRevenue / 800))) as 1|2|3|4|5
  const segmentIdx = Math.floor(rand() * RFM_SEGMENTS.length)

  return {
    id: `cust-${String(i + 1).padStart(3, '0')}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
    name: `${firstName} ${lastName}`,
    country: COUNTRIES[cityIdx],
    city: CITIES[cityIdx],
    totalRevenue,
    transactionCount: txCount,
    firstSeenAt: randomDate(firstSeenDaysAgo, 30),
    lastSeenAt: randomDate(lastSeenDaysAgo, 5),
    churnScore,
    clvScore: parseFloat((totalRevenue * (1 + rand() * 2) * (1 - churnScore * 0.5)).toFixed(2)),
    rfmSegment: RFM_SEGMENTS[segmentIdx],
    rfmRecency: rfmR,
    rfmFrequency: rfmF,
    rfmMonetary: rfmM,
    daysSinceLastEvent: lastSeenDaysAgo,
    channel: CHANNELS[Math.floor(rand() * CHANNELS.length)],
    attributes: {
      industry: ['retail', 'fashion', 'electronics', 'home_goods', 'sports'][Math.floor(rand() * 5)],
      tier: churnScore < 0.3 ? 'gold' : churnScore < 0.6 ? 'silver' : 'bronze',
    },
  }
})

// ============================================================
// EVENTS (200 mock events)
// ============================================================

const EVENT_TYPES = ['page_view', 'product_view', 'add_to_cart', 'purchase', 'review', 'support_ticket', 'login', 'search', 'email_open', 'refund']

export const mockEvents: MockEvent[] = Array.from({ length: 200 }, (_, i) => {
  const customer = mockCustomers[Math.floor(rand() * mockCustomers.length)]
  const eventType = EVENT_TYPES[Math.floor(rand() * EVENT_TYPES.length)]
  const channel = CHANNELS[Math.floor(rand() * CHANNELS.length)]
  const revenue = eventType === 'purchase' ? parseFloat((30 + rand() * 300).toFixed(2)) : undefined

  return {
    id: `evt-${String(i + 1).padStart(4, '0')}`,
    customerId: customer.id,
    channel,
    eventType,
    revenue,
    occurredAt: randomDate(Math.floor(rand() * 90), 5),
    properties: {
      page: eventType === 'page_view' ? ['/home', '/products', '/cart', '/checkout'][Math.floor(rand() * 4)] : undefined,
      product_id: eventType === 'product_view' ? `prod-${String(Math.floor(rand() * 500) + 1).padStart(4, '0')}` : undefined,
      category: ['electronics', 'clothing', 'home', 'sports', 'books'][Math.floor(rand() * 5)],
    },
  }
})

// ============================================================
// SEGMENTS (8 mock segments)
// ============================================================

export const mockSegments: MockSegment[] = [
  {
    id: 'seg-001',
    name: 'Champions',
    description: 'High-value, recent, frequent buyers',
    segmentType: 'rfm',
    memberCount: 12,
    avgCLV: 2840,
    churnRate: 0.05,
    color: '#10b981',
    memberIds: mockCustomers.filter((c) => c.rfmSegment === 'Champions').map((c) => c.id),
  },
  {
    id: 'seg-002',
    name: 'At Risk',
    description: 'Once frequent buyers who are now becoming inactive',
    segmentType: 'rfm',
    memberCount: 18,
    avgCLV: 1240,
    churnRate: 0.42,
    color: '#ef4444',
    memberIds: mockCustomers.filter((c) => c.rfmSegment === 'At Risk').map((c) => c.id),
  },
  {
    id: 'seg-003',
    name: 'High Churn Risk',
    description: 'Churn score >= 0.7',
    segmentType: 'ai_generated',
    memberCount: mockCustomers.filter((c) => c.churnScore >= 0.7).length,
    avgCLV: 680,
    churnRate: 0.75,
    color: '#dc2626',
    memberIds: mockCustomers.filter((c) => c.churnScore >= 0.7).map((c) => c.id),
  },
  {
    id: 'seg-004',
    name: 'Loyal Customers',
    description: 'Consistent buyers with high frequency',
    segmentType: 'rfm',
    memberCount: 15,
    avgCLV: 1890,
    churnRate: 0.08,
    color: '#6366f1',
    memberIds: mockCustomers.filter((c) => c.rfmSegment === 'Loyal Customers').map((c) => c.id),
  },
  {
    id: 'seg-005',
    name: 'Win-back Candidates',
    description: 'Churned customers with high historical value',
    segmentType: 'behavioral',
    memberCount: 22,
    avgCLV: 420,
    churnRate: 0.88,
    color: '#f97316',
    memberIds: mockCustomers.filter((c) => c.daysSinceLastEvent > 90).map((c) => c.id),
  },
  {
    id: 'seg-006',
    name: 'New Customers',
    description: 'First purchase within last 30 days',
    segmentType: 'behavioral',
    memberCount: 8,
    avgCLV: 340,
    churnRate: 0.22,
    color: '#3b82f6',
    memberIds: mockCustomers.filter((c) => c.daysSinceLastEvent < 30 && c.transactionCount <= 2).map((c) => c.id),
  },
  {
    id: 'seg-007',
    name: 'Mobile-first Users',
    description: 'Primary channel is mobile app',
    segmentType: 'behavioral',
    memberCount: 19,
    avgCLV: 920,
    churnRate: 0.18,
    color: '#8b5cf6',
    memberIds: mockCustomers.filter((c) => c.channel === 'mobile').map((c) => c.id),
  },
  {
    id: 'seg-008',
    name: 'High CLV Hibernating',
    description: 'High lifetime value but inactive 60+ days',
    segmentType: 'ai_generated',
    memberCount: 11,
    avgCLV: 3200,
    churnRate: 0.55,
    color: '#0891b2',
    memberIds: mockCustomers.filter((c) => c.daysSinceLastEvent >= 60 && c.clvScore >= 1500).map((c) => c.id),
  },
]

// ============================================================
// KPI SNAPSHOTS (last 12 months)
// ============================================================

export const mockKPISnapshots: MockKPISnapshot[] = Array.from({ length: 12 }, (_, i) => {
  const monthsAgo = 11 - i
  const date = new Date()
  date.setMonth(date.getMonth() - monthsAgo)
  const baseCustomers = 3800 + i * 85
  const baseRevenue = 142000 + i * 8500 + (rand() - 0.5) * 12000

  return {
    date: date.toISOString().slice(0, 10),
    totalCustomers: baseCustomers + Math.floor((rand() - 0.5) * 200),
    activeCustomers30d: Math.floor(baseCustomers * (0.35 + rand() * 0.1)),
    newCustomers: Math.floor(80 + rand() * 60),
    churnedCustomers: Math.floor(45 + rand() * 30),
    churnRate: parseFloat((0.018 + (rand() - 0.5) * 0.006).toFixed(4)),
    totalRevenue: parseFloat(baseRevenue.toFixed(2)),
    avgCLV: parseFloat((420 + i * 15 + (rand() - 0.5) * 50).toFixed(2)),
    avgOrderValue: parseFloat((78 + (rand() - 0.5) * 20).toFixed(2)),
    winBackRate: parseFloat((0.12 + (rand() - 0.5) * 0.04).toFixed(4)),
    retentionRate30d: parseFloat((0.68 + (rand() - 0.5) * 0.08).toFixed(4)),
    momGrowthRate: parseFloat((0.022 + (rand() - 0.5) * 0.015).toFixed(4)),
  }
})

// ============================================================
// PREDICTIONS
// ============================================================

export const mockPredictions: MockPrediction[] = mockCustomers
  .filter((c) => c.churnScore >= 0.4)
  .slice(0, 30)
  .map((c) => {
    const risk = c.churnScore >= 0.8 ? 'critical' : c.churnScore >= 0.6 ? 'high' : 'medium'
    const predictedChurnDays = Math.floor((1 - c.churnScore) * 90 + 7)
    const churnDate = new Date()
    churnDate.setDate(churnDate.getDate() + predictedChurnDays)

    const nextPurchaseDays = Math.floor(c.daysSinceLastEvent * 0.5 + rand() * 30)
    const nextPurchaseDate = new Date()
    nextPurchaseDate.setDate(nextPurchaseDate.getDate() + nextPurchaseDays)

    const actions: Record<string, string> = {
      critical: 'Immediate personal outreach + 20% loyalty discount',
      high: 'Win-back email sequence + product recommendation',
      medium: 'Re-engagement email + survey for feedback',
    }

    return {
      customerId: c.id,
      customerName: c.name,
      customerEmail: c.email,
      churnScore: c.churnScore,
      churnRisk: risk,
      predictedChurnDate: churnDate.toISOString(),
      predictedCLV: c.clvScore,
      predictedNextPurchaseDate: nextPurchaseDate.toISOString(),
      probabilityWithin30Days: parseFloat((0.1 + rand() * 0.6).toFixed(3)),
      recommendedAction: actions[risk],
      urgency: risk === 'critical' ? 'immediate' : risk === 'high' ? 'this_week' : 'this_month',
      revenueAtRisk: c.clvScore,
    }
  })
  .sort((a, b) => b.churnScore - a.churnScore)

// ============================================================
// ALERTS
// ============================================================

export const mockAlerts: MockAlert[] = [
  {
    id: 'alert-001',
    name: 'High Churn Rate Alert',
    metric: 'churn_rate',
    operator: 'gt',
    threshold: 0.03,
    severity: 'critical',
    isActive: true,
    triggeredCount: 2,
    lastTriggeredAt: randomDate(3, 1),
    lastValue: 0.028,
  },
  {
    id: 'alert-002',
    name: 'Revenue Drop Alert',
    metric: 'revenue',
    operator: 'lt',
    threshold: 120000,
    severity: 'high',
    isActive: true,
    triggeredCount: 0,
    lastValue: 148500,
  },
  {
    id: 'alert-003',
    name: 'New Customer Growth',
    metric: 'new_customers',
    operator: 'lt',
    threshold: 50,
    severity: 'medium',
    isActive: true,
    triggeredCount: 1,
    lastTriggeredAt: randomDate(15, 3),
    lastValue: 82,
  },
  {
    id: 'alert-004',
    name: 'CLV Decline Warning',
    metric: 'avg_clv',
    operator: 'lt',
    threshold: 350,
    severity: 'medium',
    isActive: false,
    triggeredCount: 0,
    lastValue: 432,
  },
]

// ============================================================
// JOURNEY FLOW (for Sankey chart)
// ============================================================

export const mockJourneyNodes = [
  { id: 'first_visit', name: 'First Visit', value: 5420 },
  { id: 'homepage', name: 'Homepage', value: 4200 },
  { id: 'product_view', name: 'Product View', value: 3840 },
  { id: 'search', name: 'Search', value: 2100 },
  { id: 'add_to_cart', name: 'Add to Cart', value: 1920 },
  { id: 'checkout', name: 'Checkout Started', value: 1100 },
  { id: 'purchase', name: 'Purchase', value: 780 },
  { id: 'return_visit', name: 'Return Visit', value: 540 },
  { id: 'abandonment', name: 'Abandonment', value: 2640 },
  { id: 'email_reengagement', name: 'Email Re-engagement', value: 320 },
]

export const mockJourneyLinks = [
  { source: 0, target: 1, value: 4200 },   // first_visit → homepage
  { source: 0, target: 2, value: 1220 },   // first_visit → product_view (direct)
  { source: 1, target: 2, value: 2800 },   // homepage → product_view
  { source: 1, target: 3, value: 1400 },   // homepage → search
  { source: 3, target: 2, value: 1050 },   // search → product_view
  { source: 3, target: 8, value: 350 },    // search → abandonment
  { source: 2, target: 4, value: 1920 },   // product_view → add_to_cart
  { source: 2, target: 8, value: 1150 },   // product_view → abandonment
  { source: 4, target: 5, value: 1100 },   // add_to_cart → checkout
  { source: 4, target: 8, value: 820 },    // add_to_cart → abandonment
  { source: 5, target: 6, value: 780 },    // checkout → purchase
  { source: 5, target: 8, value: 320 },    // checkout → abandonment
  { source: 6, target: 7, value: 540 },    // purchase → return_visit
  { source: 8, target: 9, value: 320 },    // abandonment → email_reengagement
]

export const mockTopPaths = [
  { path: 'First Visit → Homepage → Product View → Add to Cart → Purchase', count: 620, conversionRate: 0.114 },
  { path: 'First Visit → Product View → Add to Cart → Purchase', count: 160, conversionRate: 0.030 },
  { path: 'Return Visit → Product View → Purchase', count: 298, conversionRate: 0.055 },
  { path: 'Email Re-engagement → Product View → Purchase', count: 145, conversionRate: 0.027 },
  { path: 'First Visit → Search → Product View → Add to Cart → Purchase', count: 180, conversionRate: 0.033 },
]
