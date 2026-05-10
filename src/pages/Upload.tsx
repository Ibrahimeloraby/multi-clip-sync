import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRight, Sparkles } from "lucide-react";
import DropZone from "@/components/upload/DropZone";
import type { UploadFile } from "@/types";
import { MIME_TO_CATEGORY } from "@/lib/constants";

const VERTICALS = [
  { value: "retail", label: "Retail" },
  { value: "food_and_beverage", label: "Food & Beverage" },
  { value: "logistics", label: "Logistics" },
  { value: "finance", label: "Finance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "real_estate", label: "Real Estate" },
  { value: "construction", label: "Construction" },
  { value: "custom", label: "Custom / Other" },
];

export default function Upload() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [vertical, setVertical] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((f) => ({ file: f, id: crypto.randomUUID(), progress: 0, status: "idle" as const })),
    ]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleUpload = async () => {
    const idleFiles = files.filter((f) => f.status === "idle");
    if (!idleFiles.length) return;
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();

    for (const uf of idleFiles) {
      setFiles((prev) => prev.map((f) => f.id === uf.id ? { ...f, status: "uploading" } : f));
      try {
        const ext = uf.file.name.split(".").pop() ?? "bin";
        const path = `uploads/${user?.id ?? "anon"}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: storageErr } = await supabase.storage
          .from("omniform-uploads")
          .upload(path, uf.file, { cacheControl: "3600" });
        if (storageErr) throw storageErr;

        const { data: { publicUrl } } = supabase.storage
          .from("omniform-uploads")
          .getPublicUrl(path);

        const { error: dbErr } = await supabase.from("uploads").insert({
          file_name: uf.file.name,
          file_type: MIME_TO_CATEGORY[uf.file.type] ?? "text",
          mime_type: uf.file.type,
          file_size: uf.file.size,
          storage_path: path,
          storage_url: publicUrl,
          status: "pending",
          metadata: { vertical: vertical || null },
        });
        if (dbErr) throw dbErr;

        setFiles((prev) => prev.map((f) => f.id === uf.id ? { ...f, status: "done", progress: 100 } : f));
      } catch (err) {
        setFiles((prev) => prev.map((f) => f.id === uf.id ? { ...f, status: "error", error: String(err) } : f));
        toast.error(`Failed to upload ${uf.file.name}`);
      }
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["dashboard-uploads"] });
    toast.success(`${idleFiles.length} file(s) uploaded and queued for processing`);
  };

  const pendingCount = files.filter((f) => f.status === "idle").length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Data</h1>
        <p className="text-slate-400 text-sm mt-1">
          Drop any file format — AI will classify and extract structured data automatically
        </p>
      </div>

      {/* Vertical selector */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-3">
        <Label className="text-slate-300">Business vertical (optional)</Label>
        <Select value={vertical} onValueChange={setVertical}>
          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
            <SelectValue placeholder="Auto-detect from content" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {VERTICALS.map((v) => (
              <SelectItem key={v.value} value={v.value} className="text-slate-300">
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-slate-500 text-xs">
          Selecting a vertical helps the AI apply the right extraction schema. Leave blank for auto-detection.
        </p>
      </div>

      {/* Drop zone */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <DropZone files={files} onAdd={addFiles} onRemove={removeFile} />
      </div>

      {/* Process button */}
      {files.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-slate-400 text-sm">
            {pendingCount > 0 ? (
              <span>{pendingCount} file{pendingCount > 1 ? "s" : ""} ready to upload</span>
            ) : (
              <span className="text-green-400">All files uploaded successfully</span>
            )}
          </div>
          <Button
            onClick={handleUpload}
            disabled={uploading || pendingCount === 0}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Process with AI
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* What happens next */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h3 className="text-white font-medium mb-3">What happens after upload?</h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "Classification", desc: "AI identifies document type (invoice, receipt, message, etc.)" },
            { step: "2", title: "Extraction", desc: "Claude extracts structured fields based on your schema" },
            { step: "3", title: "Validation", desc: "Confidence scoring flags low-confidence extractions for review" },
            { step: "4", title: "Structured output", desc: "Clean data appears in Records, ready to export or integrate" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step}
              </div>
              <div>
                <span className="text-white text-sm font-medium">{title} — </span>
                <span className="text-slate-400 text-sm">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
