import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useMyRewards = (userId?: string) =>
  useQuery({
    queryKey: ["fan_rewards", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("fan_rewards")
        .select("*")
        .eq("fan_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

export const useMyTransactions = (userId?: string) =>
  useQuery({
    queryKey: ["reward_transactions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("reward_transactions")
        .select("*")
        .eq("fan_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

export const useActivePrizes = () =>
  useQuery({
    queryKey: ["prizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prizes")
        .select("*")
        .eq("is_active", true)
        .order("coins_cost");
      if (error) throw error;
      return data;
    },
  });

export const useMyPrizeClaims = (userId?: string) =>
  useQuery({
    queryKey: ["prize_claims", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("prize_claims")
        .select("*, prizes(*)")
        .eq("fan_id", userId)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

export const useClaimPrize = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ prizeId, fanId, coinsCost }: { prizeId: string; fanId: string; coinsCost: number }) => {
      const { data: rewards } = await supabase
        .from("fan_rewards")
        .select("current_balance")
        .eq("fan_id", fanId)
        .single();

      if (!rewards || rewards.current_balance < coinsCost) {
        throw new Error("Insufficient FanCoins");
      }

      const { data, error } = await supabase
        .from("prize_claims")
        .insert({ prize_id: prizeId, fan_id: fanId, coins_spent: coinsCost })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("reward_transactions").insert({
        fan_id: fanId,
        amount: coinsCost,
        type: "spend",
        source: "prize_claim",
        description: "Prize claimed",
        reference_id: prizeId,
      });

      return data;
    },
    onSuccess: (_, vars) => {
      toast.success("Prize claimed!");
      qc.invalidateQueries({ queryKey: ["fan_rewards", vars.fanId] });
      qc.invalidateQueries({ queryKey: ["prize_claims", vars.fanId] });
      qc.invalidateQueries({ queryKey: ["fan_passport", vars.fanId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
