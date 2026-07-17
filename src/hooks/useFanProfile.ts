import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMyProfile = (userId?: string) =>
  useQuery({
    queryKey: ["fan_profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("fan_profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

export const useMyPassport = (userId?: string) =>
  useQuery({
    queryKey: ["fan_passport", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("fan_passports")
        .select("*")
        .eq("fan_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("fan_profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["fan_profile", data.id] });
    },
  });
};

export const useMyFollowedClubs = (userId?: string) =>
  useQuery({
    queryKey: ["fan_clubs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("fan_clubs")
        .select("*, clubs(*)")
        .eq("fan_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

export const useMyFollowedAthletes = (userId?: string) =>
  useQuery({
    queryKey: ["fan_athletes", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("fan_athletes")
        .select("*, athletes(*)")
        .eq("fan_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

export const useMyCollectibles = (userId?: string) =>
  useQuery({
    queryKey: ["collectibles", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("digital_collectibles")
        .select("*")
        .eq("fan_id", userId)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

export const useMyCommercialProfile = (userId?: string) =>
  useQuery({
    queryKey: ["commercial_profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("fan_commercial_profiles")
        .select("*")
        .eq("fan_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
