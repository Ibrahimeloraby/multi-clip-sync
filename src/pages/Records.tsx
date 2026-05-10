import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database, Search, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import type { ExtractedRecord, DocumentType } from "@/types";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_COLORS, CONFIDENCE_THRESHOLDS } from "@/lib/constants";

function ConfidencePill({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-500 text-xs">—</span>;
  const pct = Math.round(value * 100);
  const color = value >= CONFIDENCE_THRESHOLDS.high
    ? "text-green-400" : value >= CONFIDENCE_THRESHOLDS.medium
    ? "text-yellow-400" : "text-red-400";
  return <span className={`text-xs font-medium ${color}`}>{pct}%</span>;
}

function RecordRow({ record }: { record: ExtractedRecord }) {
  const [expanded, setExpanded] = useState(false);
  const fields = Object.entries(record.normalized_data ?? record.raw_data ?? {});

  return (
    <>
      <tr
        className="hover:bg-slate-700/30 transition-colors cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3">
          <Badge className={DOCUMENT_TYPE_COLORS[record.document_type] ?? "bg-gray-100 text-gray-800"}>
            {DOCUMENT_TYPE_LABELS[record.document_type] ?? record.document_type}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <ConfidencePill value={record.confidence} />
        </td>
        <td className="px-4 py-3">
          <Badge
            className={
              record.review_status === "auto_approved" || record.review_status === "approved"
                ? "bg-green-500/20 text-green-400"
                : record.review_status === "needs_review"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400"
            }
          >
            {record.review_status.replace("_", " ")}
          </Badge>
        </td>
        <td className="px-4 py-3 text-slate-400 text-sm">{new Date(record.created_at).toLocaleString()}</td>
        <td className="px-4 py-3">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-slate-900/50 px-4 py-4 border-t border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {fields.length === 0 ? (
                <span className="text-slate-500 text-sm col-span-4">No extracted fields</span>
              ) : (
                fields.map(([key, val]) => (
                  <div key={key} className="bg-slate-800 rounded-lg p-3">
                    <div className="text-slate-400 text-xs mb-1 capitalize">{key.replace(/_/g, " ")}</div>
                    <div className="text-white text-sm font-medium truncate">
                      {val === null ? "—" : typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Records() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["records", typeFilter],
    queryFn: async () => {
      let q = supabase
        .from("extracted_records")
        .select("*")
        .order("created_at", { ascending: false });
      if (typeFilter !== "all") q = q.eq("document_type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ExtractedRecord[];
    },
  });

  const filtered = search
    ? records.filter((r) =>
        r.document_type.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(r.raw_data).toLowerCase().includes(search.toLowerCase())
      )
    : records;

  const exportCSV = () => {
    if (!filtered.length) return;
    const allKeys = Array.from(
      new Set(filtered.flatMap((r) => Object.keys(r.normalized_data ?? r.raw_data ?? {})))
    );
    const header = ["id", "document_type", "confidence", "review_status", "created_at", ...allKeys].join(",");
    const rows = filtered.map((r) => {
      const data = r.normalized_data ?? r.raw_data ?? {};
      return [r.id, r.document_type, r.confidence ?? "", r.review_status, r.created_at, ...allKeys.map((k) => JSON.stringify(data[k] ?? ""))].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "omniform-records.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const docTypes = Array.from(new Set(records.map((r) => r.document_type)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Records</h1>
          <p className="text-slate-400 text-sm mt-1">{records.length} extracted records</p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm" className="border-slate-600 text-slate-300">
          <Download className="w-3.5 h-3.5 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search records…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-slate-300">
            <SelectValue placeholder="Document type" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-slate-300">All types</SelectItem>
            {docTypes.map((t) => (
              <SelectItem key={t} value={t} className="text-slate-300">
                {DOCUMENT_TYPE_LABELS[t as DocumentType] ?? t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No records yet</p>
            <p className="text-slate-500 text-sm mt-1">Upload and process files to see extracted records here</p>
            <Button asChild size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-500">
              <Link to="/upload">Upload data</Link>
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase tracking-wide">Confidence</th>
                <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase tracking-wide">Extracted at</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.map((record) => (
                <RecordRow key={record.id} record={record} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
