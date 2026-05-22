import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";
import { Clock, CheckCircle2, BellRing, X, Sparkles } from "lucide-react";

const FILTER_TABS = [
  { id: "all", labelEn: "All", labelAr: "الكل", days: null },
  { id: "30", labelEn: "30 days", labelAr: "30 يوماً", days: 30 },
  { id: "14", labelEn: "14 days", labelAr: "14 يوماً", days: 14 },
  { id: "7", labelEn: "7 days", labelAr: "7 أيام", days: 7 },
];

const AI_SUGGESTIONS: Record<string, { en: string; ar: string }> = {
  airline: {
    en: "Use for flight discount or upgrade",
    ar: "استخدمها لخصم على الرحلة أو الترقية",
  },
  hotel: {
    en: "Redeem for free night or breakfast",
    ar: "استبدلها بليلة مجانية أو إفطار",
  },
  retail: {
    en: "Spend at any partner merchant",
    ar: "أنفقها في أي تاجر شريك",
  },
  banking: {
    en: "Redeem for cashback or gift vouchers",
    ar: "استبدلها باسترداد نقدي أو بطاقات هدية",
  },
  telecom: {
    en: "Redeem for data bundles or bill credit",
    ar: "استبدلها بحزم بيانات أو رصيد فاتورة",
  },
  fuel: {
    en: "Use at the pump for fuel discounts",
    ar: "استخدمها عند الضخ للحصول على خصومات الوقود",
  },
  default: {
    en: "Use points before they expire to maximize value",
    ar: "استخدم النقاط قبل انتهاء صلاحيتها لزيادة قيمتها",
  },
};

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function expiryBadgeColor(days: number): string {
  if (days <= 7) return "bg-red-100 text-red-700";
  if (days <= 14) return "bg-orange-100 text-orange-700";
  return "bg-amber-100 text-amber-700";
}

function expiryTextColor(days: number): string {
  if (days <= 7) return "text-red-600";
  if (days <= 14) return "text-orange-500";
  return "text-amber-600";
}

export default function ExpiringCenter() {
  const { user } = useAuth();
  const { language, isRTL } = useAppContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["expiring-alerts-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("expiring_alerts")
        .select(`
          *,
          user_program:user_programs(
            *,
            program:programs(*)
          )
        `)
        .eq("user_id", user!.id)
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true });
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("expiring_alerts")
        .delete()
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expiring-alerts-full"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-alerts-home"] });
      toast.success("Alert dismissed");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to dismiss"),
  });

  const remindMutation = useMutation({
    mutationFn: async (alertId: string) => {
      // In a real app this would schedule a push notification
      await supabase
        .from("expiring_alerts")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", alertId);
    },
    onSuccess: () => toast.success("Reminder set!"),
    onError: (e: any) => toast.error(e.message ?? "Failed to set reminder"),
  });

  const filteredAlerts = (alerts ?? []).filter((alert: any) => {
    if (activeFilter === "all") return true;
    const days = parseInt(activeFilter);
    return daysUntil(alert.expires_at) <= days;
  });

  const totalAtRisk = filteredAlerts.reduce(
    (sum: number, a: any) => sum + (a.estimated_value_aed ?? 0),
    0
  );
  const uniquePrograms = new Set(
    filteredAlerts.map((a: any) => a.user_program?.program_id)
  ).size;

  const t = {
    en: {
      title: "Expiring Points",
      atRisk: (aed: number, count: number) =>
        `AED ${aed.toFixed(2)} at risk across ${count} program${count !== 1 ? "s" : ""}`,
      expiresIn: (d: number) => `Expires in ${d} day${d !== 1 ? "s" : ""}`,
      remind: "Remind me",
      markRedeemed: "Mark redeemed",
      dismiss: "Dismiss",
      empty: "No expiring points",
      emptyDesc: "You have no points expiring soon",
      optimizeTitle: "Want an AI-powered redemption plan?",
      optimizeDesc:
        "Let LoyaltyOne analyze your portfolio and suggest the best way to use your expiring points.",
      optimizeCTA: "Optimize Now",
      aiSuggestion: "Suggestion",
    },
    ar: {
      title: "النقاط المنتهية",
      atRisk: (aed: number, count: number) =>
        `AED ${aed.toFixed(2)} في خطر عبر ${count} ${count === 1 ? "برنامج" : "برامج"}`,
      expiresIn: (d: number) => `تنتهي خلال ${d} ${d === 1 ? "يوم" : "أيام"}`,
      remind: "تذكيرني",
      markRedeemed: "تحديد كمستبدل",
      dismiss: "رفض",
      empty: "لا توجد نقاط منتهية",
      emptyDesc: "ليس لديك نقاط تنتهي قريباً",
      optimizeTitle: "هل تريد خطة استبدال مدعومة بالذكاء الاصطناعي؟",
      optimizeDesc:
        "دع LoyaltyOne يحلل محفظتك ويقترح أفضل طريقة لاستخدام نقاطك المنتهية.",
      optimizeCTA: "تحسين الآن",
      aiSuggestion: "اقتراح",
    },
  };

  const copy = t[language];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900">{copy.title}</h1>
        {!isLoading && filteredAlerts.length > 0 && (
          <p className="text-sm text-slate-500 mt-0.5">
            {copy.atRisk(totalAtRisk, uniquePrograms)}
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b border-slate-100">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === tab.id
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {language === "ar" ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<Clock />}
            title={copy.empty}
            description={copy.emptyDesc}
          />
        ) : (
          filteredAlerts.map((alert: any) => {
            const up = alert.user_program;
            const prog = up?.program;
            const name = prog
              ? isRTL
                ? prog.display_name_ar
                : prog.display_name_en
              : "Unknown";
            const category = prog?.category ?? "default";
            const suggestion =
              AI_SUGGESTIONS[category] ?? AI_SUGGESTIONS.default;
            const suggestionText =
              language === "ar" ? suggestion.ar : suggestion.en;
            const days = daysUntil(alert.expires_at);
            const aedValue = alert.estimated_value_aed ?? 0;

            return (
              <div
                key={alert.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
              >
                {/* Top: program + countdown */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {(prog?.display_name_en ?? "??")
                        .split(" ")
                        .slice(0, 2)
                        .map((w: string) => w[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[160px]">
                        {name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {alert.amount.toLocaleString()} pts &middot; AED{" "}
                        {aedValue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${expiryBadgeColor(days)}`}
                  >
                    {copy.expiresIn(days)}
                  </span>
                </div>

                {/* AI suggestion */}
                <div className="bg-blue-50 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">{copy.aiSuggestion}: </span>
                    {suggestionText}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => remindMutation.mutate(alert.id)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    {copy.remind}
                  </button>
                  <button
                    onClick={() => {
                      toast.success("Marked as redeemed");
                      dismissMutation.mutate(alert.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {copy.markRedeemed}
                  </button>
                  <button
                    onClick={() => dismissMutation.mutate(alert.id)}
                    className="flex items-center justify-center w-10 py-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Optimize CTA */}
      {filteredAlerts.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3 mb-3">
              <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-base mb-1">{copy.optimizeTitle}</p>
                <p className="text-xs text-blue-200 leading-relaxed">
                  {copy.optimizeDesc}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/dashboard/recommend")}
              className="w-full py-3 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-colors"
            >
              {copy.optimizeCTA}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
