import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Users, CreditCard, ShieldCheck, Star } from "lucide-react";

export default function AdminAnalytics() {
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ["admin-analytics-counts"],
    queryFn: async () => {
      const [users, programs, rules, merchants] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("programs").select("id", { count: "exact", head: true }),
        supabase.from("merchant_rules").select("id", { count: "exact", head: true }),
        supabase.from("merchants").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users.count ?? 0,
        programs: programs.count ?? 0,
        rules: rules.count ?? 0,
        merchants: merchants.count ?? 0,
      };
    },
  });

  const { data: ruleStats } = useQuery({
    queryKey: ["admin-analytics-rule-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_rules")
        .select("status, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      const statusCounts: Record<string, number> = {};
      const monthCounts: Record<string, number> = {};

      for (const r of data ?? []) {
        statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthCounts[key] = (monthCounts[key] ?? 0) + 1;
      }

      const statusData = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
      }));

      const now = new Date();
      const monthData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return {
          month: d.toLocaleString("en-US", { month: "short" }),
          Rules: monthCounts[key] ?? 0,
        };
      });

      return { statusData, monthData };
    },
  });

  const metrics = [
    {
      label: "Total Users",
      value: counts?.users ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Programs",
      value: counts?.programs ?? 0,
      icon: CreditCard,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Rules",
      value: counts?.rules ?? 0,
      icon: ShieldCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Merchants",
      value: counts?.merchants ?? 0,
      icon: Star,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {countsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))
          : metrics.map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
      </div>

      {/* Rules by month */}
      {ruleStats?.monthData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Rules Added (Last 6 Months)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={ruleStats.monthData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Rules" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rules by status */}
      {ruleStats?.statusData && ruleStats.statusData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Rules by Status
          </h2>
          <div className="space-y-2">
            {ruleStats.statusData.map((d) => {
              const maxCount = Math.max(...ruleStats.statusData.map((x) => x.count));
              const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              return (
                <div key={d.status} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-24 flex-shrink-0">
                    {d.status}
                  </span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-10 text-end">
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top contributors */}
      <TopContributors />

      {/* Program adoption */}
      <ProgramAdoption />
    </div>
  );
}

function TopContributors() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-top-contributors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, reputation_score, reputation_tier")
        .order("reputation_score", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const TIER_COLORS: Record<string, string> = {
    maven: "text-yellow-600", expert: "text-blue-600",
    trusted: "text-green-600", contributor: "text-orange-600", newcomer: "text-slate-500",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-sm font-bold text-slate-900 mb-4">Top Contributors</h2>
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {(data ?? []).map((u: any, idx: number) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5">
              <span className="text-sm font-bold text-slate-400 w-5">#{idx + 1}</span>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                {(u.full_name ?? "A").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{u.full_name ?? "Anonymous"}</p>
                <p className={`text-xs capitalize ${TIER_COLORS[u.reputation_tier] ?? ""}`}>{u.reputation_tier}</p>
              </div>
              <span className="text-sm font-bold text-slate-900">{u.reputation_score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramAdoption() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-program-adoption"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("program_id, programs:program_id(display_name_en)");
      if (!data) return [];
      const counts: Record<string, { name: string; count: number }> = {};
      for (const row of data) {
        const prog = (row as any).programs;
        if (!prog) continue;
        const key = row.program_id;
        if (!counts[key]) counts[key] = { name: prog.display_name_en, count: 0 };
        counts[key].count++;
      }
      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
  });

  const maxCount = Math.max(...(data ?? []).map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-sm font-bold text-slate-900 mb-4">Program Adoption</h2>
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-36 truncate flex-shrink-0">{d.name}</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(d.count / maxCount) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-slate-700 w-8 text-right">{d.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
