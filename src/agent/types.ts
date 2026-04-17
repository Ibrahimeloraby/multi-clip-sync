export type MoodType =
  | "excited"
  | "happy"
  | "slow burn"
  | "mystery"
  | "thriller"
  | "dramatic"
  | "romantic comedy"
  | "comedy"
  | "action"
  | "horror";

export interface MoodConfig {
  id: MoodType;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

export const MOODS: MoodConfig[] = [
  { id: "excited", label: "Excited", emoji: "⚡", description: "High energy, thrilling rides", color: "from-yellow-500 to-orange-500" },
  { id: "happy", label: "Happy", emoji: "😊", description: "Feel-good, uplifting stories", color: "from-yellow-400 to-pink-400" },
  { id: "slow burn", label: "Slow Burn", emoji: "🕯️", description: "Deep, atmospheric, rewarding", color: "from-amber-600 to-red-700" },
  { id: "mystery", label: "Mystery", emoji: "🔍", description: "Puzzles, secrets, suspense", color: "from-indigo-600 to-purple-700" },
  { id: "thriller", label: "Thriller", emoji: "😰", description: "Edge-of-seat tension", color: "from-slate-600 to-red-800" },
  { id: "dramatic", label: "Dramatic", emoji: "🎭", description: "Emotional depth, powerful", color: "from-rose-600 to-purple-600" },
  { id: "romantic comedy", label: "Rom-Com", emoji: "💕", description: "Witty romance, charming leads", color: "from-pink-400 to-rose-500" },
  { id: "comedy", label: "Comedy", emoji: "😂", description: "Pure laughs, clever humor", color: "from-green-400 to-teal-500" },
  { id: "action", label: "Action", emoji: "💥", description: "Explosive spectacle", color: "from-red-500 to-orange-600" },
  { id: "horror", label: "Horror", emoji: "👻", description: "Frightening, tense, scary", color: "from-gray-800 to-red-900" },
];

export interface OTTPlatform {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  emoji: string;
  tmdbProviderId: number;
  logo?: string;
  countries: string[];
}

export interface ContentItem {
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

export interface Recommendation {
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

export interface MoodAgentResponse {
  analysis: string;
  mood_summary: string;
  recommendations: Recommendation[];
}

export interface UserPlatform {
  platform_id: string;
  platform_name: string;
  is_active: boolean;
  country_code: string;
}

export interface WatchHistoryEntry {
  id: string;
  tmdb_id: number;
  content_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  watched_at: string;
  mood_at_watch?: string;
  user_rating?: number;
  mood_after?: string;
  review?: string;
}

export interface PlatformSubscription {
  id: string;
  platform_id: string;
  platform_name: string;
  billing_cycle: "monthly" | "yearly";
  amount?: number;
  currency: string;
  next_renewal_date?: string;
  auto_renew: boolean;
  notify_days_before: number;
  status: "active" | "paused" | "cancelled";
}
