import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2 } from "lucide-react";

export default function OnboardingComplete() {
  const navigate = useNavigate();
  const { language, isRTL, selectedPrograms } = useAppContext();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Compute estimated portfolio value from user_programs
  const { data: portfolioData } = useQuery({
    queryKey: ["onboarding-portfolio", user?.id],
    queryFn: async () => {
      if (!user) return { totalValue: 0, count: 0 };
      const { data } = await supabase
        .from("user_programs")
        .select("current_balance, program:programs(default_redemption_value_aed)")
        .eq("user_id", user.id);

      if (!data) return { totalValue: 0, count: 0 };

      let totalValue = 0;
      for (const up of data) {
        const rate =
          (up.program as any)?.default_redemption_value_aed ?? 0.01;
        totalValue += up.current_balance * rate;
      }
      return { totalValue, count: data.length };
    },
    enabled: !!user,
  });

  const programCount =
    portfolioData?.count ?? selectedPrograms.length;
  const estimatedValue = portfolioData?.totalValue ?? 0;

  const t = {
    en: {
      heading: "You're all set! 🎉",
      sub: `${programCount} ${programCount === 1 ? "program" : "programs"} connected`,
      value:
        estimatedValue > 0
          ? `Estimated portfolio value: AED ${estimatedValue.toFixed(2)}`
          : null,
      cta: "Go to Dashboard",
      disclaimer:
        "LoyaltyOne is not affiliated with any loyalty program shown. Points values are estimates and may vary.",
    },
    ar: {
      heading: "أنت جاهز! 🎉",
      sub: `${programCount} ${programCount === 1 ? "برنامج" : "برامج"} متصل`,
      value:
        estimatedValue > 0
          ? `القيمة التقديرية للمحفظة: AED ${estimatedValue.toFixed(2)}`
          : null,
      cta: "الذهاب إلى لوحة التحكم",
      disclaimer:
        "LoyaltyOne غير مرتبطة بأي برنامج ولاء معروض. قيم النقاط تقديرية وقد تختلف.",
    },
  };

  const copy = t[language];

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex flex-col w-full items-center justify-center min-h-[60vh] text-center"
    >
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Checkmark */}
      <div
        className={`mb-6 ${visible ? "animate-scale-in" : "opacity-0"}`}
      >
        <CheckCircle2 className="w-24 h-24 text-green-500" strokeWidth={1.5} />
      </div>

      <h2 className="text-3xl font-bold text-slate-900 mb-2">{copy.heading}</h2>

      <p className="text-base text-slate-600 mb-1">{copy.sub}</p>

      {copy.value && (
        <p className="text-sm font-semibold text-blue-700 mb-6">{copy.value}</p>
      )}

      {!copy.value && <div className="mb-6" />}

      <Button
        onClick={() => navigate("/dashboard", { replace: true })}
        className="w-full max-w-xs h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-lg shadow-lg shadow-blue-200 mb-8"
      >
        {copy.cta}
      </Button>

      <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
        {copy.disclaimer}
      </p>
    </div>
  );
}
