import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Check } from "lucide-react";

const GOALS = [
  {
    id: "max_cashback",
    icon: "💰",
    labelEn: "Maximize Cashback",
    labelAr: "تعظيم الاسترداد النقدي",
    descEn: "Get the most AED value from every purchase",
    descAr: "احصل على أعلى قيمة من كل عملية شراء",
  },
  {
    id: "travel_miles",
    icon: "✈️",
    labelEn: "Earn Travel Miles",
    labelAr: "ربح أميال السفر",
    descEn: "Accumulate miles for flights and upgrades",
    descAr: "اجمع الأميال للرحلات والترقيات",
  },
  {
    id: "entertainment",
    icon: "🎭",
    labelEn: "Entertainment Value",
    labelAr: "قيمة الترفيه",
    descEn: "Maximize dining, cinema, and leisure perks",
    descAr: "تعظيم امتيازات المطاعم والسينما والترفيه",
  },
  {
    id: "use_before_expiry",
    icon: "⏰",
    labelEn: "Use Before Expiry",
    labelAr: "الاستخدام قبل الانتهاء",
    descEn: "Prioritize using points that expire soonest",
    descAr: "أعط الأولوية لاستخدام النقاط الأقرب انتهاءً",
  },
];

export default function Goals() {
  const navigate = useNavigate();
  const { language, isRTL, goals: savedGoals, setGoals } = useAppContext();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(savedGoals ?? [])
  );
  const [saving, setSaving] = useState(false);

  const t = {
    en: {
      title: "What are your goals?",
      subtitle: "Select up to 2 goals that matter most to you",
      tooMany: "Select up to 2 goals",
      skip: "Skip for now",
      continueBtn: "Continue",
    },
    ar: {
      title: "ما هي أهدافك؟",
      subtitle: "اختر حتى هدفين يهمانك أكثر",
      tooMany: "اختر حتى هدفين",
      skip: "تخطي الآن",
      continueBtn: "تابع",
    },
  };

  const copy = t[language];

  const toggleGoal = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= 2) {
        toast.error(copy.tooMany);
        return;
      }
      next.add(id);
    }
    setSelected(next);
  };

  const handleContinue = async () => {
    const goalArray = Array.from(selected);
    setGoals(goalArray);

    if (user) {
      setSaving(true);
      try {
        await supabase
          .from("users")
          .update({ goals: goalArray as any })
          .eq("id", user.id);
      } catch (e) {
        console.error(e);
      } finally {
        setSaving(false);
      }
    }

    navigate("/onboarding/spend");
  };

  const handleSkip = () => {
    navigate("/onboarding/spend");
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">{copy.title}</h2>
        <p className="text-sm text-slate-500">{copy.subtitle}</p>
      </div>

      {/* Goals grid 2×2 */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {GOALS.map((goal) => {
          const isSelected = selected.has(goal.id);
          const label = language === "ar" ? goal.labelAr : goal.labelEn;
          const desc = language === "ar" ? goal.descAr : goal.descEn;

          return (
            <button
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={`relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-start ${
                isSelected
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 end-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <span className="text-3xl mb-3">{goal.icon}</span>
              <span className="text-sm font-semibold text-slate-900 mb-1 leading-tight">
                {label}
              </span>
              <span className="text-xs text-slate-500 leading-relaxed">
                {desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <Button
        onClick={handleContinue}
        disabled={saving}
        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-base mb-3"
      >
        {saving ? "Saving..." : copy.continueBtn}
      </Button>
      <button
        onClick={handleSkip}
        className="w-full text-sm text-slate-400 hover:text-slate-600 py-2"
      >
        {copy.skip}
      </button>
    </div>
  );
}
