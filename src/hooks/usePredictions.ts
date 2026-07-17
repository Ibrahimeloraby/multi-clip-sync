import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMyPredictions = (userId?: string) =>
  useQuery({
    queryKey: ["predictions", "me", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("predictions")
        .select("*, matches(*, home_club:clubs!matches_home_club_id_fkey(*), away_club:clubs!matches_away_club_id_fkey(*))")
        .eq("fan_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

export const useMatchPredictions = (matchId?: string) =>
  useQuery({
    queryKey: ["predictions", "match", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

export const useMyPredictionForMatch = (userId?: string, matchId?: string) =>
  useQuery({
    queryKey: ["prediction", userId, matchId],
    queryFn: async () => {
      if (!userId || !matchId) return null;
      const { data } = await supabase
        .from("predictions")
        .select("*")
        .eq("fan_id", userId)
        .eq("match_id", matchId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId && !!matchId,
  });

export const useSubmitPrediction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fan_id: string;
      match_id: string;
      home_score_prediction: number;
      away_score_prediction: number;
      confidence: string;
    }) => {
      const { data, error } = await supabase
        .from("predictions")
        .upsert(payload, { onConflict: "fan_id,match_id" })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("reward_transactions").insert({
        fan_id: payload.fan_id,
        amount: 80,
        type: "earn",
        source: "prediction",
        description: "FanCoins for match prediction",
      });

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["predictions"] });
      qc.invalidateQueries({ queryKey: ["fan_passport", vars.fan_id] });
    },
  });
};

export const useGlobalLeaderboard = (period = "all_time") =>
  useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prediction_leaderboards")
        .select("*, fan_profiles(username, display_name, avatar_url)")
        .eq("period", period)
        .order("points", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
