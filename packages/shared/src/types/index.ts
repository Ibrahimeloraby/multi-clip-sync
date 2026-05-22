export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  preferred_language: 'en' | 'ar';
  created_at: string;
  goals: UserGoal[];
  monthly_spend_categories: Record<string, number>;
  reputation_score: number;
  reputation_tier: ReputationTier;
  phone_verified: boolean;
  is_admin: boolean;
}

export type ReputationTier = 'newcomer' | 'contributor' | 'trusted' | 'expert' | 'maven';
export type UserGoal =
  | 'max_cashback'
  | 'travel_miles'
  | 'entertainment'
  | 'use_before_expiry';
export type ProgramCategory =
  | 'retail'
  | 'airline'
  | 'hotel'
  | 'bank'
  | 'telco'
  | 'gov'
  | 'fitness'
  | 'entertainment';
export type TrackingMethod = 'manual' | 'email_forward' | 'screenshot';
export type RuleType = 'earn' | 'cashback' | 'discount' | 'bogo' | 'multiplier';
export type RuleSource = 'official' | 'community' | 'personal';
export type RuleStatus =
  | 'pending'
  | 'provisional'
  | 'verified'
  | 'trusted'
  | 'disputed'
  | 'expired';
export type ConfirmationAction = 'confirm' | 'dispute' | 'upvote' | 'downvote';
export type AlertLevel = '30d' | '14d' | '7d' | '1d';
export type ParsingStatus = 'pending' | 'success' | 'failed' | 'unknown_program';

export interface Program {
  id: string;
  slug: string;
  display_name_en: string;
  display_name_ar: string;
  logo_url: string | null;
  category: ProgramCategory;
  default_earn_rate_aed: number;
  default_redemption_value_aed: number;
  expiry_rule: ExpiryRule;
  transfer_partners: TransferPartner[];
  key_merchants: string[];
  official_url: string | null;
  last_official_update: string;
  created_at: string;
}

export interface ExpiryRule {
  type: 'activity_based' | 'fixed' | 'never' | 'tier_based';
  months?: number;
  description_en: string;
  description_ar: string;
}

export interface TransferPartner {
  program_slug: string;
  ratio: string; // e.g. "1:1" or "3:1"
  min_transfer?: number;
}

export interface UserProgram {
  id: string;
  user_id: string;
  program_id: string;
  current_balance: number;
  tier_name: string | null;
  expiry_dates: ExpiryTranche[];
  tracking_method: TrackingMethod;
  forwarding_address: string | null;
  last_updated_at: string;
  last_confirmed_at: string | null;
  program?: Program; // joined
}

export interface ExpiryTranche {
  amount: number;
  expires_at: string;
  redemption_notes?: string;
}

export interface Merchant {
  id: string;
  slug: string;
  display_name_en: string;
  display_name_ar: string;
  category: string[];
  logo_url: string | null;
  location_data: MerchantLocationData;
  is_verified: boolean;
  created_by_user_id: string | null;
  created_at: string;
}

export interface MerchantLocationData {
  chain: string;
  branches?: MerchantBranch[];
}

export interface MerchantBranch {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  area?: string;
}

export interface MerchantRule {
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
  merchant?: Merchant; // joined
  program?: Program; // joined
}

export interface Transaction {
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
  merchant?: Merchant;
}

export interface Recommendation {
  id: string;
  user_id: string;
  merchant_id: string | null;
  spend_estimate: number | null;
  considered_programs: string[];
  chosen_program_id: string | null;
  reasoning_text: string | null;
  alternatives: RecommendationAlternative[];
  was_followed: boolean | null;
  created_at: string;
}

export interface RecommendationResult {
  primary: {
    program: Program;
    action: string;
    estimated_value_aed: number;
    reasoning: string;
    rule?: MerchantRule;
  };
  alternatives: RecommendationAlternative[];
  reasoning_trace: string;
}

export interface RecommendationAlternative {
  program_slug: string;
  action: string;
  estimated_value_aed: number;
  reasoning: string;
}

export interface ExpiringAlert {
  id: string;
  user_id: string;
  user_program_id: string;
  amount: number;
  expires_at: string;
  alert_level: AlertLevel;
  notified_at: string | null;
  estimated_value_aed: number | null;
  user_program?: UserProgram;
}

export interface ReputationEvent {
  id: string;
  user_id: string;
  event_type: string;
  points_delta: number;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface InboundEmail {
  id: string;
  user_id: string;
  raw_email_text: string | null;
  sender: string | null;
  subject: string | null;
  parsed_data: EmailParseResult | null;
  parsing_status: ParsingStatus;
  created_at: string;
}

export interface EmailParseResult {
  program_slug: string | null;
  transaction_type: string | null;
  points_amount: number | null;
  balance_after: number | null;
  expiry_date: string | null;
  merchant_if_any: string | null;
}

export interface AdminReviewQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  action_type: string;
  submitted_by_user_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface PromptTemplate {
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
}

export interface MonthlyReward {
  id: string;
  user_id: string;
  month: string;
  rank: number | null;
  reward_type: string | null;
  reward_value_aed: number | null;
  awarded_at: string;
  claimed_at: string | null;
}

export interface RuleConfirmation {
  id: string;
  rule_id: string;
  user_id: string;
  action: ConfirmationAction;
  evidence_url: string | null;
  notes: string | null;
  created_at: string;
}
