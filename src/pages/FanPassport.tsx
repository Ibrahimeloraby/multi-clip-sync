import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { useMyProfile, useMyPassport, useMyFollowedClubs, useMyCollectibles } from "@/hooks/useFanProfile";
import { cn } from "@/lib/utils";
import { Shield, Star, Trophy, MessageSquare } from "lucide-react";

const TIER_CONFIG: Record<string, { color: string; next: string; nextCoins: number }> = {
  Casual:   { color: "#9CA3AF", next: "Active",   nextCoins: 500 },
  Active:   { color: "#00D4FF", next: "Superfan", nextCoins: 3000 },
  Superfan: { color: "#00FF87", next: "Legend",   nextCoins: 10000 },
  Legend:   { color: "#FFB800", next: "",          nextCoins: 0 },
};

export default function FanPassport() {
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
  const { data: followedClubs } = useMyFollowedClubs(userId);
  const { data: collectibles } = useMyCollectibles(userId);

  const tier = passport?.engagement_tier ?? "Casual";
  const tierConf = TIER_CONFIG[tier];
  const accuracy = passport?.total_predictions
    ? Math.round((passport.correct_predictions / passport.total_predictions) * 100)
    : 0;

  const progressPct = tierConf.nextCoins > 0
    ? Math.min(((passport?.fan_coins_earned ?? 0) / tierConf.nextCoins) * 100, 100)
    : 100;

  const primaryClub = followedClubs?.find((fc: any) => fc.is_primary);
  const clubColor = primaryClub?.clubs?.primary_color ?? "#00FF87";

  return (
    <AppShell coinBalance={passport?.fan_coins_balance ?? 0}>
      <div className="px-4 pt-6 pb-8 space-y-6">
        {/* Passport card */}
        <div
          className="relative rounded-3xl overflow-hidden p-6"
          style={{
            background: `linear-gradient(135deg, #0F0F1A 0%, ${clubColor}18 100%)`,
            border: `1px solid ${clubColor}30`,
          }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent -skew-x-12 pointer-events-none" />

          {/* Top row */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">FanZone Passport</p>
              <h2 className="text-xl font-black text-white">
                {profile?.display_name ?? profile?.username ?? "Fan"}
              </h2>
              {primaryClub && (
                <p className="text-sm font-medium mt-0.5" style={{ color: clubColor }}>
                  {primaryClub.clubs?.name}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Shield size={28} style={{ color: tierConf.color }} />
              <span className="text-xs font-bold" style={{ color: tierConf.color }}>{tier}</span>
            </div>
          </div>

          {/* Identity score */}
          <div className="mb-6">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-white/40">Fan Identity Score</span>
              <span className="font-bold" style={{ color: clubColor }}>{passport?.identity_score ?? 0}/100</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${passport?.identity_score ?? 0}%`, background: clubColor }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Trophy, label: "Predictions", value: passport?.total_predictions ?? 0 },
              { icon: Star, label: "Accuracy", value: `${accuracy}%` },
              { icon: MessageSquare, label: "Posts", value: passport?.posts_created ?? 0 },
              { icon: Shield, label: "Communities", value: passport?.communities_joined ?? 0 },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3">
                <Icon size={14} className="text-white/30 mb-1" />
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-[10px] text-white/40">{label}</p>
              </div>
            ))}
          </div>

          {/* Commercial value teaser */}
          <div className="mt-4 p-3 rounded-xl bg-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Commercial Value</p>
              <p className="text-lg font-black text-[#00FF87]">£1,400/yr</p>
            </div>
            <p className="text-[10px] text-white/20">Your fandom estimate</p>
          </div>
        </div>

        {/* Tier progress */}
        {tierConf.nextCoins > 0 && (
          <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/40">Progress to {tierConf.next}</span>
              <span className="font-bold text-white">{passport?.fan_coins_earned?.toLocaleString() ?? 0} / {tierConf.nextCoins.toLocaleString()} FC</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: tierConf.color }}
              />
            </div>
          </div>
        )}

        {/* My clubs */}
        {followedClubs && followedClubs.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">My Clubs</h3>
            <div className="flex gap-2 flex-wrap">
              {followedClubs.map((fc: any) => (
                <button
                  key={fc.id}
                  onClick={() => navigate(`/clubs/${fc.clubs?.slug}`)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors",
                    fc.is_primary ? "border-[#00FF87]/40 bg-[#00FF87]/10" : "border-white/10 bg-white/5"
                  )}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black"
                    style={{ background: fc.clubs?.primary_color, color: fc.clubs?.secondary_color }}
                  >
                    {fc.clubs?.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-white">{fc.clubs?.name}</span>
                  {fc.is_primary && <span className="text-[10px] text-[#00FF87]">★</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Collectibles */}
        {collectibles && collectibles.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Collectibles</h3>
            <div className="grid grid-cols-3 gap-2">
              {collectibles.slice(0, 6).map((c: any) => (
                <div key={c.id} className="aspect-square rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-2">
                  <span className="text-2xl">🏆</span>
                  <p className="text-[10px] text-white/40 mt-1 text-center">{c.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fan personality */}
        {profile?.fan_personality_type && (
          <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
            <p className="text-xs text-white/40 mb-1">Fan Personality</p>
            <p className="text-sm font-bold text-white capitalize">
              {profile.fan_personality_type.replace("_", " ")}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
