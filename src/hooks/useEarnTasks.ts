import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useEarnTasks = () =>
  useQuery({
    queryKey: ["earn_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("earn_tasks")
        .select("*")
        .eq("is_active", true)
        .order("coins_reward", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useMyCompletions = (userId?: string) =>
  useQuery({
    queryKey: ["task_completions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("task_completions")
        .select("task_id")
        .eq("fan_id", userId);
      if (error) throw error;
      return data.map((c) => c.task_id);
    },
    enabled: !!userId,
  });

export const useCompleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      fanId,
      coinsReward,
      responseData,
    }: {
      taskId: string;
      fanId: string;
      coinsReward: number;
      responseData?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from("task_completions")
        .insert({ task_id: taskId, fan_id: fanId, coins_awarded: coinsReward, response_data: responseData })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("reward_transactions").insert({
        fan_id: fanId,
        amount: coinsReward,
        type: "earn",
        source: "task",
        description: "Task completion reward",
        reference_id: taskId,
      });

      return data;
    },
    onSuccess: (_, vars) => {
      toast.success(`+${vars.coinsReward} FC earned!`);
      qc.invalidateQueries({ queryKey: ["task_completions", vars.fanId] });
      qc.invalidateQueries({ queryKey: ["fan_passport", vars.fanId] });
      qc.invalidateQueries({ queryKey: ["fan_rewards", vars.fanId] });
      qc.invalidateQueries({ queryKey: ["reward_transactions", vars.fanId] });
    },
    onError: (error: any) => {
      if (error?.code === "23505") {
        toast.error("Already completed this task");
      } else {
        toast.error("Failed to complete task");
      }
    },
  });
};
