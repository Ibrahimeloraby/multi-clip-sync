import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// VerifyRules — full replacement below
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmptyState from "@/components/common/EmptyState";

function ruleDescription(rule: any, lang: "en" | "ar"): string {
  if (rule.description_text) return rule.description_text;
  switch (rule.rule_type) {
    case "earn": return `Earn ${rule.earn_rate} pts per AED 1`;
    case "cashback": return `${rule.cashback_pct}% cashback`;
    case "discount": return `${rule.discount_pct}% discount`;
    case "bogo": return "Buy 1 Get 1 Free";
    case "multiplier": return `${rule.multiplier}× points`;
    default: return "Special offer";
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-500",
  provisional: "bg-yellow-100 text-yellow-700",
  verified: "bg-blue-100 text-blue-700",
  trusted: "bg-green-100 text-green-700",
};

export default function VerifyRules() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, isRTL } = useAppContext();
  const lang = language as "en" | "ar";
  const qc = useQueryClient();

  const [confirmModal, setConfirmModal] = useState<{ rule: any; action: "confirm" | "dispute" } | null>(null);
  const [notes, setNotes] = useState("");

  // Fetch user's enrolled program IDs
  const { data: enrolledProgramIds } = useQuery({
    queryKey: ["enrolled-program-ids", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("program_id")
        .eq("user_id", user!.id);
      return (data ?? []).map((up: any) => up.program_id);
    },
    enabled: !!user,
  });

  // Fetch rules needing verification
  const { data: rules, isLoading } = useQuery({
    queryKey: ["verify-queue", user?.id, enrolledProgramIds],
    queryFn: async () => {
      if (!enrolledProgramIds?.length) return [];

      // Rules pending/provisional for enrolled programs
      const { data: candidateRules } = await supabase
        .from("merchant_rules")
        .select("*, program:programs(display_name_en, display_name_ar, category, logo_url), merchant:merchants(display_name_en, display_name_ar)")
        .in("program_id", enrolledProgramIds)
        .in("status", ["pending", "provisional"])
        .neq("submitted_by_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!candidateRules?.length) return [];

      // Exclude rules user already confirmed/disputed
      const { data: myActions } = await supabase
        .from("rule_confirmations")
        .select("rule_id")
        .eq("user_id", user!.id)
        .in("rule_id", candidateRules.map((r: any) => r.id));

      const actioned = new Set((myActions ?? []).map((a: any) => a.rule_id));
      return candidateRules.filter((r: any) => !actioned.has(r.id));
    },
    enabled: !!user && !!enrolledProgramIds,
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ ruleId, action }: { ruleId: string; action: "confirm" | "dispute" }) => {
      const { error } = await supabase.from("rule_confirmations").insert({
        rule_id: ruleId,
        user_id: user!.id,
        action,
        notes: notes || null,
      });
      if (error) throw error;

      // Call compute-confidence edge function
      await supabase.functions.invoke("compute-confidence", { body: { rule_id: ruleId } }).catch(() => {});
    },
    onSuccess: (_, { action }) => {
      toast.success(action === "confirm"
        ? "Thanks for confirming! +2 reputation earned."
        : "Dispute noted. Admins will review.");
      setConfirmModal(null);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["verify-queue"] });
    },
    onError: (e: any) => {
      if (e.message?.includes("unique")) {
        toast.error("You've already voted on this rule.");
      } else {
        toast.error(e.message);
      }
    },
  });

  const daysAgo = (dateStr: string) => {
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          {isRTL ? <XCircle className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <h1 className="font-semibold text-slate-800">
          {lang === "ar" ? "التحقق من القواعد" : "Verify Rules"}
        </h1>
        {rules && <Badge variant="outline">{rules.length} pending</Badge>}
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {isLoading && (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-full mt-3" />
            </div>
          ))
        )}

        {!isLoading && rules?.length === 0 && (
          <EmptyState
            title="Nothing to verify right now"
            description="Check back soon — new community rules will appear here."
          />
        )}

        {rules?.map((rule: any) => (
          <div key={rule.id} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                    {rule.program?.display_name_en?.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    {lang === "ar" ? rule.program?.display_name_ar : rule.program?.display_name_en}
                  </span>
                  <span className="text-xs text-slate-400">at</span>
                  <span className="text-xs font-medium text-slate-600">
                    {lang === "ar" ? rule.merchant?.display_name_ar : rule.merchant?.display_name_en}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800">{ruleDescription(rule, lang)}</p>
              </div>
              <Badge className={`text-xs ${STATUS_COLORS[rule.status] ?? STATUS_COLORS.pending}`}>
                {rule.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Submitted {daysAgo(rule.created_at)}</span>
              <span>·</span>
              <span>✓ {rule.confirmations} confirmed</span>
              {rule.disputes > 0 && <><span>·</span><span className="text-red-500">✗ {rule.disputes} disputed</span></>}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setConfirmModal({ rule, action: "confirm" })}
              >
                <CheckCircle className="w-4 h-4 me-1" />
                {lang === "ar" ? "تأكيد" : "Confirm"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => setConfirmModal({ rule, action: "dispute" })}
              >
                <XCircle className="w-4 h-4 me-1" />
                {lang === "ar" ? "اعتراض" : "Dispute"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmModal?.action === "confirm" ? "Confirm this rule?" : "Dispute this rule?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {confirmModal && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                {ruleDescription(confirmModal.rule, lang)}
              </p>
            )}
            <div>
              <p className="text-sm text-slate-500 mb-1">Notes (optional)</p>
              <Textarea
                placeholder={confirmModal?.action === "confirm"
                  ? "Share your experience with this offer..."
                  : "Why are you disputing this rule?"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            {confirmModal?.action === "confirm" && (
              <p className="text-xs text-green-600 bg-green-50 rounded p-2">
                +2 reputation points for confirming
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModal(null)}>Cancel</Button>
            <Button
              onClick={() => confirmMutation.mutate({ ruleId: confirmModal!.rule.id, action: confirmModal!.action })}
              disabled={confirmMutation.isPending}
              className={confirmModal?.action === "confirm" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {confirmMutation.isPending ? "Saving..." : confirmModal?.action === "confirm" ? "Confirm" : "Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
