import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "sonner";
import { Bell, Clock, MapPin, Users } from "lucide-react";

const FEATURES = [
  {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50",
    titleEn: "Expiry reminders",
    titleAr: "تذكيرات انتهاء الصلاحية",
    descEn: "We'll alert you before your points expire so you never lose value",
    descAr: "سنبلغك قبل انتهاء صلاحية نقاطك حتى لا تخسر أي قيمة",
  },
  {
    icon: MapPin,
    color: "text-blue-500",
    bg: "bg-blue-50",
    titleEn: "Better rewards nearby",
    titleAr: "مكافآت أفضل بالقرب منك",
    descEn: "Get notified when you're near a merchant where you earn bonus points",
    descAr: "احصل على إشعار عندما تكون بالقرب من تاجر تكسب فيه نقاطاً إضافية",
  },
  {
    icon: Users,
    color: "text-purple-500",
    bg: "bg-purple-50",
    titleEn: "Community updates",
    titleAr: "تحديثات المجتمع",
    descEn: "Stay informed about new rule discoveries and program changes",
    descAr: "ابق على اطلاع بأحدث اكتشافات القواعد وتغييرات البرامج",
  },
];

export default function Notifications() {
  const navigate = useNavigate();
  const { language, isRTL } = useAppContext();
  const [requesting, setRequesting] = useState(false);

  const t = {
    en: {
      title: "Stay in the loop",
      subtitle:
        "Enable notifications to get the most out of LoyaltyOne. We'll only send what matters.",
      enable: "Enable Notifications",
      skip: "Skip for now",
      granted: "Notifications enabled!",
      denied: "Notifications were blocked. You can enable them in browser settings.",
    },
    ar: {
      title: "ابق على اطلاع",
      subtitle:
        "فعّل الإشعارات للاستفادة القصوى من LoyaltyOne. لن نرسل إلا ما يهمك.",
      enable: "تفعيل الإشعارات",
      skip: "تخطي الآن",
      granted: "تم تفعيل الإشعارات!",
      denied: "تم حظر الإشعارات. يمكنك تفعيلها من إعدادات المتصفح.",
    },
  };

  const copy = t[language];

  const handleEnable = async () => {
    setRequesting(true);
    try {
      if (!("Notification" in window)) {
        toast.info("Notifications are not supported in this browser.");
        navigate("/onboarding/complete");
        return;
      }
      const result = await Notification.requestPermission();
      if (result === "granted") {
        toast.success(copy.granted);
      } else {
        toast.info(copy.denied);
      }
    } catch {
      // Ignore permission errors
    } finally {
      setRequesting(false);
      navigate("/onboarding/complete");
    }
  };

  const handleSkip = () => {
    navigate("/onboarding/complete");
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col w-full items-center">
      {/* Animated bell */}
      <div className="mb-8 mt-4 flex items-center justify-center">
        <div
          className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center"
          style={{
            animation: "bell-pulse 2s ease-in-out infinite",
          }}
        >
          <Bell className="w-12 h-12 text-blue-600" />
        </div>
      </div>

      <style>{`
        @keyframes bell-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 16px rgba(59, 130, 246, 0); }
        }
      `}</style>

      <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
        {copy.title}
      </h2>
      <p className="text-sm text-slate-500 text-center mb-8 leading-relaxed max-w-xs">
        {copy.subtitle}
      </p>

      {/* Feature rows */}
      <div className="w-full space-y-3 mb-8">
        {FEATURES.map(({ icon: Icon, color, bg, titleEn, titleAr, descEn, descAr }) => {
          const title = language === "ar" ? titleAr : titleEn;
          const desc = language === "ar" ? descAr : descEn;
          return (
            <div
              key={titleEn}
              className="flex items-start gap-4 bg-white rounded-2xl p-4 border border-slate-100"
            >
              <div
                className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-0.5">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <Button
        onClick={handleEnable}
        disabled={requesting}
        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-base mb-3"
      >
        <Bell className="w-4 h-4 me-2" />
        {copy.enable}
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
