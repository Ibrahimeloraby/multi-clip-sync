import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { useMyPassport } from "@/hooks/useFanProfile";
import { useUpcomingMatches, useMatches } from "@/hooks/useMatches";
import { useMyPredictions, useSubmitPrediction } from "@/hooks/usePredictions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";

const CONFIDENCE_OPTIONS = [
  { id: "banker", label: "Banker 🔒", desc: "Dead certain" },
  { id: "feeling_it", label: "Feeling It 🤞", desc: "Good hunch" },
  { id: "hope_for_best", label: "Hope 🙏", desc: "Worth a shot" },
];

export default function Predictions() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [tab, setTab] = useState<"upcoming" | "mine">("upcoming");
  const [activeMatch, setActiveMatch] = useState<any | null>(null);
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(1);
  const [confidence, setConfidence] = useState("feeling_it");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth");
      else setUserId(data.user.id);
    });
  }, []);

  const { data: passport } = useMyPassport(userId);
  const { data: upcoming } = useUpcomingMatches(10);
  const { data: myPredictions } = useMyPredictions(userId);
  const submitPrediction = useSubmitPrediction();

  const handleSubmit = async () => {
    if (!userId || !activeMatch) return;
    await submitPrediction.mutateAsync({
      fan_id: userId,
      match_id: activeMatch.id,
      home_score_prediction: homeScore,
      away_score_prediction: awayScore,
      confidence,
    });
    toast.success("Prediction saved! +80 FC earned ⚡");
    setActiveMatch(null);
  };

  return (
    <AppShell coinBalance={passport?.fan_coins_balance ?? 0}>
      <div className="px-4 pt-6 pb-8">
        <h1 className="text-2xl font-black text-white mb-1">Predictions</h1>
        <p className="text-white/40 text-sm mb-4">Earn +80 FC per match prediction</p>

        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-4">
          {(["upcoming", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                tab === t ? "bg-[#00FF87] text-[#0A0A0F]" : "text-white/40"
              )}
            >
              {t === "upcoming" ? "Upcoming" : "My Picks"}
            </button>
          ))}
        </div>

        {tab === "upcoming" && (
          <div className="space-y-3">
            {upcoming?.map((match: any) => (
              <div
                key={match.id}
                onClick={() => { setActiveMatch(match); setHomeScore(1); setAwayScore(1); }}
                className="p-4 rounded-2xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/8 transition-colors"
              >
                <p className="text-[10px] text-white/30 mb-3">
                  {match.competition?.name} · {new Date(match.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <div className="flex items-center gap-3">
                  <p className="flex-1 text-right font-bold text-white">{match.home_club?.name}</p>
                  <span className="text-white/20 font-black text-lg">VS</span>
                  <p className="flex-1 font-bold text-white">{match.away_club?.name}</p>
                </div>
                <div className="flex justify-center mt-3">
                  <span className="text-xs text-[#00FF87] bg-[#00FF87]/10 px-3 py-1 rounded-full font-medium">
                    Tap to predict · +80 FC
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "mine" && (
          <div className="space-y-3">
            {myPredictions?.length === 0 && (
              <div className="text-center py-12 text-white/30">
                <p>No predictions yet</p>
                <p className="text-xs mt-1">Pick upcoming matches to earn FC</p>
              </div>
            )}
            {myPredictions?.map((p: any) => (
              <div key={p.id} className="p-4 rounded-2xl border border-white/10 bg-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <p className="flex-1 text-right text-sm font-bold text-white">{p.matches?.home_club?.name}</p>
                  <span className="text-white font-black text-lg px-2">
                    {p.home_score_prediction}–{p.away_score_prediction}
                  </span>
                  <p className="flex-1 text-sm font-bold text-white">{p.matches?.away_club?.name}</p>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 capitalize">{p.confidence?.replace("_", " ")}</span>
                  {p.is_correct === true && <span className="text-[#00FF87] font-bold">✓ Correct! +{p.points_awarded}pts</span>}
                  {p.is_correct === false && <span className="text-red-400">✗ Wrong</span>}
                  {p.is_correct === null && <span className="text-white/30">Pending</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Score picker modal */}
      {activeMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-[#0F0F1A] rounded-t-3xl p-6 border-t border-white/10">
            <h3 className="text-lg font-black text-white text-center mb-1">
              {activeMatch.home_club?.name} vs {activeMatch.away_club?.name}
            </h3>
            <p className="text-xs text-white/30 text-center mb-6">Set your score prediction</p>

            {/* Score inputs */}
            <div className="flex items-center justify-center gap-6 mb-6">
              {[
                { label: activeMatch.home_club?.name, score: homeScore, setScore: setHomeScore },
                { label: activeMatch.away_club?.name, score: awayScore, setScore: setAwayScore },
              ].map(({ label, score, setScore }, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <p className="text-xs text-white/40 text-center max-w-[80px] truncate">{label}</p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setScore(Math.max(0, score - 1))} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                      <Minus size={16} className="text-white" />
                    </button>
                    <span className="text-4xl font-black text-white w-8 text-center">{score}</span>
                    <button onClick={() => setScore(score + 1)} className="w-9 h-9 rounded-full bg-[#00FF87]/20 flex items-center justify-center hover:bg-[#00FF87]/30 transition-colors">
                      <Plus size={16} className="text-[#00FF87]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Confidence */}
            <div className="space-y-2 mb-6">
              <p className="text-xs text-white/40 mb-2">Confidence level</p>
              {CONFIDENCE_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setConfidence(c.id)}
                  className={cn(
                    "w-full py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-between transition-all",
                    confidence === c.id
                      ? "border-[#00FF87]/60 bg-[#00FF87]/10 text-[#00FF87]"
                      : "border-white/10 text-white/50"
                  )}
                >
                  <span>{c.label}</span>
                  <span className="text-xs opacity-60">{c.desc}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setActiveMatch(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitPrediction.isPending}
                className="flex-1 py-3 rounded-xl bg-[#00FF87] text-[#0A0A0F] text-sm font-bold disabled:opacity-50"
              >
                {submitPrediction.isPending ? "..." : "Submit +80 FC"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
