import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_PROGRAMS = [
  "share-maf",
  "skywards",
  "etihad-guest",
  "smiles",
  "adcb-touchpoints",
  "enbd-plus",
  "mashreq-salaam",
  "fab-rewards",
  "hsbc-rewards",
  "u-emaar",
  "entertainer",
  "fazaa",
  "esaad",
  "privilee",
  "marriott-bonvoy",
  "hilton-honors",
  "accor-all",
  "ihg-one",
];

const SCREENSHOT_SYSTEM_PROMPT = `You are a computer vision extraction engine specialised in UAE loyalty program mobile app screenshots. You will receive a base64-encoded image of a loyalty app screenshot and must extract balance and account information.

Known programs and their slugs:
- Emirates Skywards → skywards
- Etihad Guest → etihad-guest
- Smiles (e& / Etisalat) → smiles
- ADCB TouchPoints → adcb-touchpoints
- Emirates NBD Plus → enbd-plus
- Mashreq Salaam → mashreq-salaam
- FAB Rewards → fab-rewards
- HSBC Rewards UAE → hsbc-rewards
- U By Emaar → u-emaar
- Share by Majid Al Futtaim → share-maf
- Marriott Bonvoy → marriott-bonvoy
- Hilton Honors → hilton-honors
- Accor ALL → accor-all
- IHG One Rewards → ihg-one
- The Entertainer → entertainer
- Fazaa → fazaa
- Esaad → esaad
- Privilee → privilee

Return only valid JSON. If data is unclear or unreadable, use null for that field. Do not hallucinate numbers — only report what is clearly visible.`;

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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      image_base64,
      media_type = "image/jpeg",
      hint_program,
    } = body as {
      image_base64: string;
      media_type?: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      hint_program?: string;
    };

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    const userPrompt = hint_program
      ? `Extract loyalty program data from this screenshot image. The user believes this is a ${hint_program} screenshot.

Return a JSON object with this exact structure:
{
  "program_slug": "string or null (use one of the known slugs listed in your instructions)",
  "program_name_detected": "string or null",
  "current_balance": number or null,
  "points_currency": "string or null (e.g. 'Miles', 'Points', 'Smiles')",
  "tier_name": "string or null",
  "tier_expiry_date": "ISO date string or null",
  "member_name": "string or null",
  "member_number": "string or null",
  "expiry_dates": [
    { "amount": number, "expires_at": "ISO date string", "description": "string" }
  ],
  "screenshot_date": "ISO date string or null",
  "parsing_confidence": "high|medium|low",
  "validation_warnings": ["string"]
}`
      : `Extract loyalty program data from this screenshot image.

Return a JSON object with this exact structure:
{
  "program_slug": "string or null (use one of the known slugs listed in your instructions)",
  "program_name_detected": "string or null",
  "current_balance": number or null,
  "points_currency": "string or null (e.g. 'Miles', 'Points', 'Smiles')",
  "tier_name": "string or null",
  "tier_expiry_date": "ISO date string or null",
  "member_name": "string or null",
  "member_number": "string or null",
  "expiry_dates": [
    { "amount": number, "expires_at": "ISO date string", "description": "string" }
  ],
  "screenshot_date": "ISO date string or null",
  "parsing_confidence": "high|medium|low",
  "validation_warnings": ["string"]
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-7",
      max_tokens: 1024,
      system: SCREENSHOT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type,
                data: image_base64,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    let parsed: Record<string, unknown>;
    try {
      const cleanedJson = responseText
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      parsed = JSON.parse(cleanedJson) as Record<string, unknown>;
    } catch {
      parsed = {
        program_slug: null,
        program_name_detected: null,
        current_balance: null,
        points_currency: null,
        tier_name: null,
        tier_expiry_date: null,
        member_name: null,
        member_number: null,
        expiry_dates: [],
        screenshot_date: null,
        parsing_confidence: "low",
        validation_warnings: ["Failed to parse Claude response as JSON"],
      };
    }

    // Validate program_slug against known slugs
    if (
      parsed.program_slug &&
      !SUPPORTED_PROGRAMS.includes(parsed.program_slug as string)
    ) {
      const warnings = (parsed.validation_warnings as string[]) ?? [];
      warnings.push(
        `Unrecognized program slug: ${parsed.program_slug}. Resetting to null.`
      );
      parsed.program_slug = null;
      parsed.validation_warnings = warnings;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[parse-screenshot] Error:", error);
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
