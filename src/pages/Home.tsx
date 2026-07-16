import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { useMyPassport, useMyProfile } from "@/hooks/useFanProfile";
import { useUpcomingMatches } from "@/hooks/useMatches";
import { useAllCommunities } from "@/hooks/useCommunity";
import { ArrowRight, Users, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth");
      else setUserId(data.user.id);
    });
  }, []);

  const { data: profile } = useMyProfile(userId);
  const { data: passport } = useMyPassport(userId);
  const { data: matches } = useUpcomingMatches(5);
  const { data: communities } = useAllCommunities();

  useEffect(() => {
    if (profile && !profile.onboarding_completed) navigate("/onboarding");
  }, [profile]);

  const tier = passport?.engagement_tier ?? "Casual";
  const tierColors: Record<string, string> = {
    Casual: "#9CA3AF",
    Active: "#00D4FF",
    Superfan: "#00FF87",
    Legend: "#FFB800",
  };

  return (
    <AppShell coinBalance={passport?.fan_coins_balance ?? 0}>
      <div className="px-4 pt-6 space-y-6 pb-6">
        {/* Welcome */}
        <div>
          <p className="text-white/40 text-sm">Welcome back</p>
          <h1 className="text-2xl font-black text-white">
            {profile?.display_name ?? profile?.username ?? "Fan"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${tierColors[tier]}20`, color: tierColors[tier] }}
            >
              {tier}
            </span>
            <span className="text-xs text-white/30">
              Fan Score: {passport?.identity_score ?? 0}/100
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Earn", emoji: "⚡", path: "/earn", color: "#00FF87" },
            { label: "Predict", emoji: "🎯", path: "/predictions", color: "#00D4FF" },
            { label: "Passport", emoji: "🛡️", path: "/passport", color: "#FFB800" },
          ].map(({ label, emoji, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="p-4 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-semibold" style={{ color }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Upcoming Matches */}
        {matches && matches.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">Upcoming</h2>
              <button onClick={() => navigate("/predictions")} className="text-xs text-[#00FF87] font-medium flex items-center gap-1">
                Predict <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {matches.slice(0, 3).map((match: any) => (
                <div
                  key={match.id}
                  onClick={() => navigate("/predictions")}
                  className="p-4 rounded-2xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/8 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-right">
                      <p className="text-sm font-bold text-white">{match.home_club?.name}</p>
                    </div>
                    <div className="text-center px-3">
                      <p className="text-[10px] text-white/30 font-medium">
                        {new Date(match.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                      <p className="text-xs font-black text-white mt-0.5">VS</p>
                      <p className="text-[10px] text-[#00FF87] mt-0.5">+80 FC</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{match.away_club?.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Communities */}
        {communities && communities.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">Communities</h2>
            </div>
            <div className="space-y-2">
              {communities.slice(0, 4).map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/community/${c.slug}`)}
                  className="w-full p-3.5 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-3 hover:bg-white/8 transition-colors text-left"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                    style={{
                      background: c.clubs?.primary_color ? `${c.clubs.primary_color}30` : "#00FF8720",
                      color: c.clubs?.primary_color ?? "#00FF87",
                    }}
                  >
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    <p className="text-xs text-white/30">
                      <Users size={10} className="inline mr-1" />
                      {c.member_count?.toLocaleString()} members
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-white/20 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
