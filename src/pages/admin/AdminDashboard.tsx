import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  AlertTriangle,
  ClipboardCheck,
  ChevronRight,
  Clock,
} from "lucide-react";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number | undefined;
  icon: React.FC<{ className?: string }>;
  color: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-0.5" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">{(value ?? 0).toLocaleString()}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [pending, users, activeRules, disputed] = await Promise.all([
        supabase
          .from("admin_review_queue")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("merchant_rules")
          .select("id", { count: "exact", head: true })
          .neq("status", "expired"),
        supabase
          .from("merchant_rules")
          .select("id", { count: "exact", head: true })
          .eq("status", "disputed"),
      ]);
      return {
        pendingReview: pending.count ?? 0,
        totalUsers: users.count ?? 0,
        activeRules: activeRules.count ?? 0,
        disputedRules: disputed.count ?? 0,
      };
    },
  });

  const { data: recentQueue, isLoading: loadingQueue } = useQuery({
    queryKey: ["admin-recent-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_review_queue")
        .select("id, table_name, action_type, status, created_at, record_id, submitted_by_user_id")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const QUICK_LINKS = [
    { label: "Programs", path: "/admin/programs", desc: "Manage loyalty programs" },
    { label: "Merchants", path: "/admin/merchants", desc: "Verify merchants" },
    { label: "Rules", path: "/admin/rules", desc: "Review all rules" },
    { label: "Review Queue", path: "/admin/review", desc: "Pending approvals" },
    { label: "Users", path: "/admin/users", desc: "Manage user accounts" },
    { label: "Templates", path: "/admin/templates", desc: "AI prompt templates" },
    { label: "Analytics", path: "/admin/analytics", desc: "Usage & trends" },
  ];

  function timeAgo(dateStr: string): string {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">LoyaltyOne management overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Review"
          value={stats?.pendingReview}
          icon={ClipboardCheck}
          color="bg-orange-500"
          loading={isLoading}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers}
          icon={Users}
          color="bg-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="Active Rules"
          value={stats?.activeRules}
          icon={BookOpen}
          color="bg-green-500"
          loading={isLoading}
        />
        <StatCard
          title="Disputed Rules"
          value={stats?.disputedRules}
          icon={AlertTriangle}
          color="bg-red-500"
          loading={isLoading}
        />
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="flex items-center justify-between w-full px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{link.label}</p>
                  <p className="text-xs text-slate-500">{link.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent review queue */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Pending Reviews</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/review")}
            className="text-xs"
          >
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingQueue ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          ) : recentQueue?.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No pending reviews</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentQueue?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <ClipboardCheck className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 capitalize">
                        {item.action_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.table_name} · {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-orange-50 text-orange-700 border-orange-200"
                  >
                    pending
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
