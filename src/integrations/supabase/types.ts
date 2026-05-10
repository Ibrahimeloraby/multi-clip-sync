export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// AI Customer Journey Platform — Table Types
// ============================================================

export interface Organization {
  id: string
  name: string
  slug: string
  industry: string | null
  plan: string
  settings: Json
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'analyst' | 'member'
  created_at: string
}

export interface DataConnection {
  id: string
  organization_id: string
  name: string
  connector_type: 'snowflake' | 'bigquery' | 'redshift' | 'clickhouse' | 'postgres' | 'databricks'
  credentials: Json
  status: 'pending' | 'active' | 'error' | 'disconnected'
  last_tested_at: string | null
  last_sync_at: string | null
  schema_discovered: boolean
  field_mappings: Json
  metadata: Json
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface EventSchema {
  id: string
  organization_id: string
  connection_id: string
  table_schema: string
  table_name: string
  columns: Json
  row_count_estimate: number | null
  suggested_mappings: Json
  discovered_at: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  organization_id: string
  external_id: string | null
  email: string | null
  name: string | null
  phone: string | null
  country: string | null
  city: string | null
  first_seen_at: string | null
  last_seen_at: string | null
  total_revenue: number
  transaction_count: number
  attributes: Json
  pii_masked: boolean
  gdpr_erased: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  organization_id: string
  customer_id: string | null
  external_customer_id: string | null
  connection_id: string | null
  channel: string
  event_type: string
  revenue: number | null
  currency: string | null
  properties: Json
  session_id: string | null
  occurred_at: string
  ingested_at: string
  created_at: string
}

export interface CustomerSegment {
  id: string
  organization_id: string
  name: string
  description: string | null
  segment_type: 'manual' | 'ai_generated' | 'rfm' | 'behavioral'
  criteria: Json
  member_count: number
  avg_clv: number | null
  avg_churn_rate: number | null
  color: string | null
  is_active: boolean
  last_computed_at: string | null
  created_at: string
  updated_at: string
}

export interface SegmentMembership {
  id: string
  organization_id: string
  segment_id: string
  customer_id: string
  score: number | null
  added_at: string
}

export interface KPISnapshot {
  id: string
  organization_id: string
  snapshot_date: string
  total_customers: number
  active_customers_30d: number
  new_customers: number
  churned_customers: number
  churn_rate: number | null
  total_revenue: number
  avg_revenue_per_customer: number | null
  avg_clv: number | null
  avg_order_value: number | null
  win_back_rate: number | null
  nps_score: number | null
  retention_rate_30d: number | null
  retention_rate_90d: number | null
  mom_growth_rate: number | null
  metadata: Json
  created_at: string
}

export interface CustomerScore {
  id: string
  organization_id: string
  customer_id: string
  churn_score: number
  clv_score: number
  winback_score: number
  rfm_recency: number | null
  rfm_frequency: number | null
  rfm_monetary: number | null
  rfm_segment: string | null
  engagement_score: number | null
  nps_predictor: number | null
  computed_at: string
  model_version: string
  created_at: string
  updated_at: string
}

export interface Prediction {
  id: string
  organization_id: string
  customer_id: string
  prediction_type: 'churn_date' | 'next_purchase' | 'predicted_clv' | 'next_best_action'
  predicted_value: string | null
  predicted_date: string | null
  confidence: number | null
  explanation: string | null
  features_snapshot: Json
  model_version: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentConversation {
  id: string
  organization_id: string
  user_id: string
  title: string | null
  messages: Json
  context: Json
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  organization_id: string
  name: string
  metric: string
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
  threshold: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  notification_channels: Json
  is_active: boolean
  triggered_count: number
  last_triggered_at: string | null
  last_value: number | null
  created_at: string
  updated_at: string
}

export interface AlertHistory {
  id: string
  organization_id: string
  alert_id: string
  triggered_at: string
  metric_value: number
  threshold_value: number
  resolved_at: string | null
  notes: string | null
  created_at: string
}

// ============================================================
// Legacy types (kept for backward compatibility)
// ============================================================

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Partial<Organization> & { name: string; slug: string }
        Update: Partial<Organization>
        Relationships: []
      }
      data_connections: {
        Row: DataConnection
        Insert: Partial<DataConnection> & { organization_id: string; name: string; connector_type: string }
        Update: Partial<DataConnection>
        Relationships: [
          { foreignKeyName: "data_connections_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      customers: {
        Row: Customer
        Insert: Partial<Customer> & { organization_id: string }
        Update: Partial<Customer>
        Relationships: [
          { foreignKeyName: "customers_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      events: {
        Row: Event
        Insert: Partial<Event> & { organization_id: string; channel: string; event_type: string; occurred_at: string }
        Update: Partial<Event>
        Relationships: [
          { foreignKeyName: "events_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "events_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] }
        ]
      }
      customer_segments: {
        Row: CustomerSegment
        Insert: Partial<CustomerSegment> & { organization_id: string; name: string }
        Update: Partial<CustomerSegment>
        Relationships: [
          { foreignKeyName: "customer_segments_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      kpi_snapshots: {
        Row: KPISnapshot
        Insert: Partial<KPISnapshot> & { organization_id: string; snapshot_date: string }
        Update: Partial<KPISnapshot>
        Relationships: []
      }
      customer_scores: {
        Row: CustomerScore
        Insert: Partial<CustomerScore> & { organization_id: string; customer_id: string }
        Update: Partial<CustomerScore>
        Relationships: []
      }
      agent_conversations: {
        Row: AgentConversation
        Insert: Partial<AgentConversation> & { organization_id: string; user_id: string }
        Update: Partial<AgentConversation>
        Relationships: []
      }
      alerts: {
        Row: Alert
        Insert: Partial<Alert> & { organization_id: string; name: string; metric: string; operator: string; threshold: number }
        Update: Partial<Alert>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_ids: { Args: Record<string, never>; Returns: string[] }
      compute_rfm: { Args: { p_org_id: string }; Returns: unknown[] }
      get_churn_candidates: { Args: { p_org_id: string; p_threshold: number }; Returns: unknown[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
