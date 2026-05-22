import { createClient } from "@supabase/supabase-js";
import type {
  ReputationTier,
  UserGoal,
  ProgramCategory,
  TrackingMethod,
  RuleType,
  RuleSource,
  RuleStatus,
  ConfirmationAction,
  AlertLevel,
  ParsingStatus,
} from "@/types";

// ─── Database type definition ─────────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
          full_name: string | null;
          preferred_language: "en" | "ar";
          created_at: string;
          goals: UserGoal[];
          monthly_spend_categories: Record<string, number>;
          reputation_score: number;
          reputation_tier: ReputationTier;
          phone_verified: boolean;
          is_admin: boolean;
        };
        Insert: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          preferred_language?: "en" | "ar";
          created_at?: string;
          goals?: UserGoal[];
          monthly_spend_categories?: Record<string, number>;
          reputation_score?: number;
          reputation_tier?: ReputationTier;
          phone_verified?: boolean;
          is_admin?: boolean;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          preferred_language?: "en" | "ar";
          created_at?: string;
          goals?: UserGoal[];
          monthly_spend_categories?: Record<string, number>;
          reputation_score?: number;
          reputation_tier?: ReputationTier;
          phone_verified?: boolean;
          is_admin?: boolean;
        };
        Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          slug: string;
          display_name_en: string;
          display_name_ar: string;
          logo_url: string | null;
          category: ProgramCategory;
          default_earn_rate_aed: number;
          default_redemption_value_aed: number;
          expiry_rule: Json;
          transfer_partners: Json;
          key_merchants: Json;
          official_url: string | null;
          last_official_update: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          display_name_en: string;
          display_name_ar: string;
          logo_url?: string | null;
          category: ProgramCategory;
          default_earn_rate_aed?: number;
          default_redemption_value_aed?: number;
          expiry_rule?: Json;
          transfer_partners?: Json;
          key_merchants?: Json;
          official_url?: string | null;
          last_official_update?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          display_name_en?: string;
          display_name_ar?: string;
          logo_url?: string | null;
          category?: ProgramCategory;
          default_earn_rate_aed?: number;
          default_redemption_value_aed?: number;
          expiry_rule?: Json;
          transfer_partners?: Json;
          key_merchants?: Json;
          official_url?: string | null;
          last_official_update?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_programs: {
        Row: {
          id: string;
          user_id: string;
          program_id: string;
          current_balance: number;
          tier_name: string | null;
          expiry_dates: Json;
          tracking_method: TrackingMethod;
          forwarding_address: string | null;
          last_updated_at: string;
          last_confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_id: string;
          current_balance?: number;
          tier_name?: string | null;
          expiry_dates?: Json;
          tracking_method?: TrackingMethod;
          forwarding_address?: string | null;
          last_updated_at?: string;
          last_confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          program_id?: string;
          current_balance?: number;
          tier_name?: string | null;
          expiry_dates?: Json;
          tracking_method?: TrackingMethod;
          forwarding_address?: string | null;
          last_updated_at?: string;
          last_confirmed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_programs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_programs_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
        ];
      };
      merchants: {
        Row: {
          id: string;
          slug: string;
          display_name_en: string;
          display_name_ar: string;
          category: string[];
          logo_url: string | null;
          location_data: Json;
          is_verified: boolean;
          created_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          display_name_en: string;
          display_name_ar: string;
          category?: string[];
          logo_url?: string | null;
          location_data?: Json;
          is_verified?: boolean;
          created_by_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          display_name_en?: string;
          display_name_ar?: string;
          category?: string[];
          logo_url?: string | null;
          location_data?: Json;
          is_verified?: boolean;
          created_by_user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      merchant_rules: {
        Row: {
          id: string;
          merchant_id: string;
          program_id: string;
          rule_type: RuleType;
          earn_rate: number | null;
          multiplier: number | null;
          discount_pct: number | null;
          cashback_pct: number | null;
          applies_to_categories: string[];
          min_spend: number;
          max_spend: number | null;
          days_of_week: number[];
          start_date: string | null;
          end_date: string | null;
          source: RuleSource;
          status: RuleStatus;
          submitted_by_user_id: string | null;
          verified_by_user_id: string | null;
          upvotes: number;
          downvotes: number;
          confirmations: number;
          disputes: number;
          confidence_score: number;
          evidence_attachments: string[];
          description_text: string | null;
          created_at: string;
          updated_at: string;
          last_confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          program_id: string;
          rule_type: RuleType;
          earn_rate?: number | null;
          multiplier?: number | null;
          discount_pct?: number | null;
          cashback_pct?: number | null;
          applies_to_categories?: string[];
          min_spend?: number;
          max_spend?: number | null;
          days_of_week?: number[];
          start_date?: string | null;
          end_date?: string | null;
          source?: RuleSource;
          status?: RuleStatus;
          submitted_by_user_id?: string | null;
          verified_by_user_id?: string | null;
          upvotes?: number;
          downvotes?: number;
          confirmations?: number;
          disputes?: number;
          confidence_score?: number;
          evidence_attachments?: string[];
          description_text?: string | null;
          created_at?: string;
          updated_at?: string;
          last_confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          program_id?: string;
          rule_type?: RuleType;
          earn_rate?: number | null;
          multiplier?: number | null;
          discount_pct?: number | null;
          cashback_pct?: number | null;
          applies_to_categories?: string[];
          min_spend?: number;
          max_spend?: number | null;
          days_of_week?: number[];
          start_date?: string | null;
          end_date?: string | null;
          source?: RuleSource;
          status?: RuleStatus;
          submitted_by_user_id?: string | null;
          verified_by_user_id?: string | null;
          upvotes?: number;
          downvotes?: number;
          confirmations?: number;
          disputes?: number;
          confidence_score?: number;
          evidence_attachments?: string[];
          description_text?: string | null;
          created_at?: string;
          updated_at?: string;
          last_confirmed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_rules_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "merchant_rules_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
        ];
      };
      rule_confirmations: {
        Row: {
          id: string;
          rule_id: string;
          user_id: string;
          action: ConfirmationAction;
          evidence_url: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rule_id: string;
          user_id: string;
          action: ConfirmationAction;
          evidence_url?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rule_id?: string;
          user_id?: string;
          action?: ConfirmationAction;
          evidence_url?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          merchant_id: string | null;
          amount_aed: number;
          recommended_rule_id: string | null;
          used_rule_id: string | null;
          points_earned: number | null;
          discount_applied_aed: number;
          cashback_aed: number;
          payment_method: string | null;
          receipt_url: string | null;
          notes: string | null;
          estimated_value_aed: number | null;
          was_recommendation_followed: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          merchant_id?: string | null;
          amount_aed: number;
          recommended_rule_id?: string | null;
          used_rule_id?: string | null;
          points_earned?: number | null;
          discount_applied_aed?: number;
          cashback_aed?: number;
          payment_method?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          estimated_value_aed?: number | null;
          was_recommendation_followed?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          merchant_id?: string | null;
          amount_aed?: number;
          recommended_rule_id?: string | null;
          used_rule_id?: string | null;
          points_earned?: number | null;
          discount_applied_aed?: number;
          cashback_aed?: number;
          payment_method?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          estimated_value_aed?: number | null;
          was_recommendation_followed?: boolean | null;
          created_at?: string;
        };
        Relationships: [];
      };
      recommendations: {
        Row: {
          id: string;
          user_id: string;
          merchant_id: string | null;
          spend_estimate: number | null;
          considered_programs: Json;
          chosen_program_id: string | null;
          reasoning_text: string | null;
          alternatives: Json;
          was_followed: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          merchant_id?: string | null;
          spend_estimate?: number | null;
          considered_programs?: Json;
          chosen_program_id?: string | null;
          reasoning_text?: string | null;
          alternatives?: Json;
          was_followed?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          merchant_id?: string | null;
          spend_estimate?: number | null;
          considered_programs?: Json;
          chosen_program_id?: string | null;
          reasoning_text?: string | null;
          alternatives?: Json;
          was_followed?: boolean | null;
          created_at?: string;
        };
        Relationships: [];
      };
      expiring_alerts: {
        Row: {
          id: string;
          user_id: string;
          user_program_id: string;
          amount: number;
          expires_at: string;
          alert_level: AlertLevel;
          notified_at: string | null;
          estimated_value_aed: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_program_id: string;
          amount: number;
          expires_at: string;
          alert_level: AlertLevel;
          notified_at?: string | null;
          estimated_value_aed?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_program_id?: string;
          amount?: number;
          expires_at?: string;
          alert_level?: AlertLevel;
          notified_at?: string | null;
          estimated_value_aed?: number | null;
        };
        Relationships: [];
      };
      reputation_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          points_delta: number;
          reference_id: string | null;
          reference_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          points_delta: number;
          reference_id?: string | null;
          reference_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          points_delta?: number;
          reference_id?: string | null;
          reference_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      monthly_rewards: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          rank: number | null;
          reward_type: string | null;
          reward_value_aed: number | null;
          awarded_at: string;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          rank?: number | null;
          reward_type?: string | null;
          reward_value_aed?: number | null;
          awarded_at?: string;
          claimed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          rank?: number | null;
          reward_type?: string | null;
          reward_value_aed?: number | null;
          awarded_at?: string;
          claimed_at?: string | null;
        };
        Relationships: [];
      };
      inbound_emails: {
        Row: {
          id: string;
          user_id: string;
          raw_email_text: string | null;
          sender: string | null;
          subject: string | null;
          parsed_data: Json | null;
          parsing_status: ParsingStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          raw_email_text?: string | null;
          sender?: string | null;
          subject?: string | null;
          parsed_data?: Json | null;
          parsing_status?: ParsingStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          raw_email_text?: string | null;
          sender?: string | null;
          subject?: string | null;
          parsed_data?: Json | null;
          parsing_status?: ParsingStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_review_queue: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action_type: string;
          submitted_by_user_id: string | null;
          status: "pending" | "approved" | "rejected";
          reviewed_by: string | null;
          reviewed_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action_type: string;
          submitted_by_user_id?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string;
          action_type?: string;
          submitted_by_user_id?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      prompt_templates: {
        Row: {
          id: string;
          template_key: string;
          name: string;
          system_prompt: string;
          user_prompt_template: string | null;
          version: number;
          is_active: boolean;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_key: string;
          name: string;
          system_prompt: string;
          user_prompt_template?: string | null;
          version?: number;
          is_active?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          template_key?: string;
          name?: string;
          system_prompt?: string;
          user_prompt_template?: string | null;
          version?: number;
          is_active?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ─── Supabase client singleton ────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[LoyaltyOne] VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not set. " +
      "Database calls will fail until environment variables are configured."
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL ?? "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY ?? "placeholder",
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
