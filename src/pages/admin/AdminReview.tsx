import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-review-queue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_review_queue")
        .select("*")
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, recordId }: { id: string; status: "approved" | "rejected"; recordId?: string }) => {
      const { error } = await supabase
        .from("admin_review_queue")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      // If approving a merchant_rule, set it to verified
      if (status === "approved" && recordId) {
        await supabase
          .from("merchant_rules")
          .update({ status: "verified" })
          .eq("id", recordId)
          .eq("status", "pending");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-review-queue"] });
      toast.success("Review submitted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const pending = (items ?? []).filter((i: any) => i.status === "pending");
  const reviewed = (items ?? []).filter((i: any) => i.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Review Queue</h1>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-700">
            {pending.length} pending
          </span>
        </div>
      </div>

      {/* Pending items */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Pending Review</h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-slate-600 font-medium">All caught up!</p>
            <p className="text-sm text-slate-400">No items pending review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((item: any) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.action_type} — {item.table_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Record: {item.record_id}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg px-2 py-1">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                    pending
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 mb-3">
                  {new Date(item.created_at).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      reviewMutation.mutate({ id: item.id, status: "approved", recordId: item.record_id })
                    }
                    className="flex-1 bg-green-600 hover:bg-green-700 gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      reviewMutation.mutate({ id: item.id, status: "rejected", recordId: item.record_id })
                    }
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviewed items */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Recently Reviewed
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {reviewed.slice(0, 10).map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <Badge
                  className={`text-xs border-0 ${STATUS_COLORS[item.status] ?? ""}`}
                >
                  {item.status}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {item.action_type} — {item.table_name}
                  </p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">
                  {item.reviewed_at
                    ? new Date(item.reviewed_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
