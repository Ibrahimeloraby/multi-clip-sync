/**
 * Client-side wrapper around Supabase Edge Functions that invoke Claude.
 * The browser NEVER calls the Anthropic API directly — all AI calls go
 * through our own edge functions which hold the secret key server-side.
 */

import { supabase } from "@/lib/supabase";
import type {
  RecommendationResult,
  ScreenshotParseResult,
  RuleSanityResult,
  RuleSubmission,
} from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecommendationParams {
  merchantId: string;
  amountAed: number;
  category?: string;
  userProgramIds: string[];
}

// ─── Helper: call an edge function with auth ──────────────────────────────────

async function callEdgeFunction<T>(
  functionName: string,
  payload: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body: payload,
  });

  if (error) {
    throw new Error(`Edge function ${functionName} failed: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Edge function ${functionName} returned no data`);
  }

  return data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get an AI-powered loyalty card recommendation for a given merchant + spend.
 * Calls: supabase/functions/recommend/index.ts
 */
export async function getRecommendation(
  params: RecommendationParams
): Promise<RecommendationResult> {
  return callEdgeFunction<RecommendationResult>("recommend", {
    merchant_id: params.merchantId,
    amount_aed: params.amountAed,
    category: params.category ?? null,
    user_program_ids: params.userProgramIds,
  });
}

/**
 * Parse a receipt/loyalty-statement screenshot using Claude vision.
 * imageBase64 should be a data-URL or raw base64 string of the image.
 * Calls: supabase/functions/parse-screenshot/index.ts
 */
export async function parseScreenshot(
  imageBase64: string
): Promise<ScreenshotParseResult> {
  // Strip the data-URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
  return callEdgeFunction<ScreenshotParseResult>("parse-screenshot", {
    image_base64: base64Data,
  });
}

/**
 * Run a sanity check on a community-submitted rule before it enters the DB.
 * Calls: supabase/functions/validate-rule/index.ts
 */
export async function validateRule(
  rule: RuleSubmission
): Promise<RuleSanityResult> {
  return callEdgeFunction<RuleSanityResult>("validate-rule", {
    rule,
  });
}

/**
 * Parse a forwarded loyalty email (raw text) to extract balance / transaction.
 * Calls: supabase/functions/parse-email/index.ts
 */
export async function parseEmail(rawEmailText: string): Promise<{
  program_slug: string | null;
  transaction_type: string | null;
  points_amount: number | null;
  balance_after: number | null;
  expiry_date: string | null;
  merchant_if_any: string | null;
}> {
  return callEdgeFunction("parse-email", { raw_email_text: rawEmailText });
}
