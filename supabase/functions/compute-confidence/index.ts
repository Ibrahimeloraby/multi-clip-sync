import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type RuleStatus =
  | "pending"
  | "provisional"
  | "verified"
  | "trusted"
  | "disputed"
  | "expired";

type ReputationTier =
  | "newcomer"
  | "contributor"
  | "trusted"
  | "expert"
  | "maven";

const TIER_BONUS: Record<ReputationTier, number> = {
  newcomer: 0,
  contributor: 5,
  trusted: 10,
  expert: 15,
  maven: 20,
};

function computeConfidenceScore(params: {
  confirmations: number;
  hasReceiptEvidence: boolean;
  hasScreenshotEvidence: boolean;
  submitterTier: ReputationTier;
  adminVerified: boolean;
  disputes: number;
  daysSinceLastConfirmation: number;
  conflictsWithHigherConfidence: boolean;
}): number {
  let score = 0;

  score += Math.min(params.confirmations * 8, 40);
  score += params.hasReceiptEvidence ? 20 : 0;
  score += params.hasScreenshotEvidence ? 10 : 0;
  score += TIER_BONUS[params.submitterTier] ?? 0;
  score += params.adminVerified ? 30 : 0;
  score -= params.disputes * 12;
  score -= params.daysSinceLastConfirmation * 0.15;
  score -= params.conflictsWithHigherConfidence ? 25 : 0;

  return Math.max(0, Math.round(score));
}

function getStatusFromScore(
  score: number,
  hasActiveDisputes: boolean
): RuleStatus {
  if (hasActiveDisputes && score < 60) return "disputed";
  if (score >= 85) return "trusted";
  if (score >= 60) return "verified";
  if (score >= 30) return "provisional";
  return "pending";
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role for reading confirmations and updating rules
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { rule_id }: { rule_id: string } = body;

    if (!rule_id) {
      return new Response(JSON.stringify({ error: "rule_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch the rule
    const { data: rule, error: ruleError } = await supabase
      .from("merchant_rules")
      .select(
        "id, confidence_score, status, verified_by_user_id, submitted_by, created_at, evidence_attachments, merchant_id"
      )
      .eq("id", rule_id)
      .single();

    if (ruleError || !rule) {
      return new Response(
        JSON.stringify({ error: "Rule not found", detail: ruleError?.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const oldScore = rule.confidence_score as number;

    // 2. Fetch all confirmations for this rule
    const { data: confirmations, error: confError } = await supabase
      .from("rule_confirmations")
      .select("id, confirmation_type, evidence_url, user_id, created_at")
      .eq("rule_id", rule_id)
      .order("created_at", { ascending: false });

    if (confError) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch confirmations",
          detail: confError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const allConfirmations = confirmations ?? [];

    // 3. Compute evidence flags
    const evidenceAttachments = (rule.evidence_attachments as string[]) ?? [];
    const confirmationEvidenceUrls = allConfirmations
      .map((c) => (c.evidence_url as string | null) ?? "")
      .filter(Boolean);
    const allEvidence = [...evidenceAttachments, ...confirmationEvidenceUrls];

    const hasReceiptEvidence = allEvidence.some((e) =>
      e.toLowerCase().includes("receipt")
    );
    const hasScreenshotEvidence = allEvidence.some((e) =>
      e.toLowerCase().includes("screenshot")
    );

    // 4. Count confirmations vs disputes
    const confirmsCount = allConfirmations.filter(
      (c) => c.confirmation_type === "confirm"
    ).length;
    const disputesCount = allConfirmations.filter(
      (c) => c.confirmation_type === "dispute"
    ).length;
    const hasActiveDisputes = disputesCount > 0;

    // 5. Compute days since last confirmation
    const lastConfirmation = allConfirmations[0];
    let daysSinceLastConfirmation = 0;
    if (lastConfirmation) {
      const lastDate = new Date(lastConfirmation.created_at as string);
      daysSinceLastConfirmation = Math.floor(
        (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    } else {
      // No confirmations — use days since rule was created
      const createdAt = new Date(rule.created_at as string);
      daysSinceLastConfirmation = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // 6. Get submitter tier
    let submitterTier: ReputationTier = "newcomer";
    if (rule.submitted_by) {
      const { data: submitterProfile } = await supabase
        .from("profiles")
        .select("reputation_tier")
        .eq("id", rule.submitted_by as string)
        .single();
      if (submitterProfile?.reputation_tier) {
        submitterTier = submitterProfile.reputation_tier as ReputationTier;
      }
    }

    // 7. Check for conflicts with higher-confidence rules
    const { data: conflictingRules } = await supabase
      .from("merchant_rules")
      .select("id, confidence_score")
      .eq("merchant_id", rule.merchant_id as string)
      .neq("id", rule_id)
      .gt("confidence_score", oldScore + 20); // significantly higher confidence

    const conflictsWithHigherConfidence = (conflictingRules?.length ?? 0) > 0;

    // 8. Compute new score
    const newScore = computeConfidenceScore({
      confirmations: confirmsCount,
      hasReceiptEvidence,
      hasScreenshotEvidence,
      submitterTier,
      adminVerified: !!(rule.verified_by_user_id),
      disputes: disputesCount,
      daysSinceLastConfirmation,
      conflictsWithHigherConfidence,
    });

    const newStatus = getStatusFromScore(newScore, hasActiveDisputes);

    // 9. Update the rule
    const { error: updateError } = await supabase
      .from("merchant_rules")
      .update({
        confidence_score: newScore,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rule_id);

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: "Failed to update rule",
          detail: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = {
      rule_id,
      old_score: oldScore,
      new_score: newScore,
      new_status: newStatus,
      computation_details: {
        confirmations: confirmsCount,
        disputes: disputesCount,
        has_receipt_evidence: hasReceiptEvidence,
        has_screenshot_evidence: hasScreenshotEvidence,
        submitter_tier: submitterTier,
        admin_verified: !!(rule.verified_by_user_id),
        days_since_last_confirmation: daysSinceLastConfirmation,
        conflicts_with_higher_confidence: conflictsWithHigherConfidence,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[compute-confidence] Error:", error);
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
