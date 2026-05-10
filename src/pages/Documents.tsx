import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Image, Music, Table, File, Search, Filter, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import type { Upload, UploadStatus, FileCategory } from "@/types";
import { FILE_CATEGORY_LABELS } from "@/lib/constants";

function CategoryIcon({ type }: { type: FileCategory }) {
  const icons: Record<FileCategory, React.ElementType> = {
    image: Image, audio: Music, pdf: FileText,
    spreadsheet: Table, text: File, archive: File,
  };
  const Icon = icons[type] ?? File;
  return <Icon className="w-4 h-4 text-slate-400" />;
}

function StatusBadge({ status }: { status: UploadStatus }) {
  const styles: Record<UploadStatus, string> = {
    pending: "bg-slate-600/50 text-slate-300",
    processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <Badge className={styles[status]}>{status}</Badge>;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: uploads = [], isLoading, refetch } = useQuery({
    queryKey: ["uploads", statusFilter, typeFilter],
    queryFn: async () => {
      let q = supabase
        .from("uploads")
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (typeFilter !== "all") q = q.eq("file_type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Upload[];
    },
  });

  const filtered = search
    ? uploads.filter((u) => u.file_name.toLowerCase().includes(search.toLowerCase()))
    : uploads;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-slate-400 text-sm mt-1">{uploads.length} total uploads</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="border-slate-600 text-slate-300">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-slate-300">
            <Filter className="w-3.5 h-3.5 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {["all", "pending", "processing", "completed", "failed"].map((s) => (
              <SelectItem key={s} value={s} className="text-slate-300 capitalize">{s === "all" ? "All statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-slate-300">
            <SelectValue placeholder="File type" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-slate-300">All types</SelectItem>
            {(Object.keys(FILE_CATEGORY_LABELS) as FileCategory[]).map((t) => (
              <SelectItem key={t} value={t} className="text-slate-300">{FILE_CATEGORY_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No documents found</p>
            <Button asChild size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-500">
              <Link to="/upload">Upload files</Link>
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase tracking-wide">File</th>
                <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase tracking-wide">Size</th>
                <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase tracking-wide">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.map((upload) => (
                <tr key={upload.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                        <CategoryIcon type={upload.file_type} />
                      </div>
                      <span className="text-white text-sm font-medium truncate max-w-xs">{upload.file_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-400 text-sm capitalize">{FILE_CATEGORY_LABELS[upload.file_type] ?? upload.file_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-400 text-sm">{formatSize(upload.file_size)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={upload.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-400 text-sm">{new Date(upload.created_at).toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
