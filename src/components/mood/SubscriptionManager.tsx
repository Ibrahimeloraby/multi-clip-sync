import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORMS } from "@/lib/platforms";
import type { PlatformSubscription } from "@/agent/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Bell, CreditCard, AlertTriangle, CheckCircle2, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatCurrency(amount?: number, currency = "USD"): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

interface AddSubDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (sub: Omit<PlatformSubscription, "id">) => Promise<void>;
}

function AddSubDialog({ open, onClose, onSave }: AddSubDialogProps) {
  const [platformId, setPlatformId] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [renewalDate, setRenewalDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [notifyDays, setNotifyDays] = useState("3");
  const [saving, setSaving] = useState(false);

  const platform = PLATFORMS.find((p) => p.id === platformId);

  const handleSave = async () => {
    if (!platformId || !renewalDate) return;
    setSaving(true);
    try {
      await onSave({
        platform_id: platformId,
        platform_name: platform?.name ?? platformId,
        billing_cycle: billingCycle,
        amount: amount ? parseFloat(amount) : undefined,
        currency,
        next_renewal_date: renewalDate,
        auto_renew: autoRenew,
        notify_days_before: parseInt(notifyDays) || 3,
        status: "active",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Subscription</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-sm">Platform</Label>
            <Select value={platformId} onValueChange={setPlatformId}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform..." />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Billing</Label>
              <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["USD", "AED", "SAR", "GBP", "EUR", "EGP"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Amount (optional)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Next renewal date</Label>
              <Input
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <div className="text-sm font-medium">Auto-renew notification</div>
              <div className="text-xs text-muted-foreground">Notify {notifyDays} days before</div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="30"
                className="w-14 h-8 text-center text-sm"
                value={notifyDays}
                onChange={(e) => setNotifyDays(e.target.value)}
              />
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={!platformId || !renewalDate || saving} className="w-full">
            {saving ? "Saving..." : "Add Subscription"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SubscriptionManagerProps {
  userId?: string;
}

export default function SubscriptionManager({ userId }: SubscriptionManagerProps) {
  const [subs, setSubs] = useState<PlatformSubscription[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from("platform_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("next_renewal_date", { ascending: true })
      .then(({ data }) => {
        setSubs((data ?? []) as PlatformSubscription[]);
        setLoading(false);
      });
  }, [userId]);

  const handleAdd = async (sub: Omit<PlatformSubscription, "id">) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("platform_subscriptions")
      .upsert({ user_id: userId, ...sub })
      .select()
      .single();
    if (error) { toast.error("Failed to save subscription"); return; }
    setSubs((prev) => {
      const idx = prev.findIndex((s) => s.platform_id === sub.platform_id);
      if (idx >= 0) { const next = [...prev]; next[idx] = data as PlatformSubscription; return next; }
      return [...prev, data as PlatformSubscription];
    });
    toast.success("Subscription saved!");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("platform_subscriptions").delete().eq("id", id);
    setSubs((prev) => prev.filter((s) => s.id !== id));
    toast.success("Subscription removed");
  };

  const totalMonthly = subs
    .filter((s) => s.status === "active" && s.amount)
    .reduce((acc, s) => acc + (s.billing_cycle === "yearly" ? (s.amount! / 12) : s.amount!), 0);

  const upcomingRenewals = subs.filter((s) => {
    const days = daysUntil(s.next_renewal_date);
    return days !== null && days <= (s.notify_days_before ?? 3) && days >= 0 && s.status === "active";
  });

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Subscriptions</h2>
        <p className="text-sm text-muted-foreground">
          Track your streaming costs and renewal dates in one place.
        </p>
      </div>

      {/* Summary card */}
      {subs.filter(s => s.status === "active").length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Est. monthly spend</div>
              <div className="text-2xl font-bold">{formatCurrency(totalMonthly)}</div>
            </div>
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{subs.filter(s => s.status === "active").length} active</Badge>
            {upcomingRenewals.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {upcomingRenewals.length} renewing soon
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Upcoming renewals alert */}
      {upcomingRenewals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-yellow-500">
            <Bell className="w-4 h-4" />
            Renewing Soon
          </div>
          {upcomingRenewals.map((sub) => {
            const days = daysUntil(sub.next_renewal_date);
            const platform = PLATFORMS.find((p) => p.id === sub.platform_id);
            return (
              <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <span className="text-xl">{platform?.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{sub.platform_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Renews in {days} day{days !== 1 ? "s" : ""} · {formatCurrency(sub.amount, sub.currency)}
                  </div>
                </div>
                {sub.auto_renew ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Subscriptions list */}
      <div className="space-y-2">
        {subs.map((sub) => {
          const platform = PLATFORMS.find((p) => p.id === sub.platform_id);
          const days = daysUntil(sub.next_renewal_date);
          return (
            <div
              key={sub.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                sub.status === "cancelled" ? "opacity-50" : ""
              )}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: (platform?.color ?? "#888") + "20" }}
              >
                {platform?.emoji ?? "📺"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{sub.platform_name}</span>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] py-0 px-1.5", sub.status === "active" ? "text-green-500 border-green-500/30" : "text-muted-foreground")}
                  >
                    {sub.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {sub.amount && <span>{formatCurrency(sub.amount, sub.currency)}/{sub.billing_cycle === "yearly" ? "yr" : "mo"}</span>}
                  {days !== null && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {days > 0 ? `Renews in ${days}d` : days === 0 ? "Renews today" : `Expired ${Math.abs(days)}d ago`}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(sub.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {!loading && subs.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="text-sm">No subscriptions tracked yet</div>
          <div className="text-xs mt-1">Add your streaming services to track renewals</div>
        </div>
      )}

      <Button onClick={() => setShowAdd(true)} className="w-full gap-2" variant="outline">
        <Plus className="w-4 h-4" />
        Add Subscription
      </Button>

      <AddSubDialog open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
    </div>
  );
}
