import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Program, UserProgram } from "@/types";
import { toast } from "sonner";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const programKeys = {
  all: ["programs"] as const,
  lists: () => [...programKeys.all, "list"] as const,
  detail: (id: string) => [...programKeys.all, "detail", id] as const,
  userPrograms: (userId: string) => ["user-programs", userId] as const,
};

// ─── usePrograms: all programs master list ────────────────────────────────────

export function usePrograms() {
  return useQuery({
    queryKey: programKeys.lists(),
    queryFn: async (): Promise<Program[]> => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("display_name_en", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as Program[];
    },
    staleTime: 1000 * 60 * 30, // programs list rarely changes
  });
}

// ─── useUserPrograms: current user's enrolled programs ───────────────────────

export function useUserPrograms() {
  const { user } = useAuth();

  return useQuery({
    queryKey: programKeys.userPrograms(user?.id ?? "anon"),
    queryFn: async (): Promise<(UserProgram & { program: Program })[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_programs")
        .select(
          `
          *,
          program:programs(*)
        `
        )
        .eq("user_id", user.id)
        .order("last_updated_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as (UserProgram & { program: Program })[];
    },
    enabled: !!user,
  });
}

// ─── useUpdateBalance: mutation to update balance ────────────────────────────

export function useUpdateBalance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userProgramId,
      newBalance,
    }: {
      userProgramId: string;
      newBalance: number;
    }) => {
      const { data, error } = await supabase
        .from("user_programs")
        .update({
          current_balance: newBalance,
          last_updated_at: new Date().toISOString(),
          last_confirmed_at: new Date().toISOString(),
        })
        .eq("id", userProgramId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: programKeys.userPrograms(user.id) });
      }
      toast.success("Balance updated");
    },
    onError: (err: Error) => {
      toast.error(`Failed to update balance: ${err.message}`);
    },
  });
}

// ─── useEnrollProgram: enroll in a program ────────────────────────────────────

export function useEnrollProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      programId,
      trackingMethod = "manual",
    }: {
      programId: string;
      trackingMethod?: "manual" | "email_forward" | "screenshot";
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_programs")
        .upsert(
          {
            user_id: user.id,
            program_id: programId,
            current_balance: 0,
            tracking_method: trackingMethod,
          },
          { onConflict: "user_id,program_id" }
        )
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: programKeys.userPrograms(user.id) });
      }
    },
    onError: (err: Error) => {
      toast.error(`Failed to enroll: ${err.message}`);
    },
  });
}
