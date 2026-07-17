import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fan_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: passport } = await supabase
      .from("fan_passports")
      .select("*")
      .eq("fan_id", fan_id)
      .single();

    if (!passport) throw new Error("Passport not found");

    // Calculate tier
    const { data: tier } = await supabase.rpc("update_engagement_tier", { p_fan_id: fan_id });
    const { data: identityScore } = await supabase.rpc("calculate_fan_identity_score", { p_fan_id: fan_id });

    await supabase.from("fan_passports").update({ identity_score: identityScore }).eq("fan_id", fan_id);

    // Estimate commercial value
    const tierMultipliers: Record<string, number> = {
      Casual: 0.3, Active: 0.6, Superfan: 1.0, Legend: 1.5,
    };
    const baseValue = 1400;
    const multiplier = tierMultipliers[passport.engagement_tier] ?? 0.3;
    const estimatedValue = baseValue * multiplier;

    const spendingPower = estimatedValue < 500 ? "low"
      : estimatedValue < 900 ? "medium"
      : estimatedValue < 1400 ? "high"
      : "premium";

    await supabase.from("fan_commercial_profiles").upsert({
      fan_id,
      commercial_value_score: identityScore,
      estimated_annual_value: estimatedValue,
      spending_power: spendingPower,
      updated_at: new Date().toISOString(),
    }, { onConflict: "fan_id" });

    return new Response(JSON.stringify({
      success: true,
      tier,
      identity_score: identityScore,
      estimated_value: estimatedValue,
      spending_power: spendingPower,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
