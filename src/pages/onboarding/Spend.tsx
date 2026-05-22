import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "groceries", icon: "🛒", en: "Groceries", ar: "البقالة", max: 5000 },
  { id: "dining", icon: "🍽️", en: "Dining", ar: "المطاعم", max: 3000 },
  { id: "fuel", icon: "⛽", en: "Fuel", ar: "الوقود", max: 2000 },
  { id: "online", icon: "💻", en: "Online Shopping", ar: "التسوق الإلكتروني", max: 5000 },
  { id: "travel", icon: "✈️", en: "Travel", ar: "السفر", max: 10000 },
  { id: "telecom", icon: "📱", en: "Telecom", ar: "الاتصالات", max: 1000 },
  { id: "entertainment", icon: "🎬", en: "Entertainment", ar: "الترفيه", max: 2000 },
  { id: "other", icon: "📦", en: "Other", ar: "أخرى", max: 3000 },
];

export default function Spend() {
  const navigate = useNavigate();
  const { language, isRTL, setSpendCategories } = useAppContext();
  const { user } = useAuth();

  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]))
  );
  const [saving, setSaving] = useState(false);

  const t = {
    en: {
      title: "Monthly spending",
      subtitle: "Drag each slider to set your typical monthly spend. This helps us give you better recommendations.",
      total: "Total monthly spend",
      skip: "Skip for now",
      continueBtn: "Continue",
    },
    ar: {
      title: "الإنفاق الشهري",
      subtitle: "اسحب كل شريط لتحديد إنفاقك الشهري المعتاد. يساعدنا هذا في تقديم توصيات أفضل لك.",
      total: "إجمالي الإنفاق الشهري",
      skip: "تخطي الآن",
      continueBtn: "تابع",
    },
  };

  const copy = t[language];

  const updateValue = (id: string, val: number) => {
    setValues((prev) => ({ ...prev, [id]: val }));
  };

  const totalSpend = Object.values(values).reduce((a, b) => a + b, 0);

  const handleContinue = async () => {
    setSpendCategories(values);

    if (user) {
      setSaving(true);
      try {
        await supabase
          .from("users")
          .update({ monthly_spend_categories: values })
          .eq("id", user.id);
        toast.success("Spend categories saved");
      } catch (e) {
        console.error(e);
      } finally {
        setSaving(false);
      }
    }

    navigate("/onboarding/notifications");
  };

  const handleSkip = () => {
    navigate("/onboarding/notifications");
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">{copy.title}</h2>
        <p className="text-sm text-slate-500 leading-relaxed">{copy.subtitle}</p>
      </div>

      <div className="space-y-5 mb-6">
        {CATEGORIES.map((cat) => {
          const label = language === "ar" ? cat.ar : cat.en;
          const val = values[cat.id] ?? 0;

          return (
            <div key={cat.id} className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm font-medium text-slate-800">{label}</span>
                </div>
                <span className="text-sm font-semibold text-blue-700 min-w-[80px] text-end">
                  AED {val.toLocaleString()}
                </span>
              </div>
              <Slider
                min={0}
                max={cat.max}
                step={50}
                value={[val]}
                onValueChange={([v]) => updateValue(cat.id, v)}
                className="w-full"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-300">AED 0</span>
                <span className="text-[10px] text-slate-300">
                  AED {cat.max.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-8 flex items-center justify-between">
        <span className="text-sm font-medium text-blue-800">{copy.total}</span>
        <span className="text-lg font-bold text-blue-700">
          AED {totalSpend.toLocaleString()}
        </span>
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
