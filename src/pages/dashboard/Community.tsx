import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Crown,
  Star,
  Award,
  TrendingUp,
  CheckCircle,
  ChevronRight,
  Gift,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReputationTier = "newcomer" | "contributor" | "trusted" | "expert" | "maven";

interface LeaderUser {
  id: string;
  full_name: string | null;
  reputation_score: number;
  reputation_tier: ReputationTier;
}

interface ReputationEvent {
  id: string;
  event_type: string;
  points_delta: number;
  created_at: string;
  reference_type: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_THRESHOLDS: Record<ReputationTier, number> = {
  newcomer: 0,
  contributor: 50,
  trusted: 250,
  expert: 750,
  maven: 2000,
};

const TIER_LABELS: Record<ReputationTier, string> = {
  newcomer: "Newcomer",
  contributor: "Contributor",
  trusted: "Trusted",
  expert: "Expert",
  maven: "Maven",
};

const TIER_ORDER: ReputationTier[] = ["newcomer", "contributor", "trusted", "expert", "maven"];

const EVENT_LABELS: Record<string, string> = {
  rule_submitted: "Submitted a rule",
  rule_verified: "Rule verified",
  rule_confirmed: "Confirmed a rule",
  rule_disputed: "Disputed a rule",
  rule_accepted: "Rule accepted",
  signup: "Joined LoyaltyOne",
  screenshot_upload: "Uploaded screenshot",
  referral: "Referred a friend",
};

const BOUNTIES = [
  {
    merchant: "VOX Cinemas",
    program: "Smiles",
    reward: "20 reputation points",
    description: "Add earn rate rules for VOX Cinemas",
    merchantSlug: "vox-cinemas",
  },
  {
    merchant: "Geant",
    program: "Share by MAF",
    reward: "15 reputation points",
    description: "Verify bulk buy promotions at Geant",
    merchantSlug: "geant",
  },
  {
    merchant: "Union Coop",
    program: "ADCB TouchPoints",
    reward: "20 reputation points",
    description: "Confirm weekend earn rates at Union Coop",
    merchantSlug: "union-coop",
  },
  {
    merchant: "Lulu Hypermarket",
    program: "Etihad Guest",
    reward: "25 reputation points",
    description: "Add multiplier offers at Lulu Hypermarket",
    merchantSlug: "lulu-hypermarket",
  },
  {
    merchant: "Carrefour UAE",
    program: "ADNOC Rewards",
    reward: "20 reputation points",
    description: "Verify cashback rules at Carrefour",
    merchantSlug: "carrefour-uae",
  },
  {
    merchant: "Spinneys",
    program: "Emirates Skywards",
    reward: "15 reputation points",
    description: "Add earn rate for grocery spend",
    merchantSlug: "spinneys",
  },
  {
    merchant: "IKEA UAE",
    program: "Smiles",
    reward: "20 reputation points",
    description: "Confirm earn rates for home products",
    merchantSlug: "ikea-uae",
  },
  {
    merchant: "Dubai Duty Free",
    program: "Emirates Skywards",
    reward: "30 reputation points",
    description: "Add special airport earn rates",
    merchantSlug: "dubai-duty-free",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tierIcon(tier: ReputationTier, size: "sm" | "md" = "md") {
  const cls = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  switch (tier) {
    case "maven": return <Crown className={cn(cls, "text-yellow-500")} />;
    case "expert": return <Star className={cn(cls, "text-blue-500")} />;
    case "trusted": return <CheckCircle className={cn(cls, "text-green-500")} />;
    case "contributor": return <TrendingUp className={cn(cls, "text-orange-500")} />;
    default: return <Zap className={cn(cls, "text-slate-400")} />;
  }
}

function tierColor(tier: ReputationTier): string {
  switch (tier) {
    case "maven": return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "expert": return "bg-blue-50 text-blue-700 border-blue-200";
    case "trusted": return "bg-green-50 text-green-700 border-green-200";
    case "contributor": return "bg-orange-50 text-orange-700 border-orange-200";
    default: return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function nextTier(current: ReputationTier): ReputationTier | null {
  const idx = TIER_ORDER.indexOf(current);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

function progressToNextTier(score: number, current: ReputationTier): number {
  const next = nextTier(current);
  if (!next) return 100;
  const from = TIER_THRESHOLDS[current];
  const to = TIER_THRESHOLDS[next];
  return Math.round(((score - from) / (to - from)) * 100);
}

function pointsToNextTier(score: number, current: ReputationTier): number {
  const next = nextTier(current);
  if (!next) return 0;
  return Math.max(0, TIER_THRESHOLDS[next] - score);
}

function daysAgo(dateStr: string): string {
  const d = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

// ─── Tab 1: Leaderboard ───────────────────────────────────────────────────────

function LeaderboardTab({ currentUserId }: { currentUserId: string | undefined }) {
  const [period, setPeriod] = useState<"month" | "alltime">("month");

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, reputation_score, reputation_tier")
        .order("reputation_score", { ascending: false })
        .limit(10);
      return (data ?? []) as LeaderUser[];
    },
  });

  const PRIZES = [
    { rank: 1, prize: "AED 200 voucher", color: "text-yellow-600" },
    { rank: "2-3", prize: "AED 50 voucher", color: "text-slate-400" },
    { rank: "4-10", prize: "1 month free premium", color: "text-amber-700" },
  ];

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex gap-2">
        {(["month", "alltime"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              period === p
                ? "bg-blue-600 text-white border-blue-600"
                : "border-slate-200 text-slate-600 hover:border-blue-400"
            )}
          >
            {p === "month" ? "This Month" : "All Time"}
          </button>
        ))}
      </div>

      {/* Prizes */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
        <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5" />
          Monthly Prizes
        </p>
        <div className="space-y-1">
          {PRIZES.map((p) => (
            <div key={String(p.rank)} className="flex items-center gap-2 text-xs">
              <span className={cn("font-bold w-8", p.color)}>#{p.rank}</span>
              <span className="text-slate-700">{p.prize}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(leaderboard ?? []).map((user, idx) => {
            const rank = idx + 1;
            const isCurrentUser = user.id === currentUserId;
            const tier = (user.reputation_tier ?? "newcomer") as ReputationTier;

            let rankStyle = "bg-white border-slate-200";
            let rankLabel: React.ReactNode = (
              <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                {rank}
              </span>
            );

            if (rank === 1) {
              rankStyle = "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200";
              rankLabel = (
                <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              );
            } else if (rank === 2) {
              rankStyle = "bg-slate-50 border-slate-300";
              rankLabel = (
                <span className="w-7 h-7 rounded-full bg-slate-400 flex items-center justify-center text-xs font-bold text-white">
                  2
                </span>
              );
            } else if (rank === 3) {
              rankStyle = "bg-orange-50 border-orange-200";
              rankLabel = (
                <span className="w-7 h-7 rounded-full bg-orange-400 flex items-center justify-center text-xs font-bold text-white">
                  3
                </span>
              );
            }

            return (
              <div
                key={user.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                  rankStyle,
                  isCurrentUser && "ring-2 ring-blue-500 ring-offset-1"
                )}
              >
                {rankLabel}
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                  {(user.full_name ?? "A").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {user.full_name ?? "Anonymous"}
                    </span>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {tierIcon(tier, "sm")}
                    <span className="text-xs text-slate-500">{TIER_LABELS[tier]}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {user.reputation_score.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: My Contribution ───────────────────────────────────────────────────

function MyContributionTab({ userId }: { userId: string }) {
  const { data: me, isLoading } = useQuery({
    queryKey: ["my-reputation", userId],
    queryFn: async () => {
      const [userData, events] = await Promise.all([
        supabase
          .from("users")
          .select("reputation_score, reputation_tier, full_name")
          .eq("id", userId)
          .single(),
        supabase
          .from("reputation_events")
          .select("id, event_type, points_delta, created_at, reference_type")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      return {
        user: userData.data,
        events: (events.data ?? []) as ReputationEvent[],
      };
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  const score = me?.user?.reputation_score ?? 0;
  const tier = ((me?.user?.reputation_tier ?? "newcomer") as ReputationTier);
  const next = nextTier(tier);
  const progress = progressToNextTier(score, tier);
  const remaining = pointsToNextTier(score, tier);
  const events = me?.events ?? [];

  return (
    <div className="space-y-5">
      {/* Tier card */}
      <div
        className={cn(
          "rounded-xl border p-5 space-y-4",
          tier === "maven"
            ? "bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-300"
            : tier === "expert"
            ? "bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-300"
            : "bg-white border-slate-200"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center border-2",
              tierColor(tier)
            )}
          >
            {tierIcon(tier)}
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{score.toLocaleString()}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge
                variant="outline"
                className={cn("text-xs font-semibold border", tierColor(tier))}
              >
                {TIER_LABELS[tier]}
              </Badge>
            </div>
          </div>
        </div>

        {next && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{TIER_LABELS[tier]}</span>
              <span>{TIER_LABELS[next]}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-slate-500">
              {remaining} points to reach{" "}
              <span className="font-semibold text-slate-700">{TIER_LABELS[next]}</span>
            </p>
          </div>
        )}

        {tier === "maven" && (
          <p className="text-sm text-yellow-700 font-medium">
            You've reached the highest tier!
          </p>
        )}
      </div>

      {/* Events history */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Activity</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No reputation events yet. Start contributing!
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs",
                      ev.points_delta > 0
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    )}
                  >
                    {ev.points_delta > 0 ? "+" : "−"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                    </p>
                    <p className="text-xs text-slate-400">{daysAgo(ev.created_at)}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-sm font-bold",
                    ev.points_delta > 0 ? "text-green-600" : "text-red-500"
                  )}
                >
                  {ev.points_delta > 0 ? "+" : ""}
                  {ev.points_delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: Bounties ──────────────────────────────────────────────────────────

function BountiesTab() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
        <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2 mb-1">
          <Award className="w-4 h-4" />
          Community Bounties
        </h3>
        <p className="text-xs text-purple-700">
          Complete these tasks to earn bonus reputation points and help the community!
        </p>
      </div>

      <div className="space-y-3">
        {BOUNTIES.map((bounty, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900">{bounty.merchant}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">{bounty.program}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{bounty.description}</p>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] bg-green-50 text-green-700 border-green-200 shrink-0 whitespace-nowrap"
              >
                {bounty.reward}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={() => navigate(`/dashboard/rules/add`)}
            >
              Claim Bounty
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Community() {
  const { user } = useAuth();
  const { language } = useAppContext();

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {language === "ar" ? "المجتمع" : "Community"}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {language === "ar"
            ? "تنافس وساهم مع مجتمع المكافآت"
            : "Compete and contribute with the loyalty community"}
        </p>
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList className="w-full">
          <TabsTrigger value="leaderboard" className="flex-1 text-xs">
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="contribution" className="flex-1 text-xs">
            My Contribution
          </TabsTrigger>
          <TabsTrigger value="bounties" className="flex-1 text-xs">
            Bounties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4">
          <LeaderboardTab currentUserId={user?.id} />
        </TabsContent>

        <TabsContent value="contribution" className="mt-4">
          {user ? (
            <MyContributionTab userId={user.id} />
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              Sign in to see your contributions.
            </p>
          )}
        </TabsContent>

        <TabsContent value="bounties" className="mt-4">
          <BountiesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
