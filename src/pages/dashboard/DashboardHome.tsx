import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/common/EmptyState";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Sparkles,
  AlertTriangle,
  Plus,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

interface Program {
  id: string;
  slug: string;
  display_name_en: string;
  display_name_ar: string;
  logo_url: string | null;
  category: string;
  default_earn_rate_aed: number;
  default_redemption_value_aed: number;
  expiry_rule: any;
  transfer_partners: any[];
  official_url: string | null;
}

interface UserProgram {
  id: string;
  user_id: string;
  program_id: string;
  current_balance: number;
  tier_name: string | null;
  expiry_dates: Array<{ amount: number; expires_at: string }>;
  tracking_method: string;
  forwarding_address: string | null;
  last_updated_at: string;
  program?: Program;
}

const GRADIENT_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-500",
  "from-green-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-500",
];

function ProgramMiniCard({
  up,
  isRTL,
  onClick,
}: {
  up: UserProgram;
  isRTL: boolean;
  onClick: () => void;
}) {
  const prog = up.program;
  const name = prog
    ? isRTL
      ? prog.display_name_ar
      : prog.display_name_en
    : "Unknown";
  const initials = (prog?.display_name_en ?? "??")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const gradient = GRADIENT_COLORS[up.program_id.charCodeAt(0) % GRADIENT_COLORS.length];

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 w-20 flex-shrink-0"
    >
      {prog?.logo_url ? (
        <img
          src={prog.logo_url}
          alt={name}
          className="w-14 h-14 rounded-2xl object-contain border border-slate-100 bg-white"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
        >
          {initials}
        </div>
      )}
      <span className="text-[10px] font-medium text-slate-600 text-center line-clamp-2 leading-tight px-1">
        {name}
      </span>
      <span className="text-xs font-semibold text-slate-900">
        {up.current_balance.toLocaleString()}
      </span>
    </button>
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, isRTL } = useAppContext();

  // Fetch user programs with joined program data
  const { data: userPrograms, isLoading: programsLoading } = useQuery<UserProgram[]>({
    queryKey: ["user-programs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("*, program:programs(*)")
        .eq("user_id", user!.id);
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  // Fetch expiring alerts (30 days)
  const { data: expiringAlerts } = useQuery({
    queryKey: ["expiring-alerts-home", user?.id],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 30);
      const { data } = await supabase
        .from("expiring_alerts")
        .select("*")
        .eq("user_id", user!.id)
        .lte("expires_at", cutoff.toISOString())
        .gte("expires_at", new Date().toISOString());
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch transactions for chart (last 6 months)
  const { data: transactions } = useQuery({
    queryKey: ["transactions-chart", user?.id],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch recent merchant rules for community pulse
  const { data: recentRules } = useQuery({
    queryKey: ["community-pulse"],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_rules")
        .select("*, program:programs(display_name_en, display_name_ar), merchant:merchants(display_name_en, display_name_ar)")
        .in("status", ["trusted", "verified"])
        .order("updated_at", { ascending: false })
        .limit(3);
      return (data as any[]) ?? [];
    },
  });

  // Compute totals
  const totalValue =
    userPrograms?.reduce((sum, up) => {
      const rate = up.program?.default_redemption_value_aed ?? 0.01;
      return sum + up.current_balance * rate;
    }, 0) ?? 0;

  const expiringTotal =
    expiringAlerts?.reduce((sum, a) => sum + (a.estimated_value_aed ?? 0), 0) ?? 0;

  // Underused programs (last_updated_at > 90 days ago)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const underused =
    userPrograms?.filter(
      (up) => new Date(up.last_updated_at) < ninetyDaysAgo && up.current_balance > 0
    ) ?? [];

  // Build chart data (last 6 months grouped by month)
  const chartData = (() => {
    const months: Record<string, { month: string; Earned: number; Redeemed: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString(language === "ar" ? "ar-AE" : "en-US", {
        month: "short",
      });
      months[key] = { month: label, Earned: 0, Redeemed: 0 };
    }

    for (const tx of transactions ?? []) {
      const d = new Date(tx.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) {
        if ((tx.points_earned ?? 0) > 0) {
          months[key].Earned += tx.estimated_value_aed ?? 0;
        } else if (tx.cashback_aed > 0 || tx.discount_applied_aed > 0) {
          months[key].Redeemed += tx.cashback_aed + tx.discount_applied_aed;
        }
      }
    }
    return Object.values(months);
  })();

  const hasChartData = chartData.some((d) => d.Earned > 0 || d.Redeemed > 0);

  const t = {
    en: {
      totalPortfolio: "Total Portfolio Value",
      programs: (n: number) => `${n} program${n !== 1 ? "s" : ""}`,
      updatedNow: "Updated just now",
      expiringBanner: `⚠️ AED ${expiringTotal.toFixed(2)} expiring in 30 days`,
      viewExpiring: "View →",
      useNow: "What should I use right now?",
      myPrograms: "My Programs",
      addProgram: "Add",
      underusedTitle: "Programs you haven't used recently",
      chartTitle: "Earning History",
      earnedLabel: "Earned (AED)",
      redeemedLabel: "Redeemed (AED)",
      communityTitle: "Community Pulse",
      communityDesc: "Recent rule updates",
      noData: "No transactions yet",
      noDataDesc: "Start using your programs to see earning history",
    },
    ar: {
      totalPortfolio: "إجمالي قيمة المحفظة",
      programs: (n: number) => `${n} ${n === 1 ? "برنامج" : "برامج"}`,
      updatedNow: "تم التحديث للتو",
      expiringBanner: `⚠️ AED ${expiringTotal.toFixed(2)} تنتهي في 30 يوماً`,
      viewExpiring: "عرض →",
      useNow: "ماذا يجب أن أستخدم الآن؟",
      myPrograms: "برامجي",
      addProgram: "إضافة",
      underusedTitle: "برامج لم تستخدمها مؤخراً",
      chartTitle: "سجل الأرباح",
      earnedLabel: "مكتسب (AED)",
      redeemedLabel: "مستبدل (AED)",
      communityTitle: "نبض المجتمع",
      communityDesc: "تحديثات القواعد الأخيرة",
      noData: "لا توجد معاملات بعد",
      noDataDesc: "ابدأ باستخدام برامجك لرؤية سجل الأرباح",
    },
  };

  const copy = t[language];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col gap-4 p-4 pb-6">
      {/* Hero card */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800 p-6 text-white shadow-xl">
        {programsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-blue-600/50" />
            <Skeleton className="h-10 w-48 bg-blue-600/50" />
            <Skeleton className="h-3 w-24 bg-blue-600/50" />
          </div>
        ) : (
          <>
            <p className="text-blue-200 text-sm mb-1">{copy.totalPortfolio}</p>
            <p className="text-4xl font-bold tracking-tight mb-1">
              AED {totalValue.toFixed(2)}
            </p>
            <p className="text-blue-200 text-xs">
              {copy.programs(userPrograms?.length ?? 0)} &middot; {copy.updatedNow}
            </p>
          </>
        )}
      </div>

      {/* Expiring soon banner */}
      {(expiringAlerts?.length ?? 0) > 0 && (
        <button
          onClick={() => navigate("/dashboard/expiring")}
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 hover:bg-amber-100 transition-colors"
        >
          <span className="text-sm font-medium text-amber-800">
            {copy.expiringBanner}
          </span>
          <span className="text-sm text-amber-600 font-semibold">
            {copy.viewExpiring}
          </span>
        </button>
      )}

      {/* Recommend CTA */}
      <Button
        onClick={() => navigate("/dashboard/recommend")}
        className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-semibold text-base shadow-md shadow-blue-200 flex items-center gap-2 justify-center"
      >
        <Sparkles className="w-5 h-5" />
        {copy.useNow}
      </Button>

      {/* Programs horizontal scroll */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900">{copy.myPrograms}</h2>
          <button
            onClick={() => navigate("/dashboard/programs")}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            {copy.addProgram} +
          </button>
        </div>

        {programsLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : (userPrograms?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<TrendingUp />}
            title="No programs yet"
            description="Add your first loyalty program to get started"
            action={{ label: "Add Program", onClick: () => navigate("/dashboard/programs") }}
          />
        ) : (
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-2 w-max">
              {userPrograms!.map((up) => (
                <ProgramMiniCard
                  key={up.id}
                  up={up}
                  isRTL={isRTL}
                  onClick={() => navigate(`/dashboard/programs/${up.id}`)}
                />
              ))}
              {/* Add card */}
              <button
                onClick={() => navigate("/dashboard/programs")}
                className="flex flex-col items-center gap-2 w-20 flex-shrink-0"
              >
                <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors">
                  <Plus className="w-6 h-6 text-slate-400" />
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  {copy.addProgram}
                </span>
              </button>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Underused programs warning */}
      {underused.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">
                {copy.underusedTitle}
              </p>
              <p className="text-xs text-amber-700">
                {underused
                  .map((up) =>
                    isRTL
                      ? up.program?.display_name_ar
                      : up.program?.display_name_en
                  )
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly chart */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <h2 className="text-base font-bold text-slate-900 mb-4">
          {copy.chartTitle}
        </h2>
        {hasChartData ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [`AED ${value.toFixed(2)}`, undefined]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="Earned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Redeemed" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title={copy.noData}
            description={copy.noDataDesc}
          />
        )}
      </div>

      {/* Community pulse */}
      {(recentRules?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">
              {copy.communityTitle}
            </h2>
            <span className="text-xs text-slate-400">{copy.communityDesc}</span>
          </div>
          <div className="space-y-3">
            {recentRules!.map((rule: any) => {
              const progName = isRTL
                ? rule.program?.display_name_ar
                : rule.program?.display_name_en;
              const merchantName = isRTL
                ? rule.merchant?.display_name_ar
                : rule.merchant?.display_name_en;
              return (
                <div
                  key={rule.id}
                  className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {progName} @ {merchantName}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                      {rule.description_text ?? `${rule.rule_type} rule`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
