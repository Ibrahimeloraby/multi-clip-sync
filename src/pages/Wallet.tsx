import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { useMyRewards, useMyTransactions, useActivePrizes, useMyPrizeClaims, useClaimPrize } from "@/hooks/useRewards";
import { useMyPassport } from "@/hooks/useFanProfile";
import { cn } from "@/lib/utils";
import { ShoppingBag, Clock, Ticket } from "lucide-react";

const CATEGORY_FILTERS = ["All", "experience", "merchandise", "gift_card"];
const CATEGORY_EMOJIS: Record<string, string> = {
  experience: "🏟️",
  merchandise: "👕",
  gift_card: "🎁",
  cash: "💷",
};

export default function Wallet() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [tab, setTab] = useState<"prizes" | "history">("prizes");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth");
      else setUserId(data.user.id);
    });
  }, []);

  const { data: passport } = useMyPassport(userId);
  const { data: rewards } = useMyRewards(userId);
  const { data: transactions } = useMyTransactions(userId);
  const { data: prizes } = useActivePrizes();
  const { data: claims } = useMyPrizeClaims(userId);
  const claimPrize = useClaimPrize();

  const balance = passport?.fan_coins_balance ?? 0;
  const filteredPrizes = prizes?.filter(
    (p) => categoryFilter === "All" || p.category === categoryFilter
  );

  const handleClaim = async (prize: any) => {
    if (!userId) return navigate("/auth");
    if (balance < prize.coins_cost) return;
    await claimPrize.mutateAsync({ prizeId: prize.id, fanId: userId, coinsCost: prize.coins_cost });
  };

  return (
    <AppShell coinBalance={balance}>
      <div className="px-4 pt-6 pb-8">
        {/* Balance hero */}
        <div className="text-center py-8 px-4 rounded-3xl border border-[#00FF87]/20 bg-[#00FF87]/5 mb-6">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">FanCoin Balance</p>
          <p className="text-5xl font-black text-[#00FF87]">{balance.toLocaleString()}</p>
          <p className="text-sm text-white/30 mt-1">≈ £{(balance * 0.005).toFixed(2)} value</p>

          <div className="flex justify-center gap-6 mt-4 text-xs">
            <div>
              <p className="text-white/40">Earned</p>
              <p className="font-bold text-white">{rewards?.total_earned?.toLocaleString() ?? 0} FC</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-white/40">Spent</p>
              <p className="font-bold text-white">{rewards?.total_spent?.toLocaleString() ?? 0} FC</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-white/40">Tier</p>
              <p className="font-bold text-[#00FF87]">{rewards?.lifetime_tier ?? "bronze"}</p>
            </div>
          </div>
        </div>

        {/* Cashout note */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/40 mb-6 flex items-center gap-2">
          <span>💷</span>
          <span>Minimum 2,500 FC to cash out · 1 FC = £0.005</span>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-4">
          {(["prizes", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize",
                tab === t ? "bg-[#00FF87] text-[#0A0A0F]" : "text-white/40"
              )}
            >
              {t === "prizes" ? "Prize Store" : "History"}
            </button>
          ))}
        </div>

        {tab === "prizes" && (
          <>
            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setCategoryFilter(f)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border font-medium whitespace-nowrap transition-colors",
                    categoryFilter === f
                      ? "border-[#00FF87]/50 bg-[#00FF87]/15 text-[#00FF87]"
                      : "border-white/10 text-white/40 hover:border-white/20"
                  )}
                >
                  {f === "All" ? "All" : `${CATEGORY_EMOJIS[f]} ${f.replace("_", " ")}`}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredPrizes?.map((prize) => {
                const canAfford = balance >= prize.coins_cost;
                const alreadyClaimed = claims?.some((c) => c.prize_id === prize.id && c.status !== "expired");
                return (
                  <div
                    key={prize.id}
                    className={cn(
                      "p-4 rounded-2xl border",
                      canAfford ? "border-white/10 bg-white/5" : "border-white/5 bg-white/3 opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl shrink-0">
                        {CATEGORY_EMOJIS[prize.category]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{prize.name}</p>
                        <p className="text-xs text-white/40 mt-0.5">{prize.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-black text-[#00FF87]">
                            {prize.coins_cost.toLocaleString()} FC
                          </span>
                          {prize.stock > 0 && (
                            <span className="text-xs text-white/30">{prize.stock} left</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleClaim(prize)}
                      disabled={!canAfford || !!alreadyClaimed || claimPrize.isPending}
                      className={cn(
                        "w-full mt-3 py-2.5 rounded-xl text-sm font-bold transition-colors",
                        alreadyClaimed
                          ? "bg-white/10 text-white/40 cursor-not-allowed"
                          : canAfford
                          ? "bg-[#00FF87] text-[#0A0A0F] hover:bg-[#00FF87]/90"
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                      )}
                    >
                      {alreadyClaimed ? "✓ Claimed" : canAfford ? "Claim Reward" : `Need ${(prize.coins_cost - balance).toLocaleString()} more FC`}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "history" && (
          <div className="space-y-2">
            {transactions && transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0",
                    tx.type === "earn" || tx.type === "bonus" ? "bg-[#00FF87]/20" : "bg-red-500/20"
                  )}>
                    {tx.type === "earn" || tx.type === "bonus" ? "+" : "-"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{tx.description || tx.source}</p>
                    <p className="text-xs text-white/30">
                      {new Date(tx.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <span className={cn(
                    "text-sm font-bold",
                    tx.type === "earn" || tx.type === "bonus" ? "text-[#00FF87]" : "text-red-400"
                  )}>
                    {tx.type === "earn" || tx.type === "bonus" ? "+" : "-"}{Math.abs(tx.amount)} FC
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-white/30">
                <Clock size={32} className="mx-auto mb-3 opacity-40" />
                <p>No transactions yet</p>
                <p className="text-xs mt-1">Complete tasks to earn FanCoins</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
