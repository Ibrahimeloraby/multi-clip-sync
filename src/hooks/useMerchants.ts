import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Merchant, MerchantRule, Program } from "@/types";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const merchantKeys = {
  all: ["merchants"] as const,
  list: (search?: string) => [...merchantKeys.all, "list", search ?? ""] as const,
  detail: (id: string) => [...merchantKeys.all, "detail", id] as const,
  recent: (userId: string) => [...merchantKeys.all, "recent", userId] as const,
};

// ─── useMerchants: paginated + searchable list ────────────────────────────────

const PAGE_SIZE = 30;

export function useMerchants(search?: string) {
  return useQuery({
    queryKey: merchantKeys.list(search),
    queryFn: async (): Promise<Merchant[]> => {
      let query = supabase
        .from("merchants")
        .select("*")
        .order("display_name_en", { ascending: true })
        .limit(PAGE_SIZE);

      if (search && search.trim().length > 0) {
        const term = `%${search.trim()}%`;
        query = query.or(
          `display_name_en.ilike.${term},display_name_ar.ilike.${term}`
        );
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as Merchant[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── useMerchant: single merchant with its rules ─────────────────────────────

export interface MerchantWithRules extends Merchant {
  rules: (MerchantRule & { program: Program })[];
}

export function useMerchant(id: string) {
  return useQuery({
    queryKey: merchantKeys.detail(id),
    queryFn: async (): Promise<MerchantWithRules | null> => {
      if (!id) return null;

      // Fetch merchant
      const { data: merchant, error: mErr } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (mErr) throw new Error(mErr.message);
      if (!merchant) return null;

      // Fetch rules for this merchant (only non-expired, ordered by confidence)
      const { data: rules, error: rErr } = await supabase
        .from("merchant_rules")
        .select(
          `
          *,
          program:programs(*)
        `
        )
        .eq("merchant_id", id)
        .neq("status", "expired")
        .order("confidence_score", { ascending: false });

      if (rErr) throw new Error(rErr.message);

      return {
        ...(merchant as Merchant),
        rules: (rules ?? []) as (MerchantRule & { program: Program })[],
      };
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── useRecentMerchants: user's 5 most recently interacted merchants ──────────

export function useRecentMerchants() {
  const { user } = useAuth();

  return useQuery({
    queryKey: merchantKeys.recent(user?.id ?? "anon"),
    queryFn: async (): Promise<Merchant[]> => {
      if (!user) return [];

      // Pull from transactions — most recent distinct merchants
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          merchant_id,
          merchant:merchants(*)
        `
        )
        .eq("user_id", user.id)
        .not("merchant_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50); // fetch more than needed to dedup

      if (error) throw new Error(error.message);

      // Deduplicate by merchant_id, keep first 5
      const seen = new Set<string>();
      const merchants: Merchant[] = [];
      for (const row of data ?? []) {
        if (!row.merchant_id || seen.has(row.merchant_id)) continue;
        seen.add(row.merchant_id);
        if (row.merchant) {
          merchants.push(row.merchant as unknown as Merchant);
        }
        if (merchants.length >= 5) break;
      }

      return merchants;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
}
