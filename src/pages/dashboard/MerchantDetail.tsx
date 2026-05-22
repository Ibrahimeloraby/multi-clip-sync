import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ConfidenceBadge from "@/components/common/ConfidenceBadge";
import EmptyState from "@/components/common/EmptyState";
import ProgramLogo from "@/components/common/ProgramLogo";
import {
  ArrowLeft,
  CheckCircle,
  Plus,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RuleStatus = "pending" | "provisional" | "verified" | "trusted" | "disputed" | "expired";
type RuleType = "earn" | "cashback" | "discount" | "bogo" | "multiplier";

interface Program {
  id: string;
  slug: string;
  display_name_en: string;
  display_name_ar: string;
  logo_url: string | null;
  category: string;
  default_earn_rate_aed: number;
  default_redemption_value_aed: number;
}

interface MerchantRule {
  id: string;
  merchant_id: string;
  program_id: string;
  rule_type: RuleType;
  earn_rate: number | null;
  multiplier: number | null;
  discount_pct: number | null;
  cashback_pct: number | null;
  confidence_score: number;
  status: RuleStatus;
  source: string;
  confirmations: number;
  disputes: number;
  description_text: string | null;
  created_at: string;
  program?: Program;
}

interface MerchantRow {
  id: string;
  display_name_en: string;
  display_name_ar: string;
  category: string[];
  logo_url: string | null;
  is_verified: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ruleDescription(rule: MerchantRule, lang: "en" | "ar"): string {
  if (rule.description_text) return rule.description_text;
  switch (rule.rule_type) {
    case "earn":
      return lang === "ar"
        ? `اكسب ${rule.earn_rate} نقطة لكل AED 1`
        : `Earn ${rule.earn_rate} pts per AED 1`;
    case "cashback":
      return lang === "ar"
        ? `استرداد نقدي ${rule.cashback_pct}%`
        : `${rule.cashback_pct}% cashback`;
    case "discount":
      return lang === "ar" ? `خصم ${rule.discount_pct}%` : `${rule.discount_pct}% discount`;
    case "bogo":
      return lang === "ar" ? "عرض 1+1" : "Buy 1 Get 1 Free";
    case "multiplier":
      return lang === "ar" ? `${rule.multiplier}× النقاط` : `${rule.multiplier}× points`;
    default:
      return rule.description_text ?? "Special offer";
  }
}

const CATEGORY_BG: Record<string, string> = {
  Groceries: "bg-green-500",
  "F&B": "bg-orange-500",
  Fuel: "bg-yellow-500",
  Entertainment: "bg-purple-500",
  Pharmacy: "bg-red-500",
  Fashion: "bg-pink-500",
  Online: "bg-blue-500",
  Hotels: "bg-indigo-500",
  Fitness: "bg-teal-500",
  General: "bg-slate-400",
};

function MerchantAvatar({ merchant }: { merchant: MerchantRow }) {
  const initials = merchant.display_name_en.slice(0, 2).toUpperCase();
  const primaryCategory = merchant.category[0] ?? "General";
  const bg = CATEGORY_BG[primaryCategory] ?? "bg-slate-400";

  if (merchant.logo_url) {
    return (
      <img
        src={merchant.logo_url}
        alt={merchant.display_name_en}
        className="w-20 h-20 rounded-2xl object-cover border border-slate-200"
      />
    );
  }

  return (
    <div
      className={cn(
        "w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-2xl text-white",
        bg
      )}
    >
      {initials}
    </div>
  );
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  language,
  userId,
  alreadyConfirmed,
  onConfirm,
  onDispute,
}: {
  rule: MerchantRule;
  language: "en" | "ar";
  userId: string | undefined;
  alreadyConfirmed: boolean;
  onConfirm: (ruleId: string) => void;
  onDispute: (ruleId: string) => void;
}) {
  const daysAgo = Math.floor(
    (Date.now() - new Date(rule.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="border border-slate-100 rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 leading-snug flex-1">
          {ruleDescription(rule, language)}
        </p>
        <ConfidenceBadge score={rule.confidence_score} status={rule.status} showScore />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
          {rule.source}
        </Badge>
        <span className="text-xs text-slate-400">
          {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
        </span>
        <span className="text-xs text-green-600 flex items-center gap-0.5">
          <ThumbsUp className="w-3 h-3" />
          {rule.confirmations}
        </span>
        {rule.disputes > 0 && (
          <span className="text-xs text-red-500 flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" />
            {rule.disputes}
          </span>
        )}
      </div>

      {userId && !alreadyConfirmed && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 flex-1 border-green-200 text-green-700 hover:bg-green-50"
            onClick={() => onConfirm(rule.id)}
          >
            <ThumbsUp className="w-3 h-3 mr-1" />
            Confirm
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onDispute(rule.id)}
          >
            <ThumbsDown className="w-3 h-3 mr-1" />
            Dispute
          </Button>
        </div>
      )}
      {alreadyConfirmed && (
        <p className="text-xs text-slate-400 italic">You've already responded to this rule</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MerchantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useAppContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch merchant
  const { data: merchant, isLoading: loadingMerchant } = useQuery({
    queryKey: ["merchant", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("id, display_name_en, display_name_ar, category, logo_url, is_verified")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as MerchantRow;
    },
    enabled: !!id,
  });

  // Fetch rules with program data
  const { data: rules, isLoading: loadingRules } = useQuery({
    queryKey: ["merchant-rules", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_rules")
        .select(
          `id, merchant_id, program_id, rule_type, earn_rate, multiplier,
           discount_pct, cashback_pct, confidence_score, status, source,
           confirmations, disputes, description_text, created_at,
           program:programs(id, slug, display_name_en, display_name_ar, logo_url, category, default_earn_rate_aed, default_redemption_value_aed)`
        )
        .eq("merchant_id", id!)
        .neq("status", "expired")
        .order("confidence_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MerchantRule[];
    },
    enabled: !!id,
  });

  // Fetch user's enrolled programs
  const { data: enrolledProgramIds } = useQuery({
    queryKey: ["enrolled-program-ids", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("program_id")
        .eq("user_id", user!.id);
      return (data ?? []).map((r) => r.program_id);
    },
    enabled: !!user,
  });

  // Fetch user's existing confirmations for these rules
  const ruleIds = (rules ?? []).map((r) => r.id);
  const { data: myConfirmations } = useQuery({
    queryKey: ["my-confirmations", ruleIds, user?.id],
    queryFn: async () => {
      if (ruleIds.length === 0 || !user) return new Set<string>();
      const { data } = await supabase
        .from("rule_confirmations")
        .select("rule_id")
        .in("rule_id", ruleIds)
        .eq("user_id", user.id);
      return new Set((data ?? []).map((r) => r.rule_id));
    },
    enabled: !!user && ruleIds.length > 0,
  });

  // Confirm / Dispute mutation
  const confirmMutation = useMutation({
    mutationFn: async ({ ruleId, action }: { ruleId: string; action: "confirm" | "dispute" }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("rule_confirmations").insert({
        rule_id: ruleId,
        user_id: user.id,
        action,
      });
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      toast.success(
        action === "confirm"
          ? "Thanks for confirming! +2 reputation earned"
          : "Dispute noted. Thanks for the feedback!"
      );
      queryClient.invalidateQueries({ queryKey: ["my-confirmations", ruleIds, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["merchant-rules", id] });
    },
    onError: () => toast.error("Failed to submit. Please try again."),
  });

  const filteredRules =
    activeTab === "my" && enrolledProgramIds
      ? (rules ?? []).filter((r) => enrolledProgramIds.includes(r.program_id))
      : (rules ?? []);

  // Group rules by program
  const grouped = filteredRules.reduce<Record<string, MerchantRule[]>>((acc, rule) => {
    const key = rule.program_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rule);
    return acc;
  }, {});

  const name =
    merchant
      ? language === "ar"
        ? merchant.display_name_ar
        : merchant.display_name_en
      : "";

  if (loadingMerchant) {
    return (
      <div className="px-4 py-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-4">
          <Skeleton className="w-20 h-20 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="px-4 py-8 text-center text-slate-500">Merchant not found.</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-slate-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-slate-900 truncate">{name}</h1>
      </div>

      {/* Merchant hero */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
        <MerchantAvatar merchant={merchant} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-lg font-bold text-slate-900">{merchant.display_name_en}</span>
            {merchant.is_verified && (
              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          {merchant.display_name_ar && (
            <p className="text-sm text-slate-500 mt-0.5" dir="rtl">
              {merchant.display_name_ar}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {merchant.category.map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="text-xs bg-slate-100 text-slate-600"
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => navigate(`/dashboard/rules/add?merchantId=${id}`)}
          className="flex-shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Rule
        </Button>
      </div>

      {/* Rules section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            All Programs
          </TabsTrigger>
          <TabsTrigger value="my" className="flex-1">
            My Programs
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-3 space-y-4">
          {loadingRules ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <EmptyState
              icon={<Plus />}
              title="No rules yet for this merchant"
              description="Be the first to add one!"
              action={{
                label: "Add Rule",
                onClick: () => navigate(`/dashboard/rules/add?merchantId=${id}`),
              }}
            />
          ) : (
            Object.entries(grouped).map(([programId, programRules]) => {
              const prog = programRules[0]?.program;
              if (!prog) return null;
              const progName =
                language === "ar" ? prog.display_name_ar : prog.display_name_en;

              return (
                <div key={programId} className="space-y-2">
                  {/* Program header */}
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <ProgramLogo program={prog} size="sm" />
                    <span className="text-sm font-semibold text-slate-700">{progName}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {programRules.length} rule{programRules.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {/* Rules */}
                  <div className="space-y-2 pl-1">
                    {programRules.map((rule) => (
                      <RuleCard
                        key={rule.id}
                        rule={rule}
                        language={language}
                        userId={user?.id}
                        alreadyConfirmed={myConfirmations?.has(rule.id) ?? false}
                        onConfirm={(ruleId) =>
                          confirmMutation.mutate({ ruleId, action: "confirm" })
                        }
                        onDispute={(ruleId) =>
                          confirmMutation.mutate({ ruleId, action: "dispute" })
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
