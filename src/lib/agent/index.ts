import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, CLAUDE_MODEL } from './client'
import { SYSTEM_PROMPT } from './prompts'
import { AGENT_TOOLS } from './tools'
import { mockCustomers, mockSegments, mockKPISnapshots, mockEvents } from '../mockData'

// ============================================================
// Types
// ============================================================

export type AgentEventType = 'thinking' | 'text' | 'tool_call' | 'tool_result' | 'error' | 'done'

export interface AgentEvent {
  type: AgentEventType
  text?: string
  toolName?: string
  toolInput?: Record<string, unknown>
  toolResult?: unknown
  error?: string
  conversationId?: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string | Anthropic.ContentBlock[]
}

export interface AgentSessionOptions {
  orgId: string
  connectionId?: string
  conversationId?: string
}

// ============================================================
// Tool Execution Handlers
// ============================================================

async function executeQueryWarehouse(
  input: Record<string, unknown>,
  _opts: AgentSessionOptions
): Promise<unknown> {
  const sql = String(input.sql ?? '')
  const description = String(input.description ?? '')

  // In a real implementation, this would call the appropriate warehouse connector
  // For demo, we return mock results shaped as SQL output
  console.log(`[Agent] Executing query: ${description}\nSQL: ${sql}`)

  // Simulate query execution with mock data
  return {
    sql,
    description,
    rows: mockCustomers.slice(0, 10).map((c) => ({
      customer_id: c.id,
      email: c.email,
      total_revenue: c.totalRevenue,
      last_seen: c.lastSeenAt,
      churn_score: c.churnScore,
    })),
    row_count: 10,
    execution_time_ms: 234,
    note: 'Results from mock data (no warehouse connected)',
  }
}

async function executeGetSegmentMembers(
  input: Record<string, unknown>,
  _opts: AgentSessionOptions
): Promise<unknown> {
  const segmentName = String(input.segment_name ?? '')
  const limit = Number(input.limit ?? 50)
  const orderBy = String(input.order_by ?? 'churn_score')

  const segment = mockSegments.find(
    (s) => s.name.toLowerCase().includes(segmentName.toLowerCase()) || s.id === input.segment_id
  )

  const customers = mockCustomers
    .slice(0, limit)
    .sort((a, b) => {
      if (orderBy === 'churn_score') return b.churnScore - a.churnScore
      if (orderBy === 'total_revenue') return b.totalRevenue - a.totalRevenue
      return 0
    })

  return {
    segment: segment ?? { name: segmentName || 'All Customers', memberCount: customers.length },
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      churnScore: c.churnScore,
      clvScore: c.clvScore,
      totalRevenue: c.totalRevenue,
      lastSeenAt: c.lastSeenAt,
      rfmSegment: c.rfmSegment,
    })),
    total: customers.length,
  }
}

async function executeCreateSegment(
  input: Record<string, unknown>,
  _opts: AgentSessionOptions
): Promise<unknown> {
  const name = String(input.name ?? '')
  const description = String(input.description ?? '')
  const criteria = input.criteria as Record<string, unknown>

  // In production: insert into customer_segments table + compute memberships
  const estimatedCount = Math.floor(mockCustomers.length * Math.random() * 0.4 + 0.1)

  return {
    success: true,
    segment: {
      id: crypto.randomUUID(),
      name,
      description,
      criteria,
      estimatedMemberCount: estimatedCount,
      createdAt: new Date().toISOString(),
    },
    message: `Segment "${name}" created with approximately ${estimatedCount} members.`,
  }
}

async function executeGetKPISummary(
  input: Record<string, unknown>,
  _opts: AgentSessionOptions
): Promise<unknown> {
  const dateRange = String(input.date_range ?? '30d')
  const latest = mockKPISnapshots[mockKPISnapshots.length - 1]
  const previous = mockKPISnapshots[mockKPISnapshots.length - 2]

  const mom = (current: number, prev: number) =>
    prev > 0 ? ((current - prev) / prev) * 100 : 0

  return {
    dateRange,
    snapshot: latest,
    trends: {
      totalCustomers: { value: latest.totalCustomers, changePct: mom(latest.totalCustomers, previous.totalCustomers) },
      churnRate: { value: latest.churnRate, changePct: mom(latest.churnRate, previous.churnRate) },
      avgCLV: { value: latest.avgCLV, changePct: mom(latest.avgCLV, previous.avgCLV) },
      totalRevenue: { value: latest.totalRevenue, changePct: mom(latest.totalRevenue, previous.totalRevenue) },
      winBackRate: { value: latest.winBackRate, changePct: mom(latest.winBackRate, previous.winBackRate) },
      retentionRate30d: { value: latest.retentionRate30d, changePct: mom(latest.retentionRate30d, previous.retentionRate30d) },
    },
  }
}

async function executeGetCustomerProfile(
  input: Record<string, unknown>,
  _opts: AgentSessionOptions
): Promise<unknown> {
  const email = String(input.email ?? '')
  const customer = mockCustomers.find(
    (c) => c.email === email || c.id === input.customer_id
  ) ?? mockCustomers[0]

  const customerEvents = mockEvents.filter((e) => e.customerId === customer.id).slice(0, Number(input.event_limit ?? 50))

  return {
    customer: {
      ...customer,
      segments: mockSegments.filter((s) => s.memberIds?.includes(customer.id)).map((s) => s.name),
    },
    events: customerEvents,
    scores: {
      churnScore: customer.churnScore,
      clvScore: customer.clvScore,
      rfmSegment: customer.rfmSegment,
      churnRisk: customer.churnScore >= 0.8 ? 'critical' : customer.churnScore >= 0.6 ? 'high' : customer.churnScore >= 0.35 ? 'medium' : 'low',
    },
  }
}

async function executeGetJourneyFlow(
  input: Record<string, unknown>,
  _opts: AgentSessionOptions
): Promise<unknown> {
  const timeRange = Number(input.time_range_days ?? 90)
  const channel = String(input.channel ?? 'all')

  // Generate realistic journey flow data
  const nodes = [
    { id: 'first_visit', name: 'First Visit', value: 5420 },
    { id: 'product_view', name: 'Product View', value: 3840 },
    { id: 'add_to_cart', name: 'Add to Cart', value: 1920 },
    { id: 'checkout', name: 'Checkout Started', value: 1100 },
    { id: 'purchase', name: 'Purchase', value: 780 },
    { id: 'return_visit', name: 'Return Visit', value: 540 },
    { id: 'abandonment', name: 'Abandonment', value: 2640 },
    { id: 'email_reengagement', name: 'Email Re-engagement', value: 320 },
  ]

  const links = [
    { source: 'first_visit', target: 'product_view', value: 3840 },
    { source: 'first_visit', target: 'abandonment', value: 1580 },
    { source: 'product_view', target: 'add_to_cart', value: 1920 },
    { source: 'product_view', target: 'abandonment', value: 1060 },
    { source: 'add_to_cart', target: 'checkout', value: 1100 },
    { source: 'add_to_cart', target: 'abandonment', value: 820 },
    { source: 'checkout', target: 'purchase', value: 780 },
    { source: 'checkout', target: 'abandonment', value: 320 },
    { source: 'purchase', target: 'return_visit', value: 540 },
    { source: 'abandonment', target: 'email_reengagement', value: 320 },
  ]

  return {
    timeRangeDays: timeRange,
    channel: channel === 'all' ? 'All Channels' : channel,
    nodes,
    links,
    topPaths: [
      { path: 'first_visit → product_view → add_to_cart → purchase', count: 780, conversionRate: 0.144 },
      { path: 'first_visit → product_view → abandonment → email_reengagement → purchase', count: 145, conversionRate: 0.027 },
      { path: 'return_visit → product_view → purchase', count: 298, conversionRate: 0.055 },
    ],
    dropOffPoints: [
      { step: 'product_view → abandonment', dropOffRate: 0.276 },
      { step: 'add_to_cart → abandonment', dropOffRate: 0.427 },
      { step: 'checkout → abandonment', dropOffRate: 0.291 },
    ],
  }
}

async function executePredictChurnList(
  input: Record<string, unknown>,
  _opts: AgentSessionOptions
): Promise<unknown> {
  const limit = Number(input.limit ?? 20)
  const minScore = Number(input.min_score ?? 0.6)

  const atRisk = mockCustomers
    .filter((c) => c.churnScore >= minScore)
    .sort((a, b) => b.churnScore - a.churnScore)
    .slice(0, limit)

  return {
    atRiskCustomers: atRisk.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      churnScore: c.churnScore,
      churnRisk: c.churnScore >= 0.8 ? 'critical' : c.churnScore >= 0.6 ? 'high' : 'medium',
      daysSinceLastEvent: c.daysSinceLastEvent,
      totalRevenue: c.totalRevenue,
      rfmSegment: c.rfmSegment,
      topChurnDrivers: ['Long inactivity', 'Declining purchase frequency', 'Support friction'],
      recommendedActions: [
        { action: 'Personalized win-back email', urgency: 'immediate' },
        { action: '15% loyalty discount offer', urgency: 'this_week' },
      ],
    })),
    totalAtRisk: atRisk.length,
    revenueAtRisk: atRisk.reduce((sum, c) => sum + c.totalRevenue, 0),
  }
}

async function executeComputeCLV(
  input: Record<string, unknown>,
  _opts: AgentSessionOptions
): Promise<unknown> {
  const horizon = Number(input.time_horizon_days ?? 365)
  const discountRate = Number(input.discount_rate ?? 0.1)

  const clvValues = mockCustomers.map((c) => c.clvScore)
  clvValues.sort((a, b) => a - b)
  const p25 = clvValues[Math.floor(clvValues.length * 0.25)]
  const p50 = clvValues[Math.floor(clvValues.length * 0.5)]
  const p75 = clvValues[Math.floor(clvValues.length * 0.75)]
  const avg = clvValues.reduce((s, v) => s + v, 0) / clvValues.length

  return {
    timeHorizonDays: horizon,
    discountRate,
    summary: {
      avgCLV: avg,
      medianCLV: p50,
      p25CLV: p25,
      p75CLV: p75,
      totalPredictedRevenue: avg * mockCustomers.length,
    },
    bySegment: mockSegments.map((seg) => ({
      segmentName: seg.name,
      avgCLV: seg.avgCLV,
      memberCount: seg.memberCount,
      totalPredictedRevenue: seg.avgCLV * seg.memberCount,
    })),
  }
}

async function executeCreateAlert(
  input: Record<string, unknown>,
  _opts: AgentSessionOptions
): Promise<unknown> {
  return {
    success: true,
    alert: {
      id: crypto.randomUUID(),
      name: String(input.name ?? ''),
      metric: String(input.metric ?? ''),
      operator: String(input.operator ?? 'gt'),
      threshold: Number(input.threshold ?? 0),
      severity: String(input.severity ?? 'medium'),
      notificationChannels: input.notification_channels ?? [],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    message: `Alert "${input.name}" created. You will be notified when ${input.metric} ${input.operator} ${input.threshold}.`,
  }
}

async function executeGetCohortAnalysis(
  input: Record<string, unknown>,
  _opts: AgentSessionOptions
): Promise<unknown> {
  const period = String(input.cohort_period ?? 'monthly')
  const numPeriods = Number(input.num_periods ?? 6)
  const metric = String(input.metric ?? 'retention_rate')

  // Generate realistic cohort retention data
  const cohorts = []
  const now = new Date()
  for (let i = numPeriods - 1; i >= 0; i--) {
    const cohortDate = new Date(now)
    cohortDate.setMonth(cohortDate.getMonth() - i)
    const cohortSize = Math.floor(Math.random() * 200 + 100)
    const retention = []
    let rate = 1.0
    for (let p = 0; p <= i; p++) {
      rate *= (0.65 + Math.random() * 0.2)
      retention.push({ period: p, rate: Math.min(1, rate), customers: Math.floor(cohortSize * rate) })
    }
    cohorts.push({
      cohort: cohortDate.toISOString().slice(0, 7),
      initialSize: cohortSize,
      retentionByPeriod: retention,
    })
  }

  return {
    cohortPeriod: period,
    metric,
    cohorts,
    averageRetention: {
      period1: 0.68,
      period3: 0.45,
      period6: 0.32,
      period12: 0.22,
    },
  }
}

// ============================================================
// Tool Dispatcher
// ============================================================

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  opts: AgentSessionOptions
): Promise<unknown> {
  switch (toolName) {
    case 'query_warehouse':          return executeQueryWarehouse(toolInput, opts)
    case 'get_segment_members':      return executeGetSegmentMembers(toolInput, opts)
    case 'create_segment':           return executeCreateSegment(toolInput, opts)
    case 'get_kpi_summary':          return executeGetKPISummary(toolInput, opts)
    case 'get_customer_profile':     return executeGetCustomerProfile(toolInput, opts)
    case 'get_journey_flow':         return executeGetJourneyFlow(toolInput, opts)
    case 'predict_churn_list':       return executePredictChurnList(toolInput, opts)
    case 'compute_clv':              return executeComputeCLV(toolInput, opts)
    case 'create_alert':             return executeCreateAlert(toolInput, opts)
    case 'get_cohort_analysis':      return executeGetCohortAnalysis(toolInput, opts)
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

// ============================================================
// Agent Session
// ============================================================

export class AgentSession {
  private history: ConversationMessage[] = []
  private opts: AgentSessionOptions
  private client: Anthropic

  constructor(opts: AgentSessionOptions, existingHistory: ConversationMessage[] = []) {
    this.opts = opts
    this.history = existingHistory
    this.client = getAnthropicClient()
  }

  getHistory(): ConversationMessage[] {
    return this.history
  }

  /**
   * Process a user message and stream back AgentEvents.
   * Handles tool_use blocks automatically (agentic loop).
   */
  async *processMessage(userMessage: string): AsyncGenerator<AgentEvent> {
    // Add user message to history
    this.history.push({ role: 'user', content: userMessage })

    let continueLoop = true

    while (continueLoop) {
      continueLoop = false

      try {
        const messages: Anthropic.MessageParam[] = this.history.map((m) => ({
          role: m.role,
          content: m.content as string | Anthropic.ContentBlockParam[],
        }))

        // Stream the response
        const stream = this.client.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: AGENT_TOOLS,
          messages,
        })

        let currentText = ''
        const contentBlocks: Anthropic.ContentBlock[] = []

        // Stream text events
        stream.on('text', (text) => {
          currentText += text
        })

        // Collect full message
        const response = await stream.finalMessage()

        // Now yield events based on content blocks
        for (const block of response.content) {
          contentBlocks.push(block)

          if (block.type === 'text') {
            yield { type: 'text', text: block.text }
          } else if (block.type === 'tool_use') {
            yield {
              type: 'tool_call',
              toolName: block.name,
              toolInput: block.input as Record<string, unknown>,
            }
          }
        }

        // Add assistant response to history
        this.history.push({ role: 'assistant', content: response.content })

        // Handle tool calls if stop_reason is tool_use
        if (response.stop_reason === 'tool_use') {
          const toolResults: Anthropic.ToolResultBlockParam[] = []

          for (const block of response.content) {
            if (block.type !== 'tool_use') continue

            let result: unknown
            let isError = false

            try {
              result = await executeTool(block.name, block.input as Record<string, unknown>, this.opts)
            } catch (e) {
              result = { error: String(e) }
              isError = true
              yield { type: 'error', error: `Tool ${block.name} failed: ${String(e)}` }
            }

            yield {
              type: 'tool_result',
              toolName: block.name,
              toolResult: result,
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
              is_error: isError,
            })
          }

          // Add tool results to history and continue the loop
          this.history.push({ role: 'user', content: toolResults })
          continueLoop = true
        }
      } catch (e) {
        yield { type: 'error', error: String(e) }
        break
      }
    }

    yield { type: 'done' }
  }

  clearHistory(): void {
    this.history = []
  }
}

export function createSession(opts: AgentSessionOptions, history?: ConversationMessage[]): AgentSession {
  return new AgentSession(opts, history)
}
