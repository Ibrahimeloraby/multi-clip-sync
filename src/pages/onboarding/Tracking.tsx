import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Camera,
  PenLine,
  Copy,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Program {
  id: string;
  display_name_en: string;
  display_name_ar: string;
  logo_url: string | null;
  category: string;
}

type TrackingMethod = "manual" | "email" | "screenshot";

interface ProgramSetup {
  method: TrackingMethod | null;
  balance: string;
  expiryDate: string;
}

const GRADIENT_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-500",
  "from-green-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-500",
];

export default function Tracking() {
  const navigate = useNavigate();
  const { language, isRTL, selectedPrograms } = useAppContext();
  const { user } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [setups, setSetups] = useState<Record<string, ProgramSetup>>({});
  const [saving, setSaving] = useState(false);

  const BackChevron = isRTL ? ChevronRight : ChevronLeft;

  const { data: programs } = useQuery<Program[]>({
    queryKey: ["selected-programs-tracking", selectedPrograms],
    queryFn: async () => {
      if (selectedPrograms.length === 0) return [];
      const { data } = await supabase
        .from("programs")
        .select("id, display_name_en, display_name_ar, logo_url, category")
        .in("id", selectedPrograms);
      return (data as Program[]) ?? [];
    },
    enabled: selectedPrograms.length > 0,
  });

  const displayPrograms: Program[] =
    programs && programs.length > 0
      ? programs
      : selectedPrograms.map((id, i) => ({
          id,
          display_name_en: `Program ${i + 1}`,
          display_name_ar: `برنامج ${i + 1}`,
          logo_url: null,
          category: "retail",
        }));

  const current = displayPrograms[currentIdx];
  const total = displayPrograms.length;
  const setup = current
    ? (setups[current.id] ?? { method: null, balance: "", expiryDate: "" })
    : null;
  const userId = user?.id ?? "demo-user";
  const forwardingEmail = `u-${userId.slice(0, 8)}@inbox.loyaltyone.ae`;

  const t = {
    en: {
      title: "Set up tracking",
      stepOf: (c: number, t: number) => `Program ${c} of ${t}`,
      chooseMethod: "How would you like to track this program?",
      manual: "Enter balance now",
      email: "Forward email statements",
      screenshot: "Upload later from Settings",
      manualDesc: "Enter your current balance and optional expiry date",
      emailDesc: `Auto-sync via ${forwardingEmail}`,
      screenshotDesc: "We'll remind you to upload a screenshot from Settings",
      balance: "Current balance (points)",
      expiry: "Expiry date (optional)",
      forwardTo: "Your unique forwarding address:",
      forwardInstr:
        "In Gmail: Settings → Filters → Create new filter → Forward to this address. We'll extract your balance automatically.",
      next: "Next program",
      finish: "Finish setup",
      skip: "Skip",
      copied: "Copied!",
      changeMethod: "Change method",
    },
    ar: {
      title: "إعداد التتبع",
      stepOf: (c: number, t: number) => `البرنامج ${c} من ${t}`,
      chooseMethod: "كيف تريد تتبع هذا البرنامج؟",
      manual: "إدخال الرصيد الآن",
      email: "إرسال كشوف البريد",
      screenshot: "رفع لاحقاً من الإعدادات",
      manualDesc: "أدخل رصيدك الحالي وتاريخ الانتهاء الاختياري",
      emailDesc: `مزامنة تلقائية عبر ${forwardingEmail}`,
      screenshotDesc: "سنذكّرك برفع لقطة شاشة من الإعدادات",
      balance: "الرصيد الحالي (نقاط)",
      expiry: "تاريخ الانتهاء (اختياري)",
      forwardTo: "عنوان التحويل الخاص بك:",
      forwardInstr:
        "في Gmail: الإعدادات ← الفلاتر ← إنشاء فلتر جديد ← التحويل إلى هذا العنوان. سنستخرج رصيدك تلقائياً.",
      next: "البرنامج التالي",
      finish: "إنهاء الإعداد",
      skip: "تخطي",
      copied: "تم النسخ!",
      changeMethod: "تغيير الطريقة",
    },
  };

  const copy = t[language];

  const updateSetup = (update: Partial<ProgramSetup>) => {
    if (!current) return;
    setSetups((prev) => ({
      ...prev,
      [current.id]: {
        ...(prev[current.id] ?? { method: null, balance: "", expiryDate: "" }),
        ...update,
      },
    }));
  };

  const saveCurrentProgram = async (programId: string, s: ProgramSetup) => {
    if (!user) return;
    const method = s.method ?? "manual";
    const balance = parseFloat(s.balance) || 0;
    const expiryDates =
      s.expiryDate && balance > 0
        ? [{ amount: balance, expires_at: s.expiryDate }]
        : [];

    await supabase.from("user_programs").upsert(
      {
        user_id: user.id,
        program_id: programId,
        current_balance: balance,
        tracking_method: method,
        forwarding_address:
          method === "email" ? forwardingEmail : null,
        expiry_dates: expiryDates,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,program_id" }
    );
  };

  const handleNext = async () => {
    if (current && setup) {
      setSaving(true);
      try {
        await saveCurrentProgram(current.id, setup);
      } catch (e) {
        console.error(e);
      } finally {
        setSaving(false);
      }
    }

    if (currentIdx < total - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      navigate("/onboarding/goals");
    }
  };

  const handleSkip = async () => {
    if (current) {
      setSaving(true);
      try {
        await saveCurrentProgram(current.id, {
          method: "manual",
          balance: "0",
          expiryDate: "",
        });
      } catch (e) {
        console.error(e);
      } finally {
        setSaving(false);
      }
    }
    if (currentIdx < total - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      navigate("/onboarding/goals");
    }
  };

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(forwardingEmail);
    toast.success(copy.copied);
  };

  if (!current || total === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Button onClick={() => navigate("/onboarding/goals")}>Continue</Button>
      </div>
    );
  }

  const gradient =
    GRADIENT_COLORS[current.id.charCodeAt(0) % GRADIENT_COLORS.length];
  const name = isRTL ? current.display_name_ar : current.display_name_en;
  const initials = current.display_name_en
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col w-full">
      {/* Step indicator */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{copy.title}</h2>
        <span className="text-sm text-slate-400">
          {copy.stepOf(currentIdx + 1, total)}
        </span>
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5 mb-6">
        {displayPrograms.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === currentIdx
                ? "w-8 bg-blue-600"
                : i < currentIdx
                ? "w-3 bg-blue-300"
                : "w-3 bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Program card */}
      <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm mb-6 border border-slate-100">
        {current.logo_url ? (
          <img
            src={current.logo_url}
            alt={name}
            className="w-14 h-14 rounded-xl object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}
          >
            {initials}
          </div>
        )}
        <div>
          <h3 className="font-bold text-slate-900">{name}</h3>
          <span className="text-xs text-slate-400 capitalize">
            {current.category}
          </span>
        </div>
      </div>

      {/* Method picker or detail form */}
      {!setup?.method ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-600 mb-2">
            {copy.chooseMethod}
          </p>
          {(
            [
              {
                method: "manual" as const,
                icon: PenLine,
                label: copy.manual,
                desc: copy.manualDesc,
              },
              {
                method: "email" as const,
                icon: Mail,
                label: copy.email,
                desc: copy.emailDesc,
              },
              {
                method: "screenshot" as const,
                icon: Camera,
                label: copy.screenshot,
                desc: copy.screenshotDesc,
              },
            ] as const
          ).map(({ method, icon: Icon, label, desc }) => (
            <button
              key={method}
              onClick={() => updateSetup({ method })}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-slate-100 hover:border-blue-400 hover:shadow-sm transition-all text-start"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm">
                  {label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {desc}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 rtl:rotate-180" />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => updateSetup({ method: null })}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <BackChevron className="w-3 h-3" />
            {copy.changeMethod}
          </button>

          {setup.method === "manual" && (
            <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block text-slate-700">
                  {copy.balance}
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 10000"
                  value={setup.balance}
                  onChange={(e) => updateSetup({ balance: e.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block text-slate-700">
                  {copy.expiry}
                </Label>
                <Input
                  type="date"
                  value={setup.expiryDate}
                  onChange={(e) => updateSetup({ expiryDate: e.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
          )}

          {setup.method === "email" && (
            <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                {copy.forwardTo}
              </p>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                <span className="flex-1 text-sm font-mono text-blue-700 break-all">
                  {forwardingEmail}
                </span>
                <button
                  onClick={handleCopyEmail}
                  className="flex-shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {copy.forwardInstr}
              </p>
            </div>
          )}

          {setup.method === "screenshot" && (
            <div className="bg-white rounded-2xl p-5 border border-slate-100">
              <div className="flex flex-col items-center justify-center gap-3 py-6 border-2 border-dashed border-blue-100 rounded-xl">
                <Camera className="w-10 h-10 text-blue-300" />
                <p className="text-sm font-medium text-slate-600 text-center">
                  {copy.screenshotDesc}
                </p>
                <p className="text-xs text-slate-400 text-center">
                  Go to Settings → Upload Screenshot after onboarding
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom buttons */}
      <div className="flex gap-3 mt-8">
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={saving}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm px-4"
        >
          <SkipForward className="w-4 h-4" />
          {copy.skip}
        </Button>
        <Button
          onClick={handleNext}
          disabled={saving}
          className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold"
        >
          {saving
            ? "Saving..."
            : currentIdx < total - 1
            ? copy.next
            : copy.finish}
        </Button>
      </div>
    </div>
  );
}
