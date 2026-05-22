import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/common/EmptyState";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Clock, Award, Lightbulb } from "lucide-react";

const PIE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

const HARDCODED_SUGGESTIONS = [
  {
    titleEn: "Switch groceries to Share by MAF",
    titleAr: "حوّل مشترياتك البقالة إلى Share by MAF",
    descEn: "Earn 2x more points on grocery spend at Carrefour and other partners",
    descAr: "اربح نقاطاً أكثر بمرتين على إنفاق البقالة في كارفور والشركاء الآخرين",
    impactEn: "Estimated +AED 45/month",
    impactAr: "+45 AED/شهر تقديرياً",
  },
  {
    titleEn: "Use Skywards card on Emirates flights",
    titleAr: "استخدم بطاقة سكاي واردز في رحلات طيران الإمارات",
    descEn: "Earn 5x Skywards Miles when you pay with Skywards-linked card",
    descAr: "اربح 5 أضعاف أميال سكاي واردز عند الدفع ببطاقة مرتبطة بسكاي واردز",
    impactEn: "Estimated +AED 120/year",
    impactAr: "+120 AED/سنة تقديرياً",
  },
  {
    titleEn: "Redeem banking points for cashback",
    titleAr: "استبدل نقاط البنك باسترداد نقدي",
    descEn: "Your banking points have the best cashback rate this month",
    descAr: "نقاط البنك الخاصة بك لديها أفضل معدل استرداد نقدي هذا الشهر",
    impactEn: "Estimated +AED 30/month",
    impactAr: "+30 AED/شهر تقديرياً",
  },
];

export default function Insights() {
  const { user } = useAuth();
  const { language, isRTL } = useAppContext();

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["insights-transactions", user?.id],
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

  const { data: userPrograms } = useQuery({
    queryKey: ["user-programs-insights", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("*, program:programs(*)")
        .eq("user_id", user!.id);
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const { data: recommendations } = useQuery({
    queryKey: ["recommendations-insights", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("recommendations")
        .select("*")
        .eq("user_id", user!.id)
        .eq("was_followed", true);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Compute metrics
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonthTx = (transactions ?? []).filter(
    (tx: any) => new Date(tx.created_at) >= monthStart
  );

  const thisMonthEarned = thisMonthTx
    .filter((tx: any) => (tx.points_earned ?? 0) > 0)
    .reduce((sum: number, tx: any) => sum + (tx.estimated_value_aed ?? 0), 0);

  const thisMonthRedeemed = thisMonthTx
    .filter((tx: any) => tx.cashback_aed > 0 || tx.discount_applied_aed > 0)
    .reduce(
      (sum: number, tx: any) => sum + tx.cashback_aed + tx.discount_applied_aed,
      0
    );

  const unrealizedValue = (userPrograms ?? []).reduce((sum: number, up: any) => {
    const rate = up.program?.default_redemption_value_aed ?? 0.01;
    return sum + up.current_balance * rate;
  }, 0);

  const followedCount = recommendations?.length ?? 0;

  // Bar chart: 6 months
  const chartData = (() => {
    const months: Record<
      string,
      { month: string; Earned: number; Redeemed: number }
    > = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = {
        month: d.toLocaleString(language === "ar" ? "ar-AE" : "en-US", {
          month: "short",
        }),
        Earned: 0,
        Redeemed: 0,
      };
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

  // Pie chart: earning by program
  const pieData = (userPrograms ?? [])
    .map((up: any) => {
      const name = isRTL
        ? up.program?.display_name_ar
        : up.program?.display_name_en;
      const rate = up.program?.default_redemption_value_aed ?? 0.01;
      return {
        name: name ?? "Unknown",
        value: parseFloat((up.current_balance * rate).toFixed(2)),
      };
    })
    .filter((d: any) => d.value > 0);

  // Top merchants
  const merchantMap: Record<string, { name: string; count: number; total: number; points: number }> = {};
  for (const tx of transactions ?? []) {
    const mid = tx.merchant_id ?? "unknown";
    if (!merchantMap[mid]) {
      merchantMap[mid] = { name: mid.slice(0, 8), count: 0, total: 0, points: 0 };
    }
    merchantMap[mid].count++;
    merchantMap[mid].total += tx.amount_aed;
    merchantMap[mid].points += tx.points_earned ?? 0;
  }
  const topMerchants = Object.values(merchantMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const hasChartData = chartData.some((d) => d.Earned > 0 || d.Redeemed > 0);

  const t = {
    en: {
      title: "Insights",
      earned: "This Month Earned",
      redeemed: "This Month Redeemed",
      unrealized: "Unrealized Value",
      followed: "Recommendations Followed",
      earning: "Earning History",
      byProgram: "Value by Program",
      topMerchants: "Top Merchants",
      merchant: "Merchant",
      transactions: "Transactions",
      spend: "Total Spend",
      pts: "Points",
      noData: "No data yet",
      suggestions: "Smart Suggestions",
      impact: "Impact",
    },
    ar: {
      title: "الإحصائيات",
      earned: "المكتسب هذا الشهر",
      redeemed: "المستبدل هذا الشهر",
      unrealized: "القيمة غير المحققة",
      followed: "التوصيات المتبعة",
      earning: "سجل الأرباح",
      byProgram: "القيمة حسب البرنامج",
      topMerchants: "أبرز التجار",
      merchant: "التاجر",
      transactions: "المعاملات",
      spend: "إجمالي الإنفاق",
      pts: "نقاط",
      noData: "لا توجد بيانات بعد",
      suggestions: "اقتراحات ذكية",
      impact: "التأثير",
    },
  };

  const copy = t[language];

  const metricCards = [
    {
      label: copy.earned,
      value: `AED ${thisMonthEarned.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: copy.redeemed,
      value: `AED ${thisMonthRedeemed.toFixed(2)}`,
      icon: TrendingDown,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: copy.unrealized,
      value: `AED ${unrealizedValue.toFixed(2)}`,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: copy.followed,
      value: `+${followedCount}`,
      icon: Award,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex flex-col min-h-screen bg-slate-50 pb-20"
    >
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900">{copy.title}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Metric cards 2×2 */}
        {txLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {metricCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="bg-white rounded-2xl p-4 border border-slate-100"
              >
                <div
                  className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2`}
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-lg font-bold text-slate-900">{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Bar chart */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 mb-4">{copy.earning}</h2>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={chartData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number) => [`AED ${v.toFixed(2)}`, undefined]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Earned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Redeemed" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title={copy.noData} />
          )}
        </div>

        {/* Pie chart */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 mb-4">
              {copy.byProgram}
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_: any, idx: number) => (
                    <Cell
                      key={idx}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v: number) => [`AED ${v.toFixed(2)}`, undefined]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top merchants table */}
        {topMerchants.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 mb-3">
              {copy.topMerchants}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-start pb-2 text-slate-500 font-medium">
                      {copy.merchant}
                    </th>
                    <th className="text-end pb-2 text-slate-500 font-medium">
                      {copy.transactions}
                    </th>
                    <th className="text-end pb-2 text-slate-500 font-medium">
                      {copy.spend}
                    </th>
                    <th className="text-end pb-2 text-slate-500 font-medium">
                      {copy.pts}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topMerchants.map((m, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="py-2 font-medium text-slate-800 max-w-[100px] truncate">
                        {m.name}
                      </td>
                      <td className="py-2 text-end text-slate-600">{m.count}</td>
                      <td className="py-2 text-end text-slate-600">
                        AED {m.total.toFixed(0)}
                      </td>
                      <td className="py-2 text-end text-green-600 font-semibold">
                        {m.points.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Smart suggestions */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            {copy.suggestions}
          </h2>
          <div className="space-y-3">
            {HARDCODED_SUGGESTIONS.map((s, i) => {
              const title = language === "ar" ? s.titleAr : s.titleEn;
              const desc = language === "ar" ? s.descAr : s.descEn;
              const impact = language === "ar" ? s.impactAr : s.impactEn;

              return (
                <div
                  key={i}
                  className="bg-amber-50 rounded-xl p-3 border border-amber-100"
                >
                  <p className="text-xs font-semibold text-slate-900 mb-0.5">
                    {title}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-1.5">
                    {desc}
                  </p>
                  <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    {copy.impact}: {impact}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
