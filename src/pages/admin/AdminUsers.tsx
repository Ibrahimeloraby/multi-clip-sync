import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShieldCheck } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  trusted: "bg-green-100 text-green-700",
  verified: "bg-blue-100 text-blue-700",
  newcomer: "bg-slate-100 text-slate-600",
  contributor: "bg-purple-100 text-purple-700",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, email, full_name, reputation_score, reputation_tier, is_admin, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data as any[]) ?? [];
    },
  });

  const filtered = (users ?? []).filter((u: any) =>
    (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500">{filtered.length} total</p>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-start px-4 py-3 font-semibold text-slate-700">User</th>
              <th className="text-start px-4 py-3 font-semibold text-slate-700">Tier</th>
              <th className="text-start px-4 py-3 font-semibold text-slate-700">Score</th>
              <th className="text-start px-4 py-3 font-semibold text-slate-700">Admin</th>
              <th className="text-start px-4 py-3 font-semibold text-slate-700">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {u.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs border-0 capitalize ${TIER_COLORS[u.reputation_tier] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {u.reputation_tier ?? "newcomer"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.reputation_score}</td>
                    <td className="px-4 py-3">
                      {u.is_admin && (
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
