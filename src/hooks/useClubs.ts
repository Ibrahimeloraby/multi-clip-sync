import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useClubs = (sportId?: string) =>
  useQuery({
    queryKey: ["clubs", sportId],
    queryFn: async () => {
      let q = supabase.from("clubs").select("*, sports(*), countries(*)").order("name");
      if (sportId) q = q.eq("sport_id", sportId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useClubBySlug = (slug?: string) =>
  useQuery({
    queryKey: ["club", "slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("clubs")
        .select("*, sports(*), countries(*)")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

export const useClubById = (id?: string) =>
  useQuery({
    queryKey: ["club", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("clubs")
        .select("*, sports(*), countries(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useAthletes = (clubId?: string) =>
  useQuery({
    queryKey: ["athletes", clubId],
    queryFn: async () => {
      let q = supabase.from("athletes").select("*, clubs(*), sports(*)").order("name");
      if (clubId) q = q.eq("club_id", clubId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useSports = () =>
  useQuery({
    queryKey: ["sports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sports").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

export const useCompetitions = (sportId?: string) =>
  useQuery({
    queryKey: ["competitions", sportId],
    queryFn: async () => {
      let q = supabase.from("competitions").select("*, sports(*)").order("name");
      if (sportId) q = q.eq("sport_id", sportId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useFollowClub = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fanId, clubId, isPrimary = false }: { fanId: string; clubId: string; isPrimary?: boolean }) => {
      const { data: existing } = await supabase
        .from("fan_clubs")
        .select("id")
        .eq("fan_id", fanId)
        .eq("club_id", clubId)
        .maybeSingle();

      if (existing) {
        await supabase.from("fan_clubs").delete().eq("fan_id", fanId).eq("club_id", clubId);
      } else {
        await supabase.from("fan_clubs").insert({ fan_id: fanId, club_id: clubId, is_primary: isPrimary });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["fan_clubs", vars.fanId] });
    },
  });
};

export const useFollowAthlete = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fanId, athleteId }: { fanId: string; athleteId: string }) => {
      const { data: existing } = await supabase
        .from("fan_athletes")
        .select("id")
        .eq("fan_id", fanId)
        .eq("athlete_id", athleteId)
        .maybeSingle();

      if (existing) {
        await supabase.from("fan_athletes").delete().eq("fan_id", fanId).eq("athlete_id", athleteId);
      } else {
        await supabase.from("fan_athletes").insert({ fan_id: fanId, athlete_id: athleteId });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["fan_athletes", vars.fanId] });
    },
  });
};
