import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { useMyProfile, useMyPassport, useMyFollowedClubs } from "@/hooks/useFanProfile";
import { useMyPredictions } from "@/hooks/usePredictions";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ArrowLeft, LogOut, Shield } from "lucide-react";

export default function Profile() {
  const { fanId } = useParams<{ fanId?: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [userId, setUserId] = useState<string | undefined>();
  const [viewId, setViewId] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth");
      else {
        setUserId(data.user.id);
        setViewId(fanId ?? data.user.id);
      }
    });
  }, [fanId]);

  const { data: passport } = useMyPassport(userId);
  const { data: profile } = useMyProfile(viewId);
  const { data: passportView } = useMyPassport(viewId);
  const { data: followedClubs } = useMyFollowedClubs(viewId);
  const { data: predictions } = useMyPredictions(viewId);

  const isOwnProfile = viewId === userId;
  const tier = passportView?.engagement_tier ?? "Casual";
  const tierColor: Record<string, string> = {
    Casual: "#9CA3AF", Active: "#00D4FF", Superfan: "#00FF87", Legend: "#FFB800",
  };

  return (
    <AppShell coinBalance={passport?.fan_coins_balance ?? 0}>
      <div className="pb-8">
        {!isOwnProfile && (
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/40 text-sm px-4 pt-4">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        {/* Profile header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#00FF87]/20 flex items-center justify-center text-2xl font-black text-[#00FF87]">
                {profile?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-black text-white">
                  {profile?.display_name ?? profile?.username}
                </h1>
                <p className="text-sm text-white/40">@{profile?.username}</p>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                  style={{ background: `${tierColor[tier]}20`, color: tierColor[tier] }}
                >
                  {tier}
                </span>
              </div>
            </div>

            {isOwnProfile && (
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-xs text-white/40 border border-white/10 px-3 py-2 rounded-xl hover:border-white/20 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            )}
          </div>

          {profile?.bio && <p className="text-sm text-white/60">{profile.bio}</p>}
        </div>

        {/* Fan stats */}
        <div className="grid grid-cols-4 gap-1 px-4 mb-6">
          {[
            { label: "Score", value: passportView?.identity_score ?? 0 },
            { label: "Predictions", value: passportView?.total_predictions ?? 0 },
            { label: "Posts", value: passportView?.posts_created ?? 0 },
            { label: "FC Earned", value: `${(passportView?.fan_coins_earned ?? 0).toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-base font-black text-white">{value}</p>
              <p className="text-[10px] text-white/30 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* My Clubs */}
        {followedClubs && followedClubs.length > 0 && (
          <div className="px-4 mb-6">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Clubs</h3>
            <div className="flex gap-2 flex-wrap">
              {followedClubs.map((fc: any) => (
                <button
                  key={fc.id}
                  onClick={() => navigate(`/clubs/${fc.clubs?.slug}`)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                    fc.is_primary ? "border-[#00FF87]/40 text-[#00FF87]" : "border-white/10 text-white/50"
                  )}
                >
                  {fc.clubs?.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent predictions */}
        {predictions && predictions.length > 0 && (
          <div className="px-4">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Recent Predictions</h3>
            <div className="space-y-2">
              {predictions.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex-1 text-xs text-white/60">
                    {p.matches?.home_club?.name} vs {p.matches?.away_club?.name}
                  </div>
                  <span className="text-xs font-bold text-white">
                    {p.home_score_prediction}–{p.away_score_prediction}
                  </span>
                  {p.is_correct === true && <span className="text-[10px] text-[#00FF87]">✓</span>}
                  {p.is_correct === false && <span className="text-[10px] text-red-400">✗</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passport link */}
        {isOwnProfile && (
          <div className="px-4 mt-6">
            <button
              onClick={() => navigate("/passport")}
              className="w-full py-3 rounded-xl border border-[#00FF87]/20 bg-[#00FF87]/5 text-[#00FF87] text-sm font-bold flex items-center justify-center gap-2"
            >
              <Shield size={16} />
              View Full Fan Passport
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
