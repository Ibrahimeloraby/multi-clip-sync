import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fan_id, onboarding_data } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const { data: profile } = await supabase
      .from("fan_profiles")
      .select("*, fan_clubs(clubs(name))")
      .eq("id", fan_id)
      .single();

    const primaryClub = profile?.fan_clubs?.[0]?.clubs?.name ?? "Unknown";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are FanZone's AI fan profiler. Analyze this fan's onboarding and determine their fan personality type.

Fan: ${profile?.username}
Primary Club: ${primaryClub}
Personality choice: ${onboarding_data?.personality_type ?? profile?.fan_personality_type}

Return a JSON object with:
- personality_type: one of [die_hard, analyst, social_fan, global_neutral]
- personality_label: human-readable label
- identity_score: 0-100 based on the depth of their fandom
- commercial_value_estimate: estimated annual fan spend in GBP
- talking_point: one compelling debate starter for their club's community

Respond with only valid JSON.`,
      }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Invalid AI response");

    const result = JSON.parse(content.text);

    await supabase
      .from("fan_profiles")
      .update({ fan_personality_type: result.personality_type })
      .eq("id", fan_id);

    await supabase
      .from("fan_passports")
      .update({ identity_score: result.identity_score })
      .eq("fan_id", fan_id);

    await supabase.from("fan_engagement_events").insert({
      fan_id,
      event_type: "onboarding_completed",
      event_data: result,
      coins_delta: 250,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
