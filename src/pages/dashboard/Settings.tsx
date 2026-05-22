import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import {
  Globe,
  Bell,
  Shield,
  CreditCard,
  Mail,
  Info,
  LogOut,
  ChevronRight,
} from "lucide-react";

const APP_VERSION = "1.0.0";

export default function Settings() {
  const navigate = useNavigate();
  const { user, appUser, signOut } = useAuth();
  const { language, isRTL, setLanguage } = useAppContext();

  const initials = (appUser?.full_name ?? user?.email ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const t = {
    en: {
      title: "Settings",
      profile: "Profile",
      language: "Language",
      languageValue: "English",
      notifications: "Notifications",
      notificationsDesc: "Manage alerts and reminders",
      privacy: "Privacy",
      privacyDesc: "Data and account settings",
      programs: "My Programs",
      programsDesc: "Manage your loyalty programs",
      emailSetup: "Email Forwarding Setup",
      emailSetupDesc: "Configure email-based balance sync",
      about: "About LoyaltyOne",
      version: `Version ${APP_VERSION}`,
      disclaimer:
        "LoyaltyOne is not affiliated with any loyalty program shown. Points values are estimates.",
      signOut: "Sign Out",
      toggleLang: "Switch to Arabic",
    },
    ar: {
      title: "الإعدادات",
      profile: "الملف الشخصي",
      language: "اللغة",
      languageValue: "العربية",
      notifications: "الإشعارات",
      notificationsDesc: "إدارة التنبيهات والتذكيرات",
      privacy: "الخصوصية",
      privacyDesc: "بيانات الحساب والإعدادات",
      programs: "برامجي",
      programsDesc: "إدارة برامج الولاء الخاصة بك",
      emailSetup: "إعداد توجيه البريد الإلكتروني",
      emailSetupDesc: "تكوين مزامنة الرصيد عبر البريد",
      about: "حول LoyaltyOne",
      version: `الإصدار ${APP_VERSION}`,
      disclaimer:
        "LoyaltyOne غير مرتبطة بأي برنامج ولاء معروض. قيم النقاط تقديرية.",
      signOut: "تسجيل الخروج",
      toggleLang: "التبديل إلى الإنجليزية",
    },
  };

  const copy = t[language];

  const settingRows = [
    {
      icon: Globe,
      label: copy.language,
      value: language === "ar" ? "العربية" : "English",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      action: () => setLanguage(isRTL ? "en" : "ar"),
      trailing: (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">
            {language === "ar" ? "العربية" : "English"}
          </span>
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${
              isRTL ? "bg-blue-600" : "bg-slate-200"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                isRTL ? "translate-x-6 start-0.5" : "start-0.5"
              }`}
            />
          </div>
        </div>
      ),
    },
    {
      icon: Bell,
      label: copy.notifications,
      desc: copy.notificationsDesc,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      action: () => {},
      trailing: <ChevronRight className="w-4 h-4 text-slate-300 rtl:rotate-180" />,
    },
    {
      icon: Shield,
      label: copy.privacy,
      desc: copy.privacyDesc,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
      action: () => {},
      trailing: <ChevronRight className="w-4 h-4 text-slate-300 rtl:rotate-180" />,
    },
    {
      icon: CreditCard,
      label: copy.programs,
      desc: copy.programsDesc,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      action: () => navigate("/dashboard/programs"),
      trailing: <ChevronRight className="w-4 h-4 text-slate-300 rtl:rotate-180" />,
    },
    {
      icon: Mail,
      label: copy.emailSetup,
      desc: copy.emailSetupDesc,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      action: () => navigate("/dashboard/email-setup"),
      trailing: <ChevronRight className="w-4 h-4 text-slate-300 rtl:rotate-180" />,
    },
  ];

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex flex-col min-h-screen bg-slate-50 pb-24"
    >
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900">{copy.title}</h1>
      </div>

      {/* Profile */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate">
            {appUser?.full_name ?? "LoyaltyOne User"}
          </p>
          <p className="text-sm text-slate-500 truncate">
            {user?.email ?? ""}
          </p>
        </div>
      </div>

      {/* Setting rows */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {settingRows.map(({ icon: Icon, label, desc, iconColor, iconBg, action, trailing }) => (
          <button
            key={label}
            onClick={action}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition-colors text-start"
          >
            <div
              className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}
            >
              <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{label}</p>
              {desc && (
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              )}
            </div>
            {trailing}
          </button>
        ))}
      </div>

      {/* About section */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
            <Info className="w-4.5 h-4.5 text-slate-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{copy.about}</p>
            <p className="text-xs text-slate-400 mt-0.5">{copy.version}</p>
          </div>
        </div>
        <div className="px-4 pb-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {copy.disclaimer}
          </p>
        </div>
      </div>

      {/* Sign out */}
      <div className="mx-4 mt-4">
        <button
          onClick={async () => {
            await signOut();
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {copy.signOut}
        </button>
      </div>
    </div>
  );
}
