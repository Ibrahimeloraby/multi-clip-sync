import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const programCategorySchema = z.enum([
  'retail',
  'airline',
  'hotel',
  'bank',
  'telco',
  'gov',
  'fitness',
  'entertainment',
]);

export const ruleTypeSchema = z.enum(['earn', 'cashback', 'discount', 'bogo', 'multiplier']);
export const ruleSourceSchema = z.enum(['official', 'community', 'personal']);
export const ruleStatusSchema = z.enum([
  'pending',
  'provisional',
  'verified',
  'trusted',
  'disputed',
  'expired',
]);
export const trackingMethodSchema = z.enum(['manual', 'email_forward', 'screenshot']);
export const userGoalSchema = z.enum([
  'max_cashback',
  'travel_miles',
  'entertainment',
  'use_before_expiry',
]);
export const reputationTierSchema = z.enum([
  'newcomer',
  'contributor',
  'trusted',
  'expert',
  'maven',
]);
export const alertLevelSchema = z.enum(['30d', '14d', '7d', '1d']);
export const parsingStatusSchema = z.enum(['pending', 'success', 'failed', 'unknown_program']);
export const confirmationActionSchema = z.enum(['confirm', 'dispute', 'upvote', 'downvote']);

// ─── Program ──────────────────────────────────────────────────────────────────

export const expiryRuleSchema = z.object({
  type: z.enum(['activity_based', 'fixed', 'never', 'tier_based']),
  months: z.number().int().positive().optional(),
  description_en: z.string().min(1),
  description_ar: z.string().min(1),
});

export const transferPartnerSchema = z.object({
  program_slug: z.string().min(1),
  ratio: z.string().regex(/^\d+:\d+$/, 'Ratio must be in format "N:M" e.g. "1:1"'),
  min_transfer: z.number().int().positive().optional(),
});

export const programSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  display_name_en: z.string().min(1).max(120),
  display_name_ar: z.string().min(1).max(120),
  logo_url: z.string().url().nullable(),
  category: programCategorySchema,
  default_earn_rate_aed: z.number().min(0),
  default_redemption_value_aed: z.number().min(0),
  expiry_rule: expiryRuleSchema,
  transfer_partners: z.array(transferPartnerSchema),
  key_merchants: z.array(z.string()),
  official_url: z.string().url().nullable(),
  last_official_update: z.string().datetime(),
  created_at: z.string().datetime(),
});

// ─── Merchant ─────────────────────────────────────────────────────────────────

export const merchantBranchSchema = z.object({
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
  area: z.string().optional(),
});

export const merchantLocationDataSchema = z.object({
  chain: z.string().min(1),
  branches: z.array(merchantBranchSchema).optional(),
});

export const merchantSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  display_name_en: z.string().min(1).max(120),
  display_name_ar: z.string().min(1).max(120),
  category: z.array(z.string()).min(1, 'At least one category is required'),
  logo_url: z.string().url().nullable(),
  location_data: merchantLocationDataSchema,
  is_verified: z.boolean(),
  created_by_user_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
});

// ─── MerchantRule ─────────────────────────────────────────────────────────────

export const merchantRuleSchema = z
  .object({
    id: z.string().uuid(),
    merchant_id: z.string().uuid(),
    program_id: z.string().uuid(),
    rule_type: ruleTypeSchema,
    earn_rate: z.number().min(0).nullable(),
    multiplier: z.number().min(1).nullable(),
    discount_pct: z.number().min(0).max(100).nullable(),
    cashback_pct: z.number().min(0).max(100).nullable(),
    applies_to_categories: z.array(z.string()),
    min_spend: z.number().min(0),
    max_spend: z.number().positive().nullable(),
    days_of_week: z
      .array(z.number().int().min(0).max(6))
      .max(7, 'days_of_week can have at most 7 entries'),
    start_date: z.string().datetime().nullable(),
    end_date: z.string().datetime().nullable(),
    source: ruleSourceSchema,
    status: ruleStatusSchema,
    submitted_by_user_id: z.string().uuid().nullable(),
    verified_by_user_id: z.string().uuid().nullable(),
    upvotes: z.number().int().min(0),
    downvotes: z.number().int().min(0),
    confirmations: z.number().int().min(0),
    disputes: z.number().int().min(0),
    confidence_score: z.number().min(0).max(100),
    evidence_attachments: z.array(z.string().url()),
    description_text: z.string().max(1000).nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    last_confirmed_at: z.string().datetime().nullable(),
  })
  .refine(
    (data) => {
      // At least one of earn_rate, multiplier, discount_pct, cashback_pct must be set
      return (
        data.earn_rate !== null ||
        data.multiplier !== null ||
        data.discount_pct !== null ||
        data.cashback_pct !== null
      );
    },
    {
      message:
        'At least one of earn_rate, multiplier, discount_pct, or cashback_pct must be provided',
    },
  )
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    {
      message: 'start_date must be before end_date',
      path: ['start_date'],
    },
  )
  .refine(
    (data) => {
      if (data.max_spend !== null) {
        return data.max_spend > data.min_spend;
      }
      return true;
    },
    {
      message: 'max_spend must be greater than min_spend',
      path: ['max_spend'],
    },
  );

// ─── User ─────────────────────────────────────────────────────────────────────

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  phone: z
    .string()
    .regex(/^\+971[0-9]{8,9}$/, 'Phone must be a valid UAE number starting with +971')
    .nullable(),
  full_name: z.string().min(1).max(200).nullable(),
  preferred_language: z.enum(['en', 'ar']),
  created_at: z.string().datetime(),
  goals: z.array(userGoalSchema),
  monthly_spend_categories: z.record(z.string(), z.number().min(0)),
  reputation_score: z.number().int().min(0),
  reputation_tier: reputationTierSchema,
  phone_verified: z.boolean(),
  is_admin: z.boolean(),
});

// ─── Transaction ──────────────────────────────────────────────────────────────

export const transactionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  merchant_id: z.string().uuid().nullable(),
  amount_aed: z.number().min(0),
  recommended_rule_id: z.string().uuid().nullable(),
  used_rule_id: z.string().uuid().nullable(),
  points_earned: z.number().int().min(0).nullable(),
  discount_applied_aed: z.number().min(0),
  cashback_aed: z.number().min(0),
  payment_method: z.string().max(64).nullable(),
  receipt_url: z.string().url().nullable(),
  notes: z.string().max(1000).nullable(),
  estimated_value_aed: z.number().min(0).nullable(),
  was_recommendation_followed: z.boolean().nullable(),
  created_at: z.string().datetime(),
});

// ─── Recommendation ───────────────────────────────────────────────────────────

export const recommendationAlternativeSchema = z.object({
  program_slug: z.string().min(1),
  action: z.string().min(1),
  estimated_value_aed: z.number().min(0),
  reasoning: z.string().min(1),
});

export const recommendationResultSchema = z.object({
  primary: z.object({
    program: programSchema,
    action: z.string().min(1),
    estimated_value_aed: z.number().min(0),
    reasoning: z.string().min(1),
    rule: merchantRuleSchema.optional(),
  }),
  alternatives: z.array(recommendationAlternativeSchema),
  reasoning_trace: z.string(),
});

// ─── Rule Submission (form validation) ───────────────────────────────────────

export const ruleSubmissionSchema = z
  .object({
    merchant_id: z.string().uuid('Please select a valid merchant'),
    program_id: z.string().uuid('Please select a valid loyalty program'),
    rule_type: ruleTypeSchema.describe('Type of benefit this rule provides'),
    earn_rate: z
      .number({ invalid_type_error: 'Earn rate must be a number' })
      .min(0, 'Earn rate cannot be negative')
      .nullable()
      .optional(),
    multiplier: z
      .number({ invalid_type_error: 'Multiplier must be a number' })
      .min(1, 'Multiplier must be at least 1x')
      .nullable()
      .optional(),
    discount_pct: z
      .number({ invalid_type_error: 'Discount must be a number' })
      .min(0, 'Discount cannot be negative')
      .max(100, 'Discount cannot exceed 100%')
      .nullable()
      .optional(),
    cashback_pct: z
      .number({ invalid_type_error: 'Cashback must be a number' })
      .min(0, 'Cashback cannot be negative')
      .max(100, 'Cashback cannot exceed 100%')
      .nullable()
      .optional(),
    min_spend: z.number().min(0, 'Minimum spend cannot be negative').default(0),
    max_spend: z
      .number({ invalid_type_error: 'Maximum spend must be a number' })
      .positive('Maximum spend must be positive')
      .nullable()
      .optional(),
    days_of_week: z.array(z.number().int().min(0).max(6)).default([]),
    start_date: z.string().datetime().nullable().optional(),
    end_date: z.string().datetime().nullable().optional(),
    description_text: z
      .string()
      .max(1000, 'Description must be under 1,000 characters')
      .nullable()
      .optional(),
    evidence_attachments: z
      .array(z.string().url('Each attachment must be a valid URL'))
      .max(5, 'You can attach a maximum of 5 evidence files')
      .default([]),
    source: ruleSourceSchema.default('community'),
  })
  .refine(
    (data) =>
      data.earn_rate != null ||
      data.multiplier != null ||
      data.discount_pct != null ||
      data.cashback_pct != null,
    {
      message:
        'You must provide at least one benefit value: earn rate, multiplier, discount %, or cashback %',
      path: ['earn_rate'],
    },
  )
  .refine(
    (data) => {
      if (data.rule_type === 'earn' && data.earn_rate == null) {
        return false;
      }
      return true;
    },
    {
      message: 'Earn rate is required for "earn" type rules',
      path: ['earn_rate'],
    },
  )
  .refine(
    (data) => {
      if (data.rule_type === 'multiplier' && data.multiplier == null) {
        return false;
      }
      return true;
    },
    {
      message: 'Multiplier value is required for "multiplier" type rules',
      path: ['multiplier'],
    },
  )
  .refine(
    (data) => {
      if (data.rule_type === 'discount' && data.discount_pct == null) {
        return false;
      }
      return true;
    },
    {
      message: 'Discount percentage is required for "discount" type rules',
      path: ['discount_pct'],
    },
  )
  .refine(
    (data) => {
      if (data.rule_type === 'cashback' && data.cashback_pct == null) {
        return false;
      }
      return true;
    },
    {
      message: 'Cashback percentage is required for "cashback" type rules',
      path: ['cashback_pct'],
    },
  )
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    {
      message: 'Start date must be before end date',
      path: ['start_date'],
    },
  )
  .refine(
    (data) => {
      if (data.max_spend != null && data.max_spend <= data.min_spend) {
        return false;
      }
      return true;
    },
    {
      message: 'Maximum spend must be greater than minimum spend',
      path: ['max_spend'],
    },
  );

// ─── Onboarding ───────────────────────────────────────────────────────────────

export const onboardingSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must be under 200 characters'),
  phone: z
    .string()
    .regex(/^\+971[0-9]{8,9}$/, 'Please enter a valid UAE mobile number starting with +971')
    .optional()
    .or(z.literal('')),
  preferred_language: z.enum(['en', 'ar']),
  goals: z
    .array(userGoalSchema)
    .min(1, 'Please select at least one goal')
    .max(4, 'You can select up to 4 goals'),
  monthly_spend_categories: z
    .record(z.string(), z.number().min(0, 'Spend amounts cannot be negative'))
    .optional()
    .default({}),
  program_ids: z
    .array(z.string().uuid())
    .min(1, 'Please add at least one loyalty program')
    .max(20, 'You can add up to 20 programs'),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type ProgramInput = z.infer<typeof programSchema>;
export type MerchantInput = z.infer<typeof merchantSchema>;
export type MerchantRuleInput = z.infer<typeof merchantRuleSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type RecommendationResultInput = z.infer<typeof recommendationResultSchema>;
export type RuleSubmissionInput = z.infer<typeof ruleSubmissionSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
