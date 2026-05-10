import type Anthropic from '@anthropic-ai/sdk'

export type AgentTool =
  | 'query_warehouse'
  | 'get_segment_members'
  | 'create_segment'
  | 'get_kpi_summary'
  | 'get_customer_profile'
  | 'get_journey_flow'
  | 'predict_churn_list'
  | 'compute_clv'
  | 'create_alert'
  | 'get_cohort_analysis'

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_warehouse',
    description: 'Execute a SQL query against the connected data warehouse. Returns rows and column metadata. Use this to answer questions that require raw data.',
    input_schema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'The SQL query to execute. Adapt to the warehouse dialect (Snowflake/BigQuery/etc).',
        },
        description: {
          type: 'string',
          description: 'Human-readable description of what this query does.',
        },
        connection_id: {
          type: 'string',
          description: 'Optional: specific connection ID to use. If omitted, uses the default/active connection.',
        },
      },
      required: ['sql', 'description'],
    },
  },
  {
    name: 'get_segment_members',
    description: 'Retrieve customers belonging to a named segment. Returns customer profiles with scores.',
    input_schema: {
      type: 'object',
      properties: {
        segment_id: {
          type: 'string',
          description: 'UUID of the segment, or pass segment_name to look up by name.',
        },
        segment_name: {
          type: 'string',
          description: 'Name of the segment (alternative to segment_id).',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of customers to return (default 50).',
        },
        order_by: {
          type: 'string',
          enum: ['churn_score', 'clv_score', 'total_revenue', 'last_seen_at'],
          description: 'Sort order for results.',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_segment',
    description: 'Create a new customer segment based on criteria. The segment will be saved and its members computed.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the new segment.',
        },
        description: {
          type: 'string',
          description: 'Description of who is in this segment and why.',
        },
        criteria: {
          type: 'object',
          description: 'Segment criteria as JSON. Example: {"churn_score_gte": 0.7, "days_since_last_event_gte": 60}',
          properties: {
            churn_score_gte: { type: 'number' },
            churn_score_lte: { type: 'number' },
            clv_score_gte: { type: 'number' },
            days_since_last_event_gte: { type: 'number' },
            days_since_last_event_lte: { type: 'number' },
            rfm_segment: { type: 'string' },
            channel: { type: 'string' },
            revenue_gte: { type: 'number' },
            revenue_lte: { type: 'number' },
          },
          additionalProperties: true,
        },
        segment_type: {
          type: 'string',
          enum: ['manual', 'ai_generated', 'behavioral'],
          description: 'Type of segment.',
        },
      },
      required: ['name', 'criteria'],
    },
  },
  {
    name: 'get_kpi_summary',
    description: 'Fetch the current KPI snapshot including churn rate, CLV, revenue, active customers, etc.',
    input_schema: {
      type: 'object',
      properties: {
        date_range: {
          type: 'string',
          enum: ['today', '7d', '30d', '90d', 'ytd'],
          description: 'Time range for the KPI summary.',
        },
        compare_to: {
          type: 'string',
          enum: ['previous_period', 'previous_year'],
          description: 'Comparison period for trend analysis.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_customer_profile',
    description: 'Get a complete 360° customer profile including events, scores, segment memberships, and predictions.',
    input_schema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'string',
          description: 'UUID of the customer.',
        },
        email: {
          type: 'string',
          description: 'Customer email address (alternative lookup).',
        },
        include_events: {
          type: 'boolean',
          description: 'Whether to include full event timeline (default true).',
        },
        event_limit: {
          type: 'number',
          description: 'Max events to include (default 50).',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_journey_flow',
    description: 'Get touchpoint flow data showing how customers move through channels and event types. Returns Sankey-ready data.',
    input_schema: {
      type: 'object',
      properties: {
        segment_id: {
          type: 'string',
          description: 'Limit to a specific segment (optional).',
        },
        channel: {
          type: 'string',
          description: 'Filter by channel (web/mobile/email/in_store/call_center).',
        },
        time_range_days: {
          type: 'number',
          description: 'Number of days to analyze (default 90).',
        },
        max_steps: {
          type: 'number',
          description: 'Maximum journey steps to include (default 5).',
        },
      },
      required: [],
    },
  },
  {
    name: 'predict_churn_list',
    description: 'Get the top N customers at highest risk of churning, with churn drivers and recommended actions.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of at-risk customers to return (default 20).',
        },
        min_score: {
          type: 'number',
          description: 'Minimum churn score threshold 0-1 (default 0.6).',
        },
        segment_id: {
          type: 'string',
          description: 'Limit to customers in a specific segment.',
        },
        include_actions: {
          type: 'boolean',
          description: 'Include recommended win-back actions (default true).',
        },
      },
      required: [],
    },
  },
  {
    name: 'compute_clv',
    description: 'Compute Customer Lifetime Value estimates for a segment or all customers.',
    input_schema: {
      type: 'object',
      properties: {
        segment_id: {
          type: 'string',
          description: 'Segment to compute CLV for. If omitted, computes for all customers.',
        },
        time_horizon_days: {
          type: 'number',
          description: 'Prediction horizon in days (default 365).',
        },
        discount_rate: {
          type: 'number',
          description: 'Annual discount rate 0-1 (default 0.10).',
        },
        include_percentiles: {
          type: 'boolean',
          description: 'Include P25/P50/P75 CLV distribution (default true).',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_alert',
    description: 'Create a KPI threshold alert that will trigger notifications when a metric crosses a threshold.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the alert.',
        },
        metric: {
          type: 'string',
          enum: ['churn_rate', 'revenue', 'active_customers', 'new_customers', 'avg_clv', 'win_back_rate'],
          description: 'KPI metric to monitor.',
        },
        operator: {
          type: 'string',
          enum: ['gt', 'lt', 'gte', 'lte'],
          description: 'Comparison operator.',
        },
        threshold: {
          type: 'number',
          description: 'Threshold value.',
        },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
        },
        notification_channels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['email', 'webhook', 'slack'] },
              target: { type: 'string' },
            },
            required: ['type', 'target'],
          },
          description: 'Where to send notifications.',
        },
      },
      required: ['name', 'metric', 'operator', 'threshold'],
    },
  },
  {
    name: 'get_cohort_analysis',
    description: 'Run cohort retention analysis showing how different acquisition cohorts retain over time.',
    input_schema: {
      type: 'object',
      properties: {
        cohort_period: {
          type: 'string',
          enum: ['monthly', 'quarterly', 'weekly'],
          description: 'Cohort grouping period (default monthly).',
        },
        metric: {
          type: 'string',
          enum: ['retention_rate', 'revenue_retention', 'purchase_rate'],
          description: 'Metric to track per cohort (default retention_rate).',
        },
        num_periods: {
          type: 'number',
          description: 'Number of periods to include (default 12).',
        },
        channel: {
          type: 'string',
          description: 'Filter cohorts by acquisition channel.',
        },
      },
      required: [],
    },
  },
]
