import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, ShieldCheck, XCircle, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  trusted: "bg-green-100 text-green-700", verified: "bg-blue-100 text-blue-700",
  provisional: "bg-yellow-100 text-yellow-700", pending: "bg-amber-100 text-amber-700",
  disputed: "bg-red-100 text-red-700", expired: "bg-slate-100 text-slate-400",
};

export default function AdminRules() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["admin-rules", filterStatus],
    queryFn: async () => {
      let q = supabase
        .from("merchant_rules")
        .select("id, rule_type, status, confidence_score, source, created_at, program:programs(display_name_en), merchant:merchants(display_name_en)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      const { data } = await q;
      return (data as any[]) ?? [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase.from("merchant_rules").update({ status }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-rules"] });
      toast.success(`${selected.size > 1 ? `${selected.size} rules` : "Rule"} ${status}`);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const filtered = (rules ?? []).filter((r: any) =>
    (r.program?.display_name_en ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.merchant?.display_name_en ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r: any) => r.id)));
  };

  const bulkAction = (status: string) => {
    const ids = selected.size > 0 ? [...selected] : filtered.map((r: any) => r.id).slice(0, 1);
    updateStatusMutation.mutate({ ids, status });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Rules</h1>
        <p className="text-sm text-slate-500">{filtered.length} shown</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all","pending","provisional","verified","trusted","disputed","expired"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${filterStatus === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search by program or merchant..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-blue-800">{selected.size} selected</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => bulkAction("verified")} disabled={updateStatusMutation.isPending}>
            {updateStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 mr-1" />}Approve
          </Button>
          <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs" onClick={() => bulkAction("expired")} disabled={updateStatusMutation.isPending}>
            <XCircle className="w-3 h-3 mr-1" />Reject
          </Button>
          <button className="text-xs text-slate-500 ml-auto" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
              </th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Program / Merchant</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Confidence</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Source</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Created</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-slate-500 py-8">No rules found</td></tr>
            ) : filtered.map((rule: any) => (
              <tr key={rule.id} className={`hover:bg-slate-50 ${selected.has(rule.id) ? "bg-blue-50" : ""}`}>
                <td className="px-4 py-3"><Checkbox checked={selected.has(rule.id)} onCheckedChange={() => toggleSelect(rule.id)} /></td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{rule.program?.display_name_en ?? "Unknown"}</p>
                  <p className="text-xs text-slate-400">@ {rule.merchant?.display_name_en ?? "Unknown"}</p>
                </td>
                <td className="px-4 py-3 text-slate-600 capitalize">{rule.rule_type}</td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs border-0 ${STATUS_COLORS[rule.status] ?? "bg-slate-100 text-slate-600"}`}>{rule.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{rule.confidence_score}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{rule.source}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{rule.created_at?.split("T")[0]}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => updateStatusMutation.mutate({ ids: [rule.id], status: "verified" })} className="p-1 rounded hover:bg-green-50 text-green-600" title="Approve"><ShieldCheck className="w-4 h-4" /></button>
                    <button onClick={() => updateStatusMutation.mutate({ ids: [rule.id], status: "expired" })} className="p-1 rounded hover:bg-red-50 text-red-500" title="Reject"><XCircle className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
