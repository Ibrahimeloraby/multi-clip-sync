import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const matchSelect = `
  *,
  home_club:clubs!matches_home_club_id_fkey(*),
  away_club:clubs!matches_away_club_id_fkey(*),
  competition:competitions(*)
`;

export const useMatches = (status?: string) =>
  useQuery({
    queryKey: ["matches", status],
    queryFn: async () => {
      let q = supabase.from("matches").select(matchSelect).order("scheduled_at");
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useMatch = (id?: string) =>
  useQuery({
    queryKey: ["match", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("matches")
        .select(matchSelect)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useLiveMatches = () =>
  useQuery({
    queryKey: ["matches", "live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(matchSelect)
        .eq("status", "live")
        .order("scheduled_at");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

export const useUpcomingMatches = (limit = 10) =>
  useQuery({
    queryKey: ["matches", "upcoming", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(matchSelect)
        .eq("status", "upcoming")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });

export const useClubMatches = (clubId?: string) =>
  useQuery({
    queryKey: ["matches", "club", clubId],
    queryFn: async () => {
      if (!clubId) return [];
      const { data, error } = await supabase
        .from("matches")
        .select(matchSelect)
        .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`)
        .order("scheduled_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!clubId,
  });
