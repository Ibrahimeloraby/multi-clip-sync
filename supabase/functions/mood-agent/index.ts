import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

// Mood profiles for the system prompt
const MOOD_PROFILES: Record<string, string> = {
  excited: "Fast-paced, high-energy, lots of action and twists, adrenaline rush, spectacle",
  happy: "Uplifting, feel-good, wholesome, heartwarming, leaves you smiling",
  "slow burn": "Character-driven, atmospheric, takes time to develop but deeply rewarding, contemplative",
  mystery: "Puzzles, secrets, suspense, whodunit satisfaction, cerebral engagement",
  thriller: "Psychological tension, high stakes, edge-of-seat moments, suspense",
  dramatic: "Emotional depth, powerful performances, meaningful themes, character arcs",
  "romantic comedy": "Light-hearted romance, witty banter, charming leads, happy endings",
  comedy: "Laugh-out-loud funny, clever humor, escapism through laughter",
  action: "Explosions, fight sequences, chase scenes, kinetic spectacle",
  horror: "Frightening atmosphere, builds dread, scares, unsettling tension",
};

interface ContentItem {
  tmdb_id: number;
  content_type: "movie" | "tv";
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genres: string[];
  available_platforms: Array<{ id: string; name: string }>;
}

interface AgentRequest {
  mood: string;
  mood_description?: string;
  content_items: ContentItem[];
  watched_tmdb_ids: number[];
  region?: string;
}

interface Recommendation {
  tmdb_id: number;
  content_type: "movie" | "tv";
  title: string;
  mood_match: "high" | "medium" | "low";
  explanation: string;
  available_platforms: Array<{ id: string; name: string }>;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
}

interface AgentResponse {
  analysis: string;
  recommendations: Recommendation[];
  mood_summary: string;
}

async function callClaude(prompt: string, contentItems: ContentItem[]): Promise<AgentResponse> {
  const contentSummary = contentItems.slice(0, 40).map(item => ({
    id: item.tmdb_id,
    type: item.content_type,
    title: item.title,
    overview: item.overview?.slice(0, 200),
    genres: item.genres,
    rating: item.vote_average,
    year: item.release_date?.slice(0, 4),
    platforms: item.available_platforms.map(p => p.name),
    poster: item.poster_path,
    release_date: item.release_date,
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: `You are MoodMatch, an expert personal entertainment companion. You analyze movies and TV shows and recommend the best ones based on a user's current mood.

Your task: Given a mood and a list of available content, select 5-8 best recommendations ranked from best to least mood match.

For each recommendation:
- Explain specifically WHY this content matches the mood (mention specific themes, tone, pacing, emotional resonance)
- Assign mood_match: "high" (perfect fit), "medium" (good fit), or "low" (loose but interesting fit)
- Skip content already in the user's watch history

ALWAYS respond with valid JSON in exactly this structure:
{
  "analysis": "2-3 sentence overall analysis of the available content for this mood",
  "mood_summary": "One sentence capturing the essence of what the user needs right now",
  "recommendations": [
    {
      "tmdb_id": <number>,
      "content_type": "movie" | "tv",
      "title": "<string>",
      "mood_match": "high" | "medium" | "low",
      "explanation": "<2-3 sentences explaining mood fit>",
      "available_platforms": [{"id": "<string>", "name": "<string>"}],
      "poster_path": "<string or null>",
      "release_date": "<string>",
      "vote_average": <number>
    }
  ]
}`,
      messages: [
        {
          role: "user",
          content: prompt + "\n\nAvailable content:\n" + JSON.stringify(contentSummary, null, 2),
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${error}`);
  }

  const data = await response.json();

  // Extract text from response (may include thinking blocks)
  let text = "";
  for (const block of data.content) {
    if (block.type === "text") {
      text = block.text;
      break;
    }
  }

  // Parse JSON from Claude's response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from Claude response");

  const parsed = JSON.parse(jsonMatch[0]) as AgentResponse;

  // Enrich recommendations with full content item data
  parsed.recommendations = parsed.recommendations.map(rec => {
    const original = contentItems.find(
      c => c.tmdb_id === rec.tmdb_id && c.content_type === rec.content_type
    );
    return {
      ...rec,
      available_platforms: original?.available_platforms ?? rec.available_platforms,
      poster_path: original?.poster_path ?? rec.poster_path,
      release_date: original?.release_date ?? rec.release_date,
      vote_average: original?.vote_average ?? rec.vote_average,
    };
  });

  return parsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const body: AgentRequest = await req.json();
    const { mood, mood_description, content_items, watched_tmdb_ids } = body;

    if (!mood || !content_items?.length) {
      return new Response(
        JSON.stringify({ error: "mood and content_items are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Filter out already-watched content
    const unwatched = content_items.filter(
      item => !watched_tmdb_ids?.includes(item.tmdb_id)
    );

    const moodProfile = MOOD_PROFILES[mood.toLowerCase()] ?? mood;

    const prompt = `The user's current mood is: "${mood}"
Mood profile: ${moodProfile}
${mood_description ? `User's additional context: "${mood_description}"` : ""}
Already watched (skip these TMDb IDs): ${JSON.stringify(watched_tmdb_ids ?? [])}

Please recommend the best content from the available list for this mood. Focus on quality matches over quantity.`;

    const result = await callClaude(prompt, unwatched);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Mood agent error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
