import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { useMyPassport } from "@/hooks/useFanProfile";
import { useGlobalLeaderboard } from "@/hooks/usePredictions";
import { cn } from "@/lib/utils";
import { ArrowLeft, Trophy } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];
const PERIOD_OPTIONS = [
  { id: "all_time", label: "All Time" },
  { id: "monthly", label: "Monthly" },
  { id: "weekly", label: "Weekly" },
];

export default function Leaderboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [period, setPeriod] = useState("all_time");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data: passport } = useMyPassport(userId);
  const { data: leaderboard } = useGlobalLeaderboard(period);

  const top3 = leaderboard?.slice(0, 3) ?? [];
  const rest = leaderboard?.slice(3) ?? [];

  return (
    <AppShell coinBalance={passport?.fan_coins_balance ?? 0}>
      <div className="pb-8">
        <div className="px-4 pt-4 mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/40 text-sm mb-4">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-2xl font-black text-white">Leaderboard</h1>
          <p className="text-white/40 text-sm">Top prediction performers</p>

          {/* Period filter */}
          <div className="flex gap-1 mt-4 p-1 bg-white/5 rounded-xl">
            {PERIOD_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setPeriod(id)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                  period === id ? "bg-[#00FF87] text-[#0A0A0F]" : "text-white/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Podium */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-3 px-6 mb-8">
            {/* 2nd */}
            {top3[1] && (
              <div className="flex flex-col items-center flex-1">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black text-white mb-2">
                  {(top3[1] as any).fan_profiles?.username?.[0]?.toUpperCase()}
                </div>
                <p className="text-xs font-medium text-white/60 truncate max-w-full">
                  {(top3[1] as any).fan_profiles?.username}
                </p>
                <p className="text-sm font-black text-white">{(top3[1] as any).points?.toLocaleString()}pts</p>
                <div className="w-full h-16 bg-white/10 rounded-t-xl mt-2 flex items-center justify-center text-2xl">🥈</div>
              </div>
            )}
            {/* 1st */}
            {top3[0] && (
              <div className="flex flex-col items-center flex-1">
                <div className="w-16 h-16 rounded-2xl bg-[#FFB800]/20 border border-[#FFB800]/30 flex items-center justify-center text-2xl font-black text-[#FFB800] mb-2">
                  {(top3[0] as any).fan_profiles?.username?.[0]?.toUpperCase()}
                </div>
                <p className="text-xs font-medium text-white/60 truncate max-w-full">
                  {(top3[0] as any).fan_profiles?.username}
                </p>
                <p className="text-sm font-black text-[#FFB800]">{(top3[0] as any).points?.toLocaleString()}pts</p>
                <div className="w-full h-24 bg-[#FFB800]/20 rounded-t-xl mt-2 flex items-center justify-center text-3xl">🥇</div>
              </div>
            )}
            {/* 3rd */}
            {top3[2] && (
              <div className="flex flex-col items-center flex-1">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black text-white mb-2">
                  {(top3[2] as any).fan_profiles?.username?.[0]?.toUpperCase()}
                </div>
                <p className="text-xs font-medium text-white/60 truncate max-w-full">
                  {(top3[2] as any).fan_profiles?.username}
                </p>
                <p className="text-sm font-black text-white">{(top3[2] as any).points?.toLocaleString()}pts</p>
                <div className="w-full h-10 bg-white/10 rounded-t-xl mt-2 flex items-center justify-center text-2xl">🥉</div>
              </div>
            )}
          </div>
        )}

        {/* Rest of leaderboard */}
        <div className="px-4 space-y-2">
          {rest.map((entry: any, i) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                entry.fan_id === userId
                  ? "border-[#00FF87]/30 bg-[#00FF87]/5"
                  : "border-white/10 bg-white/5"
              )}
            >
              <span className="text-xs text-white/30 w-6 text-center font-bold">#{i + 4}</span>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                {entry.fan_profiles?.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{entry.fan_profiles?.username}</p>
                <p className="text-xs text-white/30">{entry.accuracy}% accuracy</p>
              </div>
              <p className="text-sm font-black text-white">{entry.points?.toLocaleString()}pts</p>
            </div>
          ))}

          {leaderboard?.length === 0 && (
            <div className="text-center py-12 text-white/30">
              <Trophy size={32} className="mx-auto mb-3 opacity-40" />
              <p>No rankings yet</p>
              <p className="text-xs mt-1">Make predictions to appear here</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
