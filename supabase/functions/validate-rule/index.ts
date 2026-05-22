import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RULE_SANITY_SYSTEM_PROMPT = `You are a data quality validator for UAE loyalty program merchant rules. Your job is to assess whether a newly submitted earn/cashback/discount rule is plausible, consistent with known program structures, and free from obvious errors or fraud signals.

UAE context:
- Most bank cards earn 1 pt/AED as baseline
- 2x-3x is common for promoted categories (fuel, groceries)
- 4x-5x is exceptional and should be flagged for review
- >10x is suspicious unless from an official source
- Cashback rates above 10% are extremely rare for general spend
- BOGO (2-for-1) offers are typically Entertainer-style for restaurants
- Discount rules should be in the range 5%-50% for typical merchants

Return only valid JSON with no explanation outside the JSON object.`;

interface SubmittedRule {
  rule_type: string;
  earn_rate?: number | null;
  multiplier?: number | null;
  discount_pct?: number | null;
  cashback_pct?: number | null;
  applies_to_categories?: string[];
  min_spend?: number | null;
  days_of_week?: number[];
  description_text?: string;
}

interface ValidationResult {
  is_plausible: boolean;
  plausibility_score: number;
  flags: Array<{ type: "warning" | "error" | "info"; message: string }>;
  conflicts_with_existing: boolean;
  conflict_details: string | null;
  suggested_status: "pending" | "provisional" | "trusted" | "disputed";
  should_admin_review: boolean;
  admin_review_reason: string | null;
  auto_approve: boolean;
  notes: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const {
      rule,
      merchant_id,
    }: { rule: SubmittedRule; merchant_id: string } = body;

    if (!rule || !merchant_id) {
      return new Response(
        JSON.stringify({ error: "rule and merchant_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Fetch submitter reputation info
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("reputation_score, reputation_tier")
      .eq("id", user.id)
      .single();

    const submitterReputationScore = (profile?.reputation_score as number) ?? 0;
    const submitterTier =
      (profile?.reputation_tier as string) ?? "newcomer";

    // 2. Fetch existing rules for the same merchant
    const { data: existingRules } = await supabaseAdmin
      .from("merchant_rules")
      .select(
        "id, rule_type, earn_rate, multiplier, discount_pct, cashback_pct, confidence_score, status, program_id"
      )
      .eq("merchant_id", merchant_id)
      .in("status", ["provisional", "verified", "trusted"]);

    // 3. Fetch program details if program_id is present in rule
    // (rule object may include program_id from the caller)
    const programId = (rule as Record<string, unknown>).program_id as
      | string
      | undefined;
    let programDetails: Record<string, unknown> | null = null;
    if (programId) {
      const { data: prog } = await supabaseAdmin
        .from("programs")
        .select("slug, display_name_en, category, default_earn_rate_aed")
        .eq("id", programId)
        .single();
      programDetails = prog as Record<string, unknown> | null;
    }

    // 4. Build Claude prompt
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    const userPrompt = `Validate this merchant rule submission.

Submitted Rule:
${JSON.stringify(rule, null, 2)}

Existing Rules for Same Merchant (${existingRules?.length ?? 0} rules):
${JSON.stringify(existingRules ?? [], null, 2)}

Program Details:
${JSON.stringify(programDetails ?? { note: "program details not available" }, null, 2)}

Submitter Reputation Score: ${submitterReputationScore}
Submitter Tier: ${submitterTier}

Return a JSON object with this exact structure:
{
  "is_plausible": boolean,
  "plausibility_score": integer (0-100),
  "flags": [
    { "type": "warning|error|info", "message": "string" }
  ],
  "conflicts_with_existing": boolean,
  "conflict_details": "string or null",
  "suggested_status": "pending|provisional|trusted|disputed",
  "should_admin_review": boolean,
  "admin_review_reason": "string or null",
  "auto_approve": boolean,
  "notes": "string or null"
}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: RULE_SANITY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    let validationResult: ValidationResult;
    try {
      const cleaned = responseText.replace(/```json\n?|\n?```/g, "").trim();
      validationResult = JSON.parse(cleaned) as ValidationResult;
    } catch {
      validationResult = {
        is_plausible: false,
        plausibility_score: 0,
        flags: [{ type: "error", message: "AI validation failed to parse" }],
        conflicts_with_existing: false,
        conflict_details: null,
        suggested_status: "pending",
        should_admin_review: true,
        admin_review_reason: "AI validation response could not be parsed",
        auto_approve: false,
        notes: null,
      };
    }

    // 5. If should_admin_review, insert into admin_review_queue
    if (validationResult.should_admin_review) {
      // The rule_id is provided if the rule was already inserted by the caller
      const ruleId = (body as Record<string, unknown>).rule_id as
        | string
        | undefined;
      if (ruleId) {
        const { error: queueError } = await supabaseAdmin
          .from("admin_review_queue")
          .insert({
            rule_id: ruleId,
            priority:
              validationResult.plausibility_score < 40 ? "high" : "normal",
            admin_review_reason: validationResult.admin_review_reason,
            status: "pending",
          })
          .select()
          .single();

        if (queueError) {
          console.warn(
            "[validate-rule] Failed to insert admin_review_queue:",
            queueError.message
          );
        }
      }
    }

    return new Response(JSON.stringify(validationResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[validate-rule] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
