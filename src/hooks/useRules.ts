import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { MerchantRule, Program, RuleSubmission } from "@/types";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const ruleKeys = {
  all: ["rules"] as const,
  byMerchant: (merchantId: string) => ["rules", "merchant", merchantId] as const,
  verifyQueue: (userId: string) => ["rules", "verify-queue", userId] as const,
};

// ─── useMerchantRules ─────────────────────────────────────────────────────────

export function useMerchantRules(merchantId: string) {
  return useQuery({
    queryKey: ruleKeys.byMerchant(merchantId),
    queryFn: async (): Promise<(MerchantRule & { program: Program })[]> => {
      if (!merchantId) return [];

      const { data, error } = await supabase
        .from("merchant_rules")
        .select(
          `
          *,
          program:programs(*)
        `
        )
        .eq("merchant_id", merchantId)
        .neq("status", "expired")
        .order("confidence_score", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as (MerchantRule & { program: Program })[];
    },
    enabled: !!merchantId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── useSubmitRule ────────────────────────────────────────────────────────────

interface SubmitRuleInput extends RuleSubmission {
  // all fields from RuleSubmission
}

export function useSubmitRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SubmitRuleInput) => {
      if (!user) throw new Error("Not authenticated");

      // Insert the rule with status='pending'
      const { data: rule, error: insertError } = await supabase
        .from("merchant_rules")
        .insert({
          merchant_id: input.merchantId,
          program_id: input.programId,
          rule_type: input.ruleType,
          earn_rate: input.earnRate ?? null,
          multiplier: input.multiplier ?? null,
          discount_pct: input.discountPct ?? null,
          cashback_pct: input.cashbackPct ?? null,
          min_spend: input.minSpend ?? 0,
          max_spend: input.maxSpend ?? null,
          days_of_week: input.daysOfWeek ?? [],
          start_date: input.startDate ?? null,
          end_date: input.endDate ?? null,
          description_text: input.descriptionText ?? null,
          evidence_attachments: input.evidenceUrls ?? [],
          source: "community",
          status: "pending",
          submitted_by_user_id: user.id,
          confidence_score: 0,
        })
        .select("*")
        .single();

      if (insertError) throw new Error(insertError.message);

      // Call the validate-rule edge function for a sanity check (best-effort)
      try {
        await supabase.functions.invoke("validate-rule", {
          body: { ruleId: rule.id },
        });
      } catch (fnError) {
        // Non-fatal: log but don't throw
        console.warn("[useSubmitRule] validate-rule function failed:", fnError);
      }

      return rule;
    },
    onSuccess: (rule) => {
      toast.success("Rule submitted! It will be reviewed by the community.");
      queryClient.invalidateQueries({ queryKey: ruleKeys.byMerchant(rule.merchant_id) });
      queryClient.invalidateQueries({ queryKey: ruleKeys.all });
    },
    onError: (err: Error) => {
      toast.error(`Failed to submit rule: ${err.message}`);
    },
  });
}

// ─── useConfirmRule ───────────────────────────────────────────────────────────

interface ConfirmRuleInput {
  ruleId: string;
  action: "confirm" | "dispute";
  evidenceUrl?: string;
  notes?: string;
}

export function useConfirmRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ConfirmRuleInput) => {
      if (!user) throw new Error("Not authenticated");

      // Insert confirmation record
      const { data: confirmation, error: insertError } = await supabase
        .from("rule_confirmations")
        .insert({
          rule_id: input.ruleId,
          user_id: user.id,
          action: input.action,
          evidence_url: input.evidenceUrl ?? null,
          notes: input.notes ?? null,
        })
        .select("*")
        .single();

      if (insertError) {
        // Handle unique constraint violation (already confirmed/disputed within 90 days)
        if (insertError.code === "23505") {
          throw new Error("You have already confirmed or disputed this rule recently.");
        }
        throw new Error(insertError.message);
      }

      // Recompute confidence score via edge function (best-effort)
      try {
        await supabase.functions.invoke("compute-confidence", {
          body: { ruleId: input.ruleId },
        });
      } catch (fnError) {
        console.warn("[useConfirmRule] compute-confidence function failed:", fnError);
      }

      return confirmation;
    },
    onSuccess: (_data, variables) => {
      const actionLabel = variables.action === "confirm" ? "confirmed" : "disputed";
      toast.success(`Rule ${actionLabel}. Thank you for your contribution!`);
      queryClient.invalidateQueries({ queryKey: ruleKeys.all });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ruleKeys.verifyQueue(user.id) });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── useVerifyQueue ───────────────────────────────────────────────────────────

export function useVerifyQueue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ruleKeys.verifyQueue(user?.id ?? "anon"),
    queryFn: async (): Promise<(MerchantRule & { program: Program })[]> => {
      if (!user) return [];

      // Get the user's enrolled program IDs first
      const { data: userPrograms, error: upError } = await supabase
        .from("user_programs")
        .select("program_id")
        .eq("user_id", user.id);

      if (upError) throw new Error(upError.message);

      const enrolledProgramIds = (userPrograms ?? []).map((up) => up.program_id);

      // Build the rules query
      let query = supabase
        .from("merchant_rules")
        .select(
          `
          *,
          program:programs(*)
        `
        )
        .in("status", ["pending", "provisional"])
        .order("created_at", { ascending: false })
        .limit(20);

      // Filter to enrolled programs if user has any
      if (enrolledProgramIds.length > 0) {
        query = query.in("program_id", enrolledProgramIds);
      }

      const { data: rules, error: rulesError } = await query;
      if (rulesError) throw new Error(rulesError.message);

      if (!rules || rules.length === 0) return [];

      // Exclude rules the user has already actioned
      const ruleIds = rules.map((r) => r.id);

      const { data: existing, error: existingError } = await supabase
        .from("rule_confirmations")
        .select("rule_id")
        .eq("user_id", user.id)
        .in("rule_id", ruleIds);

      if (existingError) throw new Error(existingError.message);

      const actionedIds = new Set((existing ?? []).map((e) => e.rule_id));

      return (rules as (MerchantRule & { program: Program })[]).filter(
        (r) => !actionedIds.has(r.id)
      );
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
}
