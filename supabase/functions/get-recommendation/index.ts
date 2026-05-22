// =============================================================================
// LoyaltyOne UAE — Edge Function: get-recommendation
// Receives user_id, merchant_id, spend_estimate, optional category
// Returns structured recommendation + saves to recommendations table
// =============================================================================

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecommendationRequest {
  user_id: string;
  merchant_id: string;
  spend_estimate: number;
  category?: string;
}

interface PrimaryRecommendation {
  program_slug: string;
  program_name: string;
  rule_id: string | null;
  action: string;
  estimated_value_aed: number;
  points_earned: number;
  reasoning: string;
  confidence: number;
}

interface AlternativeRecommendation {
  program_slug: string;
  program_name: string;
  rule_id: string | null;
  action: string;
  estimated_value_aed: number;
  points_earned: number;
  reasoning: string;
}

interface RecommendationResponse {
  primary: PrimaryRecommendation;
  alternatives: AlternativeRecommendation[];
  expiry_warning: string | null;
  tip: string | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // --------------------------------------------------------------------------
    // Parse request
    // --------------------------------------------------------------------------
    const body: RecommendationRequest = await req.json();
    const { user_id, merchant_id, spend_estimate, category } = body;

    if (!user_id || !merchant_id || spend_estimate == null) {
      return new Response(
        JSON.stringify({ error: "user_id, merchant_id, and spend_estimate are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --------------------------------------------------------------------------
    // Init Supabase (service role — bypasses RLS for server-side work)
    // --------------------------------------------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --------------------------------------------------------------------------
    // Fetch user goals + language
    // --------------------------------------------------------------------------
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, full_name, preferred_language, goals, reputation_score, reputation_tier")
      .eq("id", user_id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: "User not found", detail: userError?.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --------------------------------------------------------------------------
    // Fetch user's programs with balances
    // --------------------------------------------------------------------------
    const { data: userPrograms, error: upError } = await supabase
      .from("user_programs")
      .select(`
        id,
        current_balance,
        tier_name,
        expiry_dates,
        last_confirmed_at,
        programs (
          id,
          slug,
          display_name_en,
          category,
          default_earn_rate_aed,
          default_redemption_value_aed,
          expiry_rule,
          transfer_partners
        )
      `)
      .eq("user_id", user_id);

    if (upError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch user programs", detail: upError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --------------------------------------------------------------------------
    // Fetch merchant details
    // --------------------------------------------------------------------------
    const { data: merchantData, error: merchantError } = await supabase
      .from("merchants")
      .select("id, slug, display_name_en, display_name_ar, category")
      .eq("id", merchant_id)
      .single();

    if (merchantError || !merchantData) {
      return new Response(
        JSON.stringify({ error: "Merchant not found", detail: merchantError?.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --------------------------------------------------------------------------
    // Fetch active merchant_rules for this merchant, filtered to user's programs
    // --------------------------------------------------------------------------
    const programIds = (userPrograms ?? [])
      .map((up: Record<string, unknown>) => (up.programs as Record<string, unknown>)?.id)
      .filter(Boolean);

    let merchantRulesQuery = supabase
      .from("merchant_rules")
      .select(`
        id,
        rule_type,
        earn_rate,
        multiplier,
        discount_pct,
        cashback_pct,
        min_spend,
        max_spend,
        days_of_week,
        applies_to_categories,
        source,
        status,
        confidence_score,
        description_text,
        start_date,
        end_date,
        programs (id, slug, display_name_en)
      `)
      .eq("merchant_id", merchant_id)
      .neq("status", "expired")
      .neq("status", "disputed")
      .order("confidence_score", { ascending: false });

    if (programIds.length > 0) {
      merchantRulesQuery = merchantRulesQuery.in("program_id", programIds);
    }

    const { data: merchantRules, error: rulesError } = await merchantRulesQuery;

    if (rulesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch merchant rules", detail: rulesError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --------------------------------------------------------------------------
    // Fetch prompt template
    // --------------------------------------------------------------------------
    const { data: templateData, error: templateError } = await supabase
      .from("prompt_templates")
      .select("system_prompt, user_prompt_template")
      .eq("template_key", "TEMPLATE_RECOMMENDATION")
      .eq("is_active", true)
      .single();

    if (templateError || !templateData) {
      return new Response(
        JSON.stringify({ error: "Recommendation template not found" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --------------------------------------------------------------------------
    // Build user prompt by filling template variables
    // --------------------------------------------------------------------------
    const userPrompt = templateData.user_prompt_template!
      .replace("{{merchant_name}}", merchantData.display_name_en)
      .replace("{{user_programs_json}}", JSON.stringify(userPrograms ?? [], null, 2))
      .replace("{{user_goals_json}}", JSON.stringify(userData.goals ?? [], null, 2))
      .replace("{{merchant_rules_json}}", JSON.stringify(merchantRules ?? [], null, 2))
      .replace("{{spend_estimate}}", String(spend_estimate))
      .replace(
        "{{#if category}}Spend Category: {{category}}{{/if}}",
        category ? `Spend Category: ${category}` : ""
      );

    // --------------------------------------------------------------------------
    // Call Anthropic API
    // --------------------------------------------------------------------------
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-7",
      max_tokens: 1024,
      system: templateData.system_prompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract JSON from response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let recommendation: RecommendationResponse;
    try {
      // Strip any accidental markdown fences
      const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      recommendation = JSON.parse(cleaned);
    } catch (_parseError) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI recommendation",
          raw_response: responseText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --------------------------------------------------------------------------
    // Resolve chosen_program_id from primary recommendation slug
    // --------------------------------------------------------------------------
    const chosenProgram = (userPrograms ?? []).find(
      (up: Record<string, unknown>) =>
        (up.programs as Record<string, unknown>)?.slug === recommendation.primary?.program_slug
    );
    const chosenProgramId = chosenProgram
      ? (chosenProgram.programs as Record<string, unknown>)?.id
      : null;

    // --------------------------------------------------------------------------
    // Save recommendation to database
    // --------------------------------------------------------------------------
    const { data: savedRec, error: saveError } = await supabase
      .from("recommendations")
      .insert({
        user_id,
        merchant_id,
        spend_estimate,
        considered_programs: (userPrograms ?? []).map((up: Record<string, unknown>) => ({
          slug: (up.programs as Record<string, unknown>)?.slug,
          balance: up.current_balance,
        })),
        chosen_program_id: chosenProgramId ?? null,
        reasoning_text: recommendation.primary?.reasoning ?? null,
        alternatives: recommendation.alternatives ?? [],
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Failed to save recommendation:", saveError.message);
      // Non-fatal — still return the recommendation
    }

    // --------------------------------------------------------------------------
    // Return response
    // --------------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        recommendation_id: savedRec?.id ?? null,
        ...recommendation,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("get-recommendation error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
