import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { ReputationTier, ReputationEvent, LeaderboardEntry } from "@/types";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const reputationKeys = {
  all: ["reputation"] as const,
  mine: (userId: string) => ["reputation", "mine", userId] as const,
  events: (userId: string) => ["reputation", "events", userId] as const,
  leaderboard: (period: string) => ["reputation", "leaderboard", period] as const,
};

// ─── Tier thresholds ──────────────────────────────────────────────────────────

const TIER_THRESHOLDS: Record<ReputationTier, number> = {
  newcomer: 0,
  contributor: 50,
  trusted: 200,
  expert: 500,
  maven: 1000,
};

const TIER_ORDER: ReputationTier[] = [
  "newcomer",
  "contributor",
  "trusted",
  "expert",
  "maven",
];

function getNextTier(tier: ReputationTier): ReputationTier | null {
  const idx = TIER_ORDER.indexOf(tier);
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

// ─── useReputation ────────────────────────────────────────────────────────────

export interface ReputationData {
  reputationScore: number;
  reputationTier: ReputationTier;
  nextTier: ReputationTier | null;
  pointsToNextTier: number;
  progressPct: number;
  recentEvents: ReputationEvent[];
}

export function useReputation() {
  const { user } = useAuth();

  return useQuery({
    queryKey: reputationKeys.mine(user?.id ?? "anon"),
    queryFn: async (): Promise<ReputationData> => {
      if (!user) {
        return {
          reputationScore: 0,
          reputationTier: "newcomer",
          nextTier: "contributor",
          pointsToNextTier: 50,
          progressPct: 0,
          recentEvents: [],
        };
      }

      // Fetch user reputation fields
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("reputation_score, reputation_tier")
        .eq("id", user.id)
        .single();

      if (userError) throw new Error(userError.message);

      const score: number = userData.reputation_score ?? 0;
      const tier: ReputationTier = (userData.reputation_tier as ReputationTier) ?? "newcomer";
      const nextTier = getNextTier(tier);
      const currentThreshold = TIER_THRESHOLDS[tier];
      const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;

      const pointsToNextTier = nextThreshold !== null ? Math.max(0, nextThreshold - score) : 0;
      const progressPct =
        nextThreshold !== null
          ? Math.min(
              100,
              Math.round(
                ((score - currentThreshold) / (nextThreshold - currentThreshold)) * 100
              )
            )
          : 100;

      // Fetch recent reputation events (last 10)
      const { data: events, error: eventsError } = await supabase
        .from("reputation_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (eventsError) throw new Error(eventsError.message);

      return {
        reputationScore: score,
        reputationTier: tier,
        nextTier,
        pointsToNextTier,
        progressPct,
        recentEvents: (events ?? []) as ReputationEvent[],
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── useLeaderboard ───────────────────────────────────────────────────────────

export function useLeaderboard(period: "month" | "alltime" = "month") {
  return useQuery({
    queryKey: reputationKeys.leaderboard(period),
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (period === "alltime") {
        // Fetch users ordered by reputation_score DESC, top 10
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, reputation_score, reputation_tier")
          .order("reputation_score", { ascending: false })
          .limit(10);

        if (error) throw new Error(error.message);

        return (data ?? []).map((user, idx) => ({
          user_id: user.id,
          full_name: user.full_name,
          reputation_score: user.reputation_score,
          reputation_tier: user.reputation_tier as ReputationTier,
          rank: idx + 1,
          contributions_count: 0,
        }));
      }

      // Monthly leaderboard: sum points_delta from reputation_events in the current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data: events, error: eventsError } = await supabase
        .from("reputation_events")
        .select("user_id, points_delta")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      if (eventsError) throw new Error(eventsError.message);

      // Aggregate by user_id
      const userMap = new Map<
        string,
        { points: number; contributions: number }
      >();
      for (const event of events ?? []) {
        const existing = userMap.get(event.user_id) ?? { points: 0, contributions: 0 };
        userMap.set(event.user_id, {
          points: existing.points + (event.points_delta ?? 0),
          contributions: existing.contributions + 1,
        });
      }

      if (userMap.size === 0) return [];

      // Sort and take top 10
      const sorted = Array.from(userMap.entries())
        .sort(([, a], [, b]) => b.points - a.points)
        .slice(0, 10);

      // Fetch user details for top entries
      const userIds = sorted.map(([uid]) => uid);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, reputation_score, reputation_tier")
        .in("id", userIds);

      if (usersError) throw new Error(usersError.message);

      const usersById = new Map(
        (usersData ?? []).map((u) => [u.id, u])
      );

      return sorted.map(([uid, agg], idx) => {
        const u = usersById.get(uid);
        return {
          user_id: uid,
          full_name: u?.full_name ?? null,
          reputation_score: agg.points,
          reputation_tier: (u?.reputation_tier as ReputationTier) ?? "newcomer",
          rank: idx + 1,
          contributions_count: agg.contributions,
        };
      });
    },
    staleTime: 1000 * 60 * 10,
  });
}
