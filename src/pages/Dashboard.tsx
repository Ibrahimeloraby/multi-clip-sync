import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, CheckCircle, Clock, TrendingUp, Upload,
  AlertTriangle, ArrowUpRight, Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_COLORS } from "@/lib/constants";
import type { DocumentType } from "@/types";

const MOCK_TREND = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString("en", { month: "short", day: "numeric" }),
  uploads: Math.floor(Math.random() * 40 + 10),
  processed: Math.floor(Math.random() * 35 + 8),
}));

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data: uploadsData } = useQuery({
    queryKey: ["dashboard-uploads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uploads")
        .select("id, status, created_at, file_type, file_name")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviewData } = useQuery({
    queryKey: ["dashboard-review-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("extracted_records")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "needs_review");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: recordsData } = useQuery({
    queryKey: ["dashboard-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extracted_records")
        .select("id, document_type, confidence, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalUploads = uploadsData?.length ?? 0;
  const pending = uploadsData?.filter((u) => u.status === "pending" || u.status === "processing").length ?? 0;
  const pendingReview = reviewData ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">AI data collection overview</p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-500">
          <Link to="/upload">
            <Upload className="w-4 h-4 mr-2" /> Upload Data
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total Documents"
          value={totalUploads}
          sub="All time"
          color="bg-indigo-500/20 text-indigo-400"
        />
        <StatCard
          icon={CheckCircle}
          label="Processed Today"
          value={uploadsData?.filter((u) => {
            const today = new Date().toDateString();
            return u.status === "completed" && new Date(u.created_at).toDateString() === today;
          }).length ?? 0}
          sub="Completed"
          color="bg-green-500/20 text-green-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Pending Review"
          value={pendingReview}
          sub="Needs human check"
          color="bg-yellow-500/20 text-yellow-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Processing Queue"
          value={pending}
          sub="In progress"
          color="bg-violet-500/20 text-violet-400"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Processing trend chart */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Processing Activity</h2>
            <span className="text-slate-400 text-xs">Last 14 days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MOCK_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Area type="monotone" dataKey="uploads" stroke="#6366f1" fill="#6366f120" strokeWidth={2} name="Uploaded" />
              <Area type="monotone" dataKey="processed" stroke="#10b981" fill="#10b98120" strokeWidth={2} name="Processed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-3">
          <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
          {[
            { to: "/upload", icon: Upload, label: "Upload files", desc: "PDF, images, audio, Excel" },
            { to: "/review", icon: Brain, label: "Review queue", desc: `${pendingReview} items need review` },
            { to: "/schemas", icon: FileText, label: "Manage schemas", desc: "Define extraction fields" },
          ].map(({ to, icon: Icon, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium">{label}</div>
                <div className="text-slate-400 text-xs truncate">{desc}</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent uploads */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-white font-semibold">Recent Uploads</h2>
          <Button variant="ghost" size="sm" asChild className="text-indigo-400 hover:text-indigo-300">
            <Link to="/documents">View all</Link>
          </Button>
        </div>
        <div className="divide-y divide-slate-700">
          {(uploadsData ?? []).length === 0 ? (
            <div className="p-8 text-center">
              <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No uploads yet</p>
              <Button asChild size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-500">
                <Link to="/upload">Upload your first file</Link>
              </Button>
            </div>
          ) : (
            (uploadsData ?? []).map((upload) => (
              <div key={upload.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{upload.file_name}</div>
                  <div className="text-slate-500 text-xs">
                    {new Date(upload.created_at).toLocaleString()}
                  </div>
                </div>
                <Badge
                  className={
                    upload.status === "completed"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : upload.status === "failed"
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : upload.status === "processing"
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      : "bg-slate-600/50 text-slate-400"
                  }
                >
                  {upload.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent records */}
      {recordsData && recordsData.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between p-5 border-b border-slate-700">
            <h2 className="text-white font-semibold">Recent Extracted Records</h2>
            <Button variant="ghost" size="sm" asChild className="text-indigo-400 hover:text-indigo-300">
              <Link to="/records">View all</Link>
            </Button>
          </div>
          <div className="divide-y divide-slate-700">
            {recordsData.map((record) => (
              <div key={record.id} className="flex items-center gap-4 px-5 py-3">
                <Badge className={DOCUMENT_TYPE_COLORS[record.document_type as DocumentType] ?? "bg-gray-100 text-gray-800"}>
                  {DOCUMENT_TYPE_LABELS[record.document_type as DocumentType] ?? record.document_type}
                </Badge>
                <div className="flex-1" />
                {record.confidence !== null && (
                  <span className={`text-xs font-medium ${record.confidence >= 0.85 ? "text-green-400" : record.confidence >= 0.65 ? "text-yellow-400" : "text-red-400"}`}>
                    {Math.round(record.confidence * 100)}% confidence
                  </span>
                )}
                <span className="text-slate-500 text-xs">
                  {new Date(record.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
