import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PERSONALITY_TYPES = [
  { id: "die_hard", label: "Die-Hard Loyalist", emoji: "🔥", desc: "One club, forever, no matter what" },
  { id: "analyst", label: "The Analyst", emoji: "📊", desc: "Stats, tactics, formations obsessed" },
  { id: "social_fan", label: "Social Fan", emoji: "💬", desc: "It's about the community and banter" },
  { id: "global_neutral", label: "Global Neutral", emoji: "🌍", desc: "Love the sport, follow the best" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clubs } = useClubs();
  const [step, setStep] = useState(0);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [personality, setPersonality] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const steps = ["Pick Your Club", "Your Fan Type", "Your Value Revealed"];

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (selectedClubId) {
        await supabase.from("fan_clubs").insert({
          fan_id: user.id,
          club_id: selectedClubId,
          is_primary: true,
        });
      }

      await supabase
        .from("fan_profiles")
        .update({
          fan_personality_type: personality,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      // Grant welcome coins
      await supabase.from("reward_transactions").insert({
        fan_id: user.id,
        amount: 250,
        type: "bonus",
        source: "welcome_bonus",
        description: "Welcome to FanZone bonus",
      });

      toast.success("Profile complete! You earned 250 FC 🎉");
      navigate("/");
    } catch (e: any) {
      toast.error("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  const footballClubs = clubs?.filter((c) => c.sports?.slug === "football").slice(0, 16) ?? [];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      {/* Progress */}
      <div className="px-6 pt-10 pb-6">
        <div className="flex gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                i <= step ? "bg-[#00FF87]" : "bg-white/10"
              )}
            />
          ))}
        </div>
        <h2 className="text-2xl font-black">{steps[step]}</h2>
      </div>

      <div className="flex-1 px-6">
        {step === 0 && (
          <div>
            <p className="text-white/40 text-sm mb-6">This powers your Fan Commercial Profile</p>
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pb-4">
              {footballClubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => setSelectedClubId(club.id)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all",
                    selectedClubId === club.id
                      ? "border-[#00FF87]/70 bg-[#00FF87]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-full mb-2 flex items-center justify-center text-xs font-black"
                    style={{ background: club.primary_color, color: club.secondary_color }}
                  >
                    {club.name.substring(0, 2).toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold text-white leading-tight">{club.name}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{club.stadium}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-white/40 text-sm mb-6">How do your friends describe you as a fan?</p>
            {PERSONALITY_TYPES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPersonality(p.id)}
                className={cn(
                  "w-full p-4 rounded-2xl border text-left flex items-center gap-4 transition-all",
                  personality === p.id
                    ? "border-[#00FF87]/70 bg-[#00FF87]/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                )}
              >
                <span className="text-3xl">{p.emoji}</span>
                <div>
                  <p className="font-semibold text-white">{p.label}</p>
                  <p className="text-xs text-white/40">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-24 h-24 rounded-full bg-[#00FF87]/20 border-2 border-[#00FF87]/50 flex items-center justify-center mb-6 animate-pulse">
              <span className="text-4xl">⚡</span>
            </div>
            <p className="text-white/40 text-sm uppercase tracking-widest mb-2">Your fandom is worth</p>
            <p className="text-6xl font-black text-[#00FF87] mb-2">£1,400</p>
            <p className="text-white/40 text-sm mb-8">estimated annual commercial value to brands</p>

            <div className="w-full space-y-3 text-left">
              <p className="text-xs text-white/30 uppercase tracking-widest mb-3">How we calculated this</p>
              {[
                { label: "Season ticket / watch spend", value: "£480" },
                { label: "Merch & kit purchases", value: "£280" },
                { label: "Food, travel, matchday", value: "£340" },
                { label: "Gaming & digital sports", value: "£300" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm text-white/60">{label}</span>
                  <span className="text-sm font-bold text-white">{value}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-sm font-bold text-white">Total annual value</span>
                <span className="text-sm font-black text-[#00FF87]">£1,400</span>
              </div>
            </div>

            <p className="text-white/30 text-xs mt-6">
              Start earning FanCoins and unlock your share of this value.
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="p-6">
        {step < 2 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && !selectedClubId}
            className="w-full py-4 bg-[#00FF87] text-[#0A0A0F] font-bold rounded-xl text-sm disabled:opacity-30 hover:bg-[#00FF87]/90 transition-colors"
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full py-4 bg-[#00FF87] text-[#0A0A0F] font-bold rounded-xl text-sm disabled:opacity-50 hover:bg-[#00FF87]/90 transition-colors"
          >
            {loading ? "Setting up..." : "Start Earning ⚡"}
          </button>
        )}
      </div>
    </div>
  );
}
