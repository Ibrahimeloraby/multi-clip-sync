import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { useMyPassport, useMyFollowedClubs } from "@/hooks/useFanProfile";
import { useClubBySlug } from "@/hooks/useClubs";
import { useAthletes } from "@/hooks/useClubs";
import { useCommunitiesForClub } from "@/hooks/useCommunity";
import { useClubMatches } from "@/hooks/useMatches";
import { useFollowClub } from "@/hooks/useClubs";
import { ArrowLeft, Users, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClubProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<"matches" | "squad" | "communities">("matches");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { data: passport } = useMyPassport(userId);
  const { data: club } = useClubBySlug(slug);
  const { data: athletes } = useAthletes(club?.id);
  const { data: communities } = useCommunitiesForClub(club?.id);
  const { data: matches } = useClubMatches(club?.id);
  const { data: followedClubs } = useMyFollowedClubs(userId);
  const followClub = useFollowClub();

  const isFollowing = followedClubs?.some((fc: any) => fc.club_id === club?.id);
  const primary = club?.primary_color ?? "#00FF87";
  const secondary = club?.secondary_color ?? "#FFFFFF";

  const handleFollow = () => {
    if (!userId || !club) return navigate("/auth");
    followClub.mutate({ fanId: userId, clubId: club.id });
  };

  return (
    <AppShell coinBalance={passport?.fan_coins_balance ?? 0}>
      {/* Banner */}
      <div
        className="relative h-40 flex flex-col justify-end px-4 pb-4"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}80 60%, ${secondary}30 100%)` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/30 backdrop-blur-sm"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        <div className="flex items-end justify-between">
          <div>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black mb-2 border-2"
              style={{ background: primary, color: secondary, borderColor: `${secondary}40` }}
            >
              {club?.name?.substring(0, 2).toUpperCase()}
            </div>
            <h1 className="text-2xl font-black text-white drop-shadow">{club?.name}</h1>
            <p className="text-sm text-white/70 drop-shadow">{club?.stadium} · Est. {club?.founded_year}</p>
          </div>

          <button
            onClick={handleFollow}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              isFollowing
                ? "bg-white/20 text-white"
                : "bg-white text-[#0A0A0F]"
            )}
          >
            <Heart size={14} fill={isFollowing ? "white" : "none"} />
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex border-b border-white/10 px-4 py-3 gap-4">
        <div className="text-center">
          <p className="text-lg font-black text-white">{(club?.fan_count || 0).toLocaleString()}</p>
          <p className="text-[10px] text-white/30">Fans on FanZone</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-lg font-black text-white">{athletes?.length ?? 0}</p>
          <p className="text-[10px] text-white/30">Players</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-lg font-black text-white">{communities?.length ?? 0}</p>
          <p className="text-[10px] text-white/30">Communities</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/10">
        {(["matches", "squad", "communities"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
              activeTab === t ? "text-white" : "text-white/30"
            )}
            style={activeTab === t ? { background: `${primary}20`, color: primary } : {}}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {activeTab === "matches" && (
          <>
            {matches?.map((m: any) => (
              <div key={m.id} className="p-4 rounded-2xl border border-white/10 bg-white/5">
                <p className="text-[10px] text-white/30 mb-2">
                  {m.competition?.name} · {new Date(m.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <div className="flex items-center gap-3">
                  <p className="flex-1 text-right text-sm font-bold text-white">{m.home_club?.name}</p>
                  <span className="font-black text-white px-2">
                    {m.status === "finished" ? `${m.home_score}–${m.away_score}` : "VS"}
                  </span>
                  <p className="flex-1 text-sm font-bold text-white">{m.away_club?.name}</p>
                </div>
                <div className="flex justify-center mt-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                    m.status === "live" ? "bg-red-500/20 text-red-400" :
                    m.status === "finished" ? "bg-white/10 text-white/40" :
                    "bg-[#00FF87]/10 text-[#00FF87]"
                  )}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
            {!matches?.length && <p className="text-center text-white/30 text-sm py-6">No matches found</p>}
          </>
        )}

        {activeTab === "squad" && (
          <div className="grid grid-cols-2 gap-2">
            {athletes?.map((a) => (
              <div key={a.id} className="p-3 rounded-xl border border-white/10 bg-white/5">
                <p className="text-xs font-bold text-white">{a.name}</p>
                <p className="text-[10px] text-white/40">{a.position} · #{a.jersey_number}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "communities" && (
          <div className="space-y-2">
            {communities?.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/community/${c.slug}`)}
                className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-left hover:bg-white/8 transition-colors"
              >
                <p className="text-sm font-bold text-white">{c.name}</p>
                <p className="text-xs text-white/30 mt-0.5">
                  <Users size={10} className="inline mr-1" />
                  {c.member_count?.toLocaleString()} members
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
