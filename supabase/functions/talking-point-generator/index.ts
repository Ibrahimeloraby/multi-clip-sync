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
    const { club_id, match_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const { data: club } = await supabase.from("clubs").select("name").eq("id", club_id).single();

    let matchContext = "";
    if (match_id) {
      const { data: match } = await supabase
        .from("matches")
        .select("*, home_club:clubs!matches_home_club_id_fkey(name), away_club:clubs!matches_away_club_id_fkey(name)")
        .eq("id", match_id)
        .single();
      if (match) {
        matchContext = `Upcoming match: ${match.home_club?.name} vs ${match.away_club?.name}`;
      }
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `Generate 3 compelling debate talking points for ${club?.name} fans to discuss in their community.
${matchContext}

Each talking point should:
- Be provocative but fun, not offensive
- Spark genuine debate among fans
- Be relevant to the current football season

Return a JSON array of 3 objects, each with:
- prompt: the debate question (max 100 chars)
- context: brief context for why this is debatable (max 150 chars)

Respond with only valid JSON array.`,
      }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Invalid AI response");

    const points = JSON.parse(content.text);

    const inserts = points.map((p: any) => ({
      club_id,
      match_id: match_id ?? null,
      prompt: p.prompt,
      context: p.context,
      generated_by: "ai",
    }));

    await supabase.from("talking_points").insert(inserts);

    return new Response(JSON.stringify({ success: true, talking_points: points }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
