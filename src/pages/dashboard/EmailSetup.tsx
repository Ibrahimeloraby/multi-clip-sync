import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Copy, CheckCircle2, Mail } from "lucide-react";

const EMAIL_CLIENTS = [
  {
    id: "gmail",
    label: "Gmail",
    steps: [
      "Open Gmail and go to Settings (gear icon)",
      'Click "See all settings" → "Filters and Blocked Addresses"',
      'Click "Create a new filter"',
      "In the From field, enter the program's sender address",
      'Click "Create filter" → check "Forward it to:" and enter your LoyaltyOne address',
      'Click "Create filter" to save',
    ],
    stepsAr: [
      "افتح Gmail وانتقل إلى الإعدادات (أيقونة الترس)",
      'انقر على "مشاهدة جميع الإعدادات" ← "الفلاتر والعناوين المحظورة"',
      'انقر على "إنشاء فلتر جديد"',
      "في حقل من، أدخل عنوان المرسل للبرنامج",
      'انقر على "إنشاء فلتر" ← حدد "إعادة توجيهه إلى:" وأدخل عنوان LoyaltyOne الخاص بك',
      'انقر على "إنشاء فلتر" للحفظ',
    ],
  },
  {
    id: "outlook",
    label: "Outlook",
    steps: [
      'Go to Settings → "View all Outlook settings"',
      'Navigate to Mail → Rules → "Add new rule"',
      'Name the rule and set the condition: "From" contains [program sender]',
      'Add action: "Forward to" and enter your LoyaltyOne address',
      "Save the rule",
    ],
    stepsAr: [
      'انتقل إلى الإعدادات ← "عرض جميع إعدادات Outlook"',
      'انتقل إلى البريد ← القواعد ← "إضافة قاعدة جديدة"',
      'سمِّ القاعدة وحدد الشرط: "من" يحتوي على [مرسل البرنامج]',
      'أضف إجراءً: "إعادة التوجيه إلى" وأدخل عنوان LoyaltyOne الخاص بك',
      "احفظ القاعدة",
    ],
  },
  {
    id: "apple",
    label: "Apple Mail",
    steps: [
      "Open Mail → Preferences (Mac) or Settings (iPhone)",
      'Go to Rules → "Add Rule"',
      'Set condition: "From" contains [program sender address]',
      'Set action: "Forward Message" to your LoyaltyOne address',
      "Click OK to save",
    ],
    stepsAr: [
      "افتح البريد ← التفضيلات (Mac) أو الإعدادات (iPhone)",
      'انتقل إلى القواعد ← "إضافة قاعدة"',
      'حدد الشرط: "من" يحتوي على [عنوان مرسل البرنامج]',
      'حدد الإجراء: "إعادة توجيه الرسالة" إلى عنوان LoyaltyOne الخاص بك',
      "انقر على موافق للحفظ",
    ],
  },
];

const SUPPORTED_PROGRAMS = [
  { name: "Emirates Skywards", sender: "noreply@emails.skywards.com" },
  { name: "Etihad Guest", sender: "noreply@etihad.com" },
  { name: "ADCB Touchpoints", sender: "noreply@adcb.com" },
  { name: "Emirates NBD Rewards", sender: "alerts@emiratesnbd.com" },
  { name: "FAB Rewards", sender: "noreply@fab.ae" },
  { name: "Marriott Bonvoy", sender: "loyalty@bonvoy.marriott.com" },
  { name: "Hilton Honors", sender: "hiltonhonors@hilton.com" },
  { name: "Carrefour My Club", sender: "myclub@carrefouruae.com" },
  { name: "ADNOC Smart Miles", sender: "smartmiles@adnoc.ae" },
  { name: "Noon One", sender: "loyalty@noon.com" },
];

export default function EmailSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, isRTL } = useAppContext();
  const [activeTab, setActiveTab] = useState("gmail");
  const [copied, setCopied] = useState(false);

  const forwardingAddress = `u-${(user?.id ?? "demo").slice(0, 8)}@inbox.loyaltyone.ae`;

  const { data: lastEmail } = useQuery({
    queryKey: ["last-email", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("inbound_emails")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(forwardingAddress);
    setCopied(true);
    toast.success(language === "ar" ? "تم النسخ!" : "Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const t = {
    en: {
      title: "Email Forwarding Setup",
      yourAddress: "Your unique forwarding address",
      copyBtn: "Copy",
      copiedBtn: "Copied!",
      instructions: "Forward Setup Instructions",
      supported: "Supported Programs",
      senderLabel: "Sender address",
      lastReceived: "Last email received",
      never: "No emails received yet",
      status: "Status",
      step: (n: number) => `Step ${n}`,
    },
    ar: {
      title: "إعداد توجيه البريد الإلكتروني",
      yourAddress: "عنوان التحويل الفريد الخاص بك",
      copyBtn: "نسخ",
      copiedBtn: "تم النسخ!",
      instructions: "تعليمات إعداد التوجيه",
      supported: "البرامج المدعومة",
      senderLabel: "عنوان المرسل",
      lastReceived: "آخر بريد مستلم",
      never: "لم يتم استلام أي بريد بعد",
      status: "الحالة",
      step: (n: number) => `الخطوة ${n}`,
    },
  };

  const copy = t[language];
  const activeClient = EMAIL_CLIENTS.find((c) => c.id === activeTab)!;
  const steps =
    language === "ar" ? activeClient.stepsAr : activeClient.steps;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex flex-col min-h-screen bg-slate-50 pb-20"
    >
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 rtl:rotate-180" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">{copy.title}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Forwarding address */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-slate-800">
              {copy.yourAddress}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            <span className="flex-1 text-sm font-mono text-blue-700 break-all">
              {forwardingAddress}
            </span>
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? copy.copiedBtn : copy.copyBtn}
            </button>
          </div>

          {/* Last received status */}
          <div className="mt-3 flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                lastEmail ? "bg-green-500" : "bg-slate-300"
              }`}
            />
            <p className="text-xs text-slate-500">
              {copy.lastReceived}:{" "}
              {lastEmail
                ? new Date(lastEmail.created_at).toLocaleString()
                : copy.never}
            </p>
          </div>
        </div>

        {/* Email client tabs */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {EMAIL_CLIENTS.map((client) => (
              <button
                key={client.id}
                onClick={() => setActiveTab(client.id)}
                className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                  activeTab === client.id
                    ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/50"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {client.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Supported programs */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            {copy.supported}
          </h2>
          <div className="space-y-2">
            {SUPPORTED_PROGRAMS.map((prog) => (
              <div
                key={prog.name}
                className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
              >
                <span className="text-sm font-medium text-slate-800">
                  {prog.name}
                </span>
                <span className="text-xs font-mono text-slate-400 text-end ms-2 truncate max-w-[160px]">
                  {prog.sender}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
