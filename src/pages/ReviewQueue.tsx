import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Check, X, AlertTriangle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import type { ExtractedRecord, DocumentType } from "@/types";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_COLORS } from "@/lib/constants";

function ReviewCard({ record, onAction }: {
  record: ExtractedRecord;
  onAction: (id: string, status: "approved" | "rejected", notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const fields = Object.entries(record.normalized_data ?? record.raw_data ?? {});
  const pct = record.confidence ? Math.round(record.confidence * 100) : null;

  return (
    <div className="bg-slate-800 rounded-xl border border-yellow-500/30 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3">
        <Badge className={DOCUMENT_TYPE_COLORS[record.document_type as DocumentType] ?? "bg-gray-100 text-gray-800"}>
          {DOCUMENT_TYPE_LABELS[record.document_type as DocumentType] ?? record.document_type}
        </Badge>
        {pct !== null && (
          <span className={`text-xs font-medium ${pct >= 85 ? "text-green-400" : pct >= 65 ? "text-yellow-400" : "text-red-400"}`}>
            {pct}% confidence
          </span>
        )}
        <div className="flex-1" />
        <span className="text-slate-500 text-xs">{new Date(record.created_at).toLocaleString()}</span>
      </div>

      <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
        {fields.length === 0 ? (
          <p className="text-slate-500 text-sm col-span-3">No extracted fields</p>
        ) : (
          fields.map(([key, val]) => (
            <div key={key} className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-1 capitalize">{key.replace(/_/g, " ")}</div>
              <div className="text-white text-sm font-medium">
                {record.field_confidences?.[key] !== undefined && (
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                    record.field_confidences[key] >= 0.85 ? "bg-green-400" :
                    record.field_confidences[key] >= 0.65 ? "bg-yellow-400" : "bg-red-400"
                  }`} />
                )}
                {val === null ? "—" : String(val)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-5 pb-5 space-y-3">
        <Textarea
          placeholder="Add notes (optional)…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 resize-none"
        />
        <div className="flex gap-2">
          <Button
            onClick={() => onAction(record.id, "approved", notes)}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white"
          >
            <Check className="w-4 h-4 mr-2" /> Approve
          </Button>
          <Button
            onClick={() => onAction(record.id, "rejected", notes)}
            variant="outline"
            className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <X className="w-4 h-4 mr-2" /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewQueue() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["review-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extracted_records")
        .select("*")
        .eq("review_status", "needs_review")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExtractedRecord[];
    },
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: "approved" | "rejected"; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("extracted_records")
        .update({
          review_status: status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Record ${status}`);
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-review-count"] });
    },
    onError: () => toast.error("Failed to update record"),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Review Queue</h1>
          <p className="text-slate-400 text-sm mt-1">
            {items.length} record{items.length !== 1 ? "s" : ""} need human review
          </p>
        </div>
        {items.length > 0 && (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-2">
            {items.length}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Queue is clear</h3>
          <p className="text-slate-400 text-sm">All records have been reviewed or auto-approved</p>
        </div>
      ) : (
        <>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 text-sm font-medium">Human review required</p>
              <p className="text-yellow-400/70 text-xs mt-0.5">
                These records have confidence below 85% or contain ambiguous data. Review each extraction and approve or reject.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {items.map((record) => (
              <ReviewCard
                key={record.id}
                record={record}
                onAction={(id, status, notes) => updateStatus({ id, status, notes })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
