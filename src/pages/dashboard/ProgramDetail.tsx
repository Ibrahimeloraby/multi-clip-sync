import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  RefreshCw,
  ChevronRight,
  Edit2,
} from "lucide-react";

interface Program {
  id: string;
  slug: string;
  display_name_en: string;
  display_name_ar: string;
  logo_url: string | null;
  category: string;
  default_earn_rate_aed: number;
  default_redemption_value_aed: number;
  expiry_rule: any;
  transfer_partners: any[];
  official_url: string | null;
}

interface UserProgram {
  id: string;
  user_id: string;
  program_id: string;
  current_balance: number;
  tier_name: string | null;
  expiry_dates: Array<{ amount: number; expires_at: string; redemption_notes?: string }>;
  tracking_method: string;
  forwarding_address: string | null;
  last_updated_at: string;
  program?: Program;
}

const TIER_PROGRESS: Record<string, number> = {
  silver: 25,
  gold: 50,
  platinum: 75,
  elite: 90,
  blue: 10,
  bronze: 20,
};

const GRADIENT_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-500",
  "from-green-500 to-teal-500",
  "from-orange-500 to-red-500",
];

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function expiryColor(days: number): string {
  if (days <= 7) return "text-red-600";
  if (days <= 14) return "text-orange-500";
  return "text-amber-500";
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, isRTL } = useAppContext();
  const queryClient = useQueryClient();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [newBalance, setNewBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: userProgram, isLoading } = useQuery<UserProgram>({
    queryKey: ["user-program-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_programs")
        .select("*, program:programs(*)")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user && !!id,
  });

  const { data: rules } = useQuery({
    queryKey: ["program-rules", userProgram?.program_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_rules")
        .select("*, merchant:merchants(display_name_en, display_name_ar, logo_url)")
        .eq("program_id", userProgram!.program_id)
        .in("status", ["trusted", "verified"])
        .order("confidence_score", { ascending: false })
        .limit(5);
      return (data as any[]) ?? [];
    },
    enabled: !!userProgram?.program_id,
  });

  const { data: transactions } = useQuery({
    queryKey: ["program-transactions", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleUpdateBalance = async () => {
    if (!userProgram || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_programs")
        .update({
          current_balance: parseFloat(newBalance) || 0,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", userProgram.id);
      if (error) throw error;
      toast.success("Balance updated!");
      queryClient.invalidateQueries({ queryKey: ["user-program-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["user-programs"] });
      setUpdateOpen(false);
      setNewBalance("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update balance");
    } finally {
      setSaving(false);
    }
  };

  const t = {
    en: {
      back: "Back",
      officialSite: "Official site",
      totalBalance: "Total Balance",
      aedValue: "AED value",
      tier: "Tier",
      nextTier: "Progress to next tier",
      expiringSoon: "Expiring Soon",
      expiresIn: (d: number) => `Expires in ${d} day${d !== 1 ? "s" : ""}`,
      redeemHint: "Redeem hint",
      updateBalance: "Update Balance",
      recentTx: "Recent Transactions",
      noTx: "No transactions yet",
      activeRules: "Active rules at merchants",
      tracking: "Tracking method",
      changeTracking: "Change",
      manualLabel: "Manual",
      emailLabel: "Email forwarding",
      screenshotLabel: "Screenshot",
      noRules: "No verified rules yet",
      noExpiry: "No expiring tranches",
      save: "Save",
      enterNewBalance: "Enter new balance",
    },
    ar: {
      back: "رجوع",
      officialSite: "الموقع الرسمي",
      totalBalance: "الرصيد الإجمالي",
      aedValue: "القيمة بالدرهم",
      tier: "المستوى",
      nextTier: "التقدم نحو المستوى التالي",
      expiringSoon: "تنتهي قريباً",
      expiresIn: (d: number) => `تنتهي خلال ${d} ${d === 1 ? "يوم" : "أيام"}`,
      redeemHint: "تلميح الاستبدال",
      updateBalance: "تحديث الرصيد",
      recentTx: "المعاملات الأخيرة",
      noTx: "لا توجد معاملات بعد",
      activeRules: "القواعد الفعّالة لدى التجار",
      tracking: "طريقة التتبع",
      changeTracking: "تغيير",
      manualLabel: "يدوي",
      emailLabel: "توجيه البريد",
      screenshotLabel: "لقطة شاشة",
      noRules: "لا توجد قواعد موثّقة بعد",
      noExpiry: "لا توجد نقاط على وشك الانتهاء",
      save: "حفظ",
      enterNewBalance: "أدخل الرصيد الجديد",
    },
  };

  const copy = t[language];

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  if (!userProgram) {
    return (
      <div className="p-4 text-center text-slate-500">Program not found.</div>
    );
  }

  const prog = userProgram.program;
  const name = prog
    ? isRTL
      ? prog.display_name_ar
      : prog.display_name_en
    : "Unknown";
  const initials = (prog?.display_name_en ?? "??")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const gradient = GRADIENT_COLORS[userProgram.program_id.charCodeAt(0) % GRADIENT_COLORS.length];
  const redemptionRate = prog?.default_redemption_value_aed ?? 0.01;
  const aedValue = userProgram.current_balance * redemptionRate;
  const tierProgress =
    TIER_PROGRESS[userProgram.tier_name?.toLowerCase() ?? ""] ?? 0;

  const expiryDates = Array.isArray(userProgram.expiry_dates)
    ? (userProgram.expiry_dates as any[])
    : [];

  const trackingMethodMap: Record<string, string> = {
    manual: copy.manualLabel,
    email: copy.emailLabel,
    screenshot: copy.screenshotLabel,
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex flex-col min-h-screen bg-slate-50 pb-20"
    >
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 rtl:rotate-180" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-slate-900 truncate">{name}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Program hero */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 flex items-center gap-4">
          {prog?.logo_url ? (
            <img
              src={prog.logo_url}
              alt={name}
              className="w-16 h-16 rounded-2xl object-contain border border-slate-100 flex-shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-900 text-lg truncate">{name}</h2>
            <Badge className="text-[10px] px-1.5 py-0 border-0 bg-slate-100 text-slate-600 capitalize mt-1">
              {prog?.category}
            </Badge>
          </div>
          {prog?.official_url && (
            <a
              href={prog.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {copy.officialSite}
            </a>
          )}
        </div>

        {/* Balance card */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-2xl p-5 text-white">
          <p className="text-blue-200 text-sm mb-1">{copy.totalBalance}</p>
          <p className="text-4xl font-bold mb-1">
            {userProgram.current_balance.toLocaleString()}
            <span className="text-lg font-normal text-blue-300 ms-1">pts</span>
          </p>
          <p className="text-blue-200 text-sm">
            {copy.aedValue}: AED {aedValue.toFixed(2)}
          </p>

          {userProgram.tier_name && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-blue-200">
                  {copy.tier}: {userProgram.tier_name}
                </span>
                <span className="text-xs text-blue-200">{tierProgress}%</span>
              </div>
              <Progress
                value={tierProgress}
                className="h-1.5 bg-blue-600/40"
              />
              <p className="text-[10px] text-blue-300 mt-1">{copy.nextTier}</p>
            </div>
          )}

          <Button
            onClick={() => {
              setNewBalance(String(userProgram.current_balance));
              setUpdateOpen(true);
            }}
            variant="outline"
            size="sm"
            className="mt-4 border-white/30 text-white hover:bg-white/10 rounded-xl gap-1"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {copy.updateBalance}
          </Button>
        </div>

        {/* Expiring tranches */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            {copy.expiringSoon}
          </h3>
          {expiryDates.length === 0 ? (
            <p className="text-xs text-slate-400">{copy.noExpiry}</p>
          ) : (
            <div className="space-y-2">
              {expiryDates.map((tranche: any, i: number) => {
                const days = daysUntil(tranche.expires_at);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {tranche.amount.toLocaleString()} pts
                      </p>
                      {tranche.redemption_notes && (
                        <p className="text-xs text-slate-500">
                          {copy.redeemHint}: {tranche.redemption_notes}
                        </p>
                      )}
                    </div>
                    <div className="text-end">
                      <p className={`text-xs font-semibold ${expiryColor(days)}`}>
                        {copy.expiresIn(days)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(tranche.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active rules */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            {copy.activeRules}
          </h3>
          {(rules?.length ?? 0) === 0 ? (
            <p className="text-xs text-slate-400">{copy.noRules}</p>
          ) : (
            <div className="space-y-2">
              {rules!.map((rule: any) => {
                const merchantName = isRTL
                  ? rule.merchant?.display_name_ar
                  : rule.merchant?.display_name_en;
                return (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {merchantName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {rule.description_text ?? rule.rule_type}
                      </p>
                    </div>
                    {rule.earn_rate && (
                      <Badge className="bg-green-50 text-green-700 border-0 text-[10px]">
                        {rule.earn_rate}x
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            {copy.recentTx}
          </h3>
          {(transactions?.length ?? 0) === 0 ? (
            <p className="text-xs text-slate-400">{copy.noTx}</p>
          ) : (
            <div className="space-y-2">
              {transactions!.slice(0, 5).map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-800">
                      AED {tx.amount_aed.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {tx.points_earned && (
                    <span className="text-xs font-semibold text-green-600">
                      +{tx.points_earned} pts
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tracking method */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">{copy.tracking}</p>
              <p className="text-sm font-semibold text-slate-900">
                {trackingMethodMap[userProgram.tracking_method] ?? userProgram.tracking_method}
              </p>
              {userProgram.forwarding_address && (
                <p className="text-xs font-mono text-blue-600 mt-0.5 break-all">
                  {userProgram.forwarding_address}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate("/dashboard/email-setup")}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              {copy.changeTracking}
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Update balance dialog */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{copy.updateBalance}</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-sm font-medium mb-1.5 block text-slate-700">
              {copy.enterNewBalance}
            </Label>
            <Input
              type="number"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="rounded-xl h-12"
              placeholder="e.g. 15000"
            />
          </div>
          <Button
            onClick={handleUpdateBalance}
            disabled={saving}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold"
          >
            {saving ? "Saving..." : copy.save}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
