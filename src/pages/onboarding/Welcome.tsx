import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { Award } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  const { language, setLanguage, isRTL } = useAppContext();

  const t = {
    en: {
      tagline: "Get the most from every purchase in the UAE",
      subtext: "Connect all your loyalty cards. Get AI-powered recommendations.",
      getStarted: "Get Started",
      haveAccount: "I already have an account",
      selectLang: "Choose your language",
    },
    ar: {
      tagline: "احصل على أقصى استفادة من كل عملية شراء في الإمارات",
      subtext: "اربط جميع بطاقات الولاء. احصل على توصيات مدعومة بالذكاء الاصطناعي.",
      getStarted: "ابدأ الآن",
      haveAccount: "لدي حساب بالفعل",
      selectLang: "اختر لغتك",
    },
  };

  const copy = t[language];

  const handleSelectLang = (lang: "en" | "ar") => {
    setLanguage(lang);
    navigate("/onboarding/auth");
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col bg-gradient-to-b from-blue-600 to-indigo-800 text-white"
    >
      {/* Hero area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
            <Award className="w-8 h-8 text-white" />
          </div>
          <span className="text-4xl font-extrabold tracking-tight">LoyaltyOne</span>
        </div>

        {/* Decorative circles */}
        <div className="relative w-56 h-56 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-white/5 animate-pulse" />
          <div className="absolute inset-6 rounded-full bg-white/10" />
          <div className="absolute inset-12 rounded-full bg-white/15 flex items-center justify-center">
            <Award className="w-16 h-16 text-white/80" />
          </div>
          {/* Floating dots */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <div
              key={deg}
              className="absolute w-3 h-3 rounded-full bg-amber-300/70"
              style={{
                top: `${50 - 46 * Math.cos((deg * Math.PI) / 180)}%`,
                left: `${50 + 46 * Math.sin((deg * Math.PI) / 180)}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <h1 className="text-2xl font-bold mb-3 leading-snug max-w-xs">{copy.tagline}</h1>
        <p className="text-blue-100 text-sm leading-relaxed max-w-xs">{copy.subtext}</p>
      </div>

      {/* Language picker */}
      <div className="px-6 pb-4">
        <p className="text-center text-blue-200 text-xs mb-3">{copy.selectLang}</p>
        <div className="flex gap-3">
          <button
            onClick={() => handleSelectLang("en")}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 text-base font-semibold transition-all ${
              language === "en"
                ? "border-white bg-white/20 shadow-lg scale-105"
                : "border-white/30 bg-white/10 hover:bg-white/15"
            }`}
          >
            <span className="text-xl">🇬🇧</span>
            <span>English</span>
          </button>
          <button
            onClick={() => handleSelectLang("ar")}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 text-base font-semibold transition-all ${
              language === "ar"
                ? "border-white bg-white/20 shadow-lg scale-105"
                : "border-white/30 bg-white/10 hover:bg-white/15"
            }`}
          >
            <span className="text-xl">🇦🇪</span>
            <span>العربية</span>
          </button>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-6 pb-10 flex flex-col gap-3">
        <Button
          onClick={() => navigate("/onboarding/auth")}
          className="w-full h-14 text-base font-bold rounded-2xl bg-white text-blue-700 hover:bg-blue-50 shadow-xl"
        >
          {copy.getStarted}
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate("/onboarding/auth?mode=signin")}
          className="w-full h-12 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-2xl"
        >
          {copy.haveAccount}
        </Button>
      </div>
    </div>
  );
}
