import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { ExpiringAlert, UserProgram, Program } from "@/types";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const expiringAlertKeys = {
  all: ["expiring-alerts"] as const,
  list: (userId: string) => ["expiring-alerts", "list", userId] as const,
  totalValue: (userId: string) => ["expiring-alerts", "total-value", userId] as const,
};

// ─── useExpiringAlerts ────────────────────────────────────────────────────────

export function useExpiringAlerts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: expiringAlertKeys.list(user?.id ?? "anon"),
    queryFn: async (): Promise<
      (ExpiringAlert & {
        user_program: UserProgram & { program: Program };
      })[]
    > => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("expiring_alerts")
        .select(
          `
          *,
          user_program:user_programs(
            *,
            program:programs(*)
          )
        `
        )
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as (ExpiringAlert & {
        user_program: UserProgram & { program: Program };
      })[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── useTotalExpiringValue ────────────────────────────────────────────────────

export function useTotalExpiringValue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: expiringAlertKeys.totalValue(user?.id ?? "anon"),
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from("expiring_alerts")
        .select("estimated_value_aed")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .lte("expires_at", thirtyDaysFromNow.toISOString());

      if (error) throw new Error(error.message);

      const total = (data ?? []).reduce((sum, row) => {
        return sum + (row.estimated_value_aed ?? 0);
      }, 0);

      return Math.round(total * 100) / 100;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}
