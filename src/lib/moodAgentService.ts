import { supabase } from "@/integrations/supabase/client";
import { fetchContentForMood } from "@/lib/tmdb";
import type { MoodType, MoodAgentResponse, UserPlatform, WatchHistoryEntry } from "@/agent/types";

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY as string;

export async function getRecommendations(
  mood: MoodType,
  userPlatforms: UserPlatform[],
  watchHistory: WatchHistoryEntry[],
  moodDescription?: string,
  region = "US"
): Promise<MoodAgentResponse> {
  if (!TMDB_API_KEY) {
    throw new Error("VITE_TMDB_API_KEY is not set. Add it to your .env file.");
  }

  const activePlatformIds = userPlatforms
    .filter((p) => p.is_active)
    .map((p) => p.platform_id);

  // Step 1: Fetch content from TMDB matching the mood + user's platforms
  const contentItems = await fetchContentForMood(
    mood,
    activePlatformIds,
    region,
    TMDB_API_KEY
  );

  if (contentItems.length === 0) {
    throw new Error(
      "No content found for your platforms. Try connecting more platforms or changing your region."
    );
  }

  // Step 2: Get TMDb IDs user has already watched
  const watchedIds = watchHistory.map((h) => h.tmdb_id);

  // Step 3: Call the Claude mood agent edge function
  const { data, error } = await supabase.functions.invoke("mood-agent", {
    body: {
      mood,
      mood_description: moodDescription,
      content_items: contentItems,
      watched_tmdb_ids: watchedIds,
      region,
    },
  });

  if (error) throw new Error(`Agent error: ${error.message}`);
  if (data?.error) throw new Error(data.error);

  return data as MoodAgentResponse;
}

export async function saveMoodSession(
  userId: string,
  mood: MoodType,
  response: MoodAgentResponse,
  moodDescription?: string
): Promise<void> {
  await supabase.from("mood_sessions").insert({
    user_id: userId,
    mood,
    mood_description: moodDescription,
    recommendations: response.recommendations,
    agent_analysis: response.analysis,
  });
}

export async function markAsWatched(
  userId: string,
  entry: Omit<WatchHistoryEntry, "id" | "watched_at">
): Promise<void> {
  await supabase.from("content_watch_history").insert({
    user_id: userId,
    tmdb_id: entry.tmdb_id,
    content_type: entry.content_type,
    title: entry.title,
    poster_path: entry.poster_path,
    mood_at_watch: entry.mood_at_watch,
    user_rating: entry.user_rating,
    mood_after: entry.mood_after,
    review: entry.review,
  });
}

export async function loadUserPlatforms(userId: string): Promise<UserPlatform[]> {
  const { data } = await supabase
    .from("user_platforms")
    .select("platform_id, platform_name, is_active, country_code")
    .eq("user_id", userId);
  return (data ?? []) as UserPlatform[];
}

export async function saveUserPlatform(
  userId: string,
  platform: UserPlatform
): Promise<void> {
  await supabase.from("user_platforms").upsert({
    user_id: userId,
    platform_id: platform.platform_id,
    platform_name: platform.platform_name,
    is_active: platform.is_active,
    country_code: platform.country_code,
  });
}

export async function removeUserPlatform(userId: string, platformId: string): Promise<void> {
  await supabase
    .from("user_platforms")
    .delete()
    .eq("user_id", userId)
    .eq("platform_id", platformId);
}

export async function loadWatchHistory(userId: string): Promise<WatchHistoryEntry[]> {
  const { data } = await supabase
    .from("content_watch_history")
    .select("*")
    .eq("user_id", userId)
    .order("watched_at", { ascending: false })
    .limit(100);
  return (data ?? []) as WatchHistoryEntry[];
}
