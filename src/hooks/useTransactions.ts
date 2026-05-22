import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Transaction } from "@/types";
import type { InsertTables } from "@/lib/supabase";
import { programKeys } from "@/hooks/usePrograms";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const transactionKeys = {
  all: ["transactions"] as const,
  list: (userId: string, limit: number) =>
    ["transactions", "list", userId, limit] as const,
};

// ─── useTransactions ──────────────────────────────────────────────────────────

export function useTransactions(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: transactionKeys.list(user?.id ?? "anon", limit),
    queryFn: async (): Promise<(Transaction & { merchant: { display_name_en: string } | null })[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          merchant:merchants(display_name_en)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return (data ?? []) as (Transaction & { merchant: { display_name_en: string } | null })[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── useLogTransaction ────────────────────────────────────────────────────────

type TransactionInsert = InsertTables<"transactions">;

export function useLogTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<TransactionInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          ...input,
          user_id: user.id,
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success("Transaction logged!");

      if (user) {
        // Invalidate transaction list
        queryClient.invalidateQueries({
          queryKey: transactionKeys.list(user.id, 20),
        });
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });

        // Invalidate user programs so balances refresh
        queryClient.invalidateQueries({
          queryKey: programKeys.userPrograms(user.id),
        });
      }
    },
    onError: (err: Error) => {
      toast.error(`Failed to log transaction: ${err.message}`);
    },
  });
}
