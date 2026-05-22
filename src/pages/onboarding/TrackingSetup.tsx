import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Mail, Camera, PenLine, Copy, SkipForward } from "lucide-react";

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
  file?: File | null;
}

export default function TrackingSetup() {
  const navigate = useNavigate();
  const { language, isRTL, selectedPrograms } = useAppContext();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [setups, setSetups] = useState<Record<string, ProgramSetup>>({});

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: programs } = useQuery<Program[]>({
    queryKey: ["selected-programs", selectedPrograms],
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

  const displayPrograms: Program[] = programs ?? selectedPrograms.map((id, i) => ({
    id,
    display_name_en: `Program ${i + 1}`,
    display_name_ar: `برنامج ${i + 1}`,
    logo_url: null,
    category: "retail",
  }));

  const current = displayPrograms[currentIdx];
  const total = displayPrograms.length;
  const setup = current ? (setups[current.id] ?? { method: null, balance: "", expiryDate: "" }) : null;
  const userId = session?.user?.id ?? "demo-user";
  const forwardingEmail = `u-${userId.slice(0, 8)}@inbox.loyaltyone.ae`;

  const t = {
    en: {
      title: "Set up tracking",
      stepOf: (c: number, t: number) => `Program ${c} of ${t}`,
      chooseMethod: "How would you like to track this program?",
      manual: "Enter balance manually",
      email: "Forward email statements",
      screenshot: "Upload screenshot",
      manualDesc: "Enter your current balance and set expiry dates",
      emailDesc: "Auto-sync from forwarded statements",
      screenshotDesc: "We'll extract the balance automatically",
      balance: "Current balance (points)",
      expiry: "Expiry date (optional)",
      forwardTo: "Forward statements to:",
      forwardInstr: "Forward your program emails to this address. We'll extract your balance automatically.",
      uploadPhoto: "Upload statement",
      next: "Next program",
      finish: "Finish setup",
      skip: "Skip this program",
      copied: "Copied!",
    },
    ar: {
      title: "إعداد التتبع",
      stepOf: (c: number, t: number) => `البرنامج ${c} من ${t}`,
      chooseMethod: "كيف تريد تتبع هذا البرنامج؟",
      manual: "إدخال الرصيد يدوياً",
      email: "إرسال كشوف البريد",
      screenshot: "رفع لقطة شاشة",
      manualDesc: "أدخل رصيدك الحالي وحدد تواريخ الانتهاء",
      emailDesc: "مزامنة تلقائية من الكشوف المُعاد توجيهها",
      screenshotDesc: "سنستخرج الرصيد تلقائياً",
      balance: "الرصيد الحالي (نقاط)",
      expiry: "تاريخ الانتهاء (اختياري)",
      forwardTo: "أعد توجيه الكشوف إلى:",
      forwardInstr: "أعد توجيه رسائل البريد الإلكتروني الخاصة ببرنامجك إلى هذا العنوان. سنستخرج رصيدك تلقائياً.",
      uploadPhoto: "رفع كشف الحساب",
      next: "البرنامج التالي",
      finish: "إنهاء الإعداد",
      skip: "تخطي هذا البرنامج",
      copied: "تم النسخ!",
    },
  };

  const copy = t[language];

  const updateSetup = (update: Partial<ProgramSetup>) => {
    if (!current) return;
    setSetups((prev) => ({
      ...prev,
      [current.id]: { ...(prev[current.id] ?? { method: null, balance: "", expiryDate: "" }), ...update },
    }));
  };

  const handleNext = () => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    updateSetup({ file });
    if (file) toast.success("Screenshot selected");
  };

  if (!current || total === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/onboarding/goals")}>Continue</Button>
      </div>
    );
  }

  const GRADIENT_COLORS = ["from-blue-500 to-indigo-600", "from-purple-500 to-pink-500", "from-green-500 to-teal-500", "from-orange-500 to-red-500"];
  const gradient = GRADIENT_COLORS[current.id.charCodeAt(0) % GRADIENT_COLORS.length];
  const name = isRTL ? current.display_name_ar : current.display_name_en;
  const initials = current.display_name_en.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => currentIdx > 0 ? setCurrentIdx((i) => i - 1) : navigate("/onboarding/programs")}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{copy.title}</h1>
            <p className="text-xs text-gray-500">{copy.stepOf(currentIdx + 1, total)}</p>
          </div>
          <div className="text-xs text-gray-400">3 / 7</div>
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-blue-600 transition-all" style={{ width: "42.8%" }} />
        </div>
        {/* Step dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {displayPrograms.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === currentIdx ? "w-6 bg-blue-600" : i < currentIdx ? "w-1.5 bg-blue-300" : "w-1.5 bg-gray-200"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* Program card */}
        <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm mb-6 border">
          {current.logo_url ? (
            <img src={current.logo_url} alt={name} className="w-14 h-14 rounded-xl object-contain" />
          ) : (
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg`}>
              {initials}
            </div>
          )}
          <div>
            <h2 className="font-bold text-gray-900">{name}</h2>
            <span className="text-xs text-gray-400 capitalize">{current.category}</span>
          </div>
        </div>

        {/* Method picker */}
        {!setup?.method ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 mb-4">{copy.chooseMethod}</p>
            {(
              [
                { method: "manual" as const, icon: PenLine, label: copy.manual, desc: copy.manualDesc },
                { method: "email" as const, icon: Mail, label: copy.email, desc: copy.emailDesc },
                { method: "screenshot" as const, icon: Camera, label: copy.screenshot, desc: copy.screenshotDesc },
              ] as const
            ).map(({ method, icon: Icon, label, desc }) => (
              <button
                key={method}
                onClick={() => updateSetup({ method })}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-blue-400 hover:shadow-sm transition-all text-start"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 ms-auto flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Back to method picker */}
            <button
              onClick={() => updateSetup({ method: null })}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ArrowLeft className="w-3 h-3" /> Change method
            </button>

            {setup.method === "manual" && (
              <div className="bg-white rounded-2xl p-5 border space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{copy.balance}</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 10000"
                    value={setup.balance}
                    onChange={(e) => updateSetup({ balance: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{copy.expiry}</Label>
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
              <div className="bg-white rounded-2xl p-5 border space-y-3">
                <p className="text-sm font-medium text-gray-700">{copy.forwardTo}</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border">
                  <span className="flex-1 text-sm font-mono text-blue-700 break-all">{forwardingEmail}</span>
                  <button onClick={handleCopyEmail} className="flex-shrink-0 text-gray-400 hover:text-blue-600">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{copy.forwardInstr}</p>
              </div>
            )}

            {setup.method === "screenshot" && (
              <div className="bg-white rounded-2xl p-5 border">
                <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                  <Camera className="w-8 h-8 text-blue-400 mb-2" />
                  <span className="text-sm font-medium text-blue-600">{copy.uploadPhoto}</span>
                  <span className="text-xs text-gray-400 mt-1">
                    {setup.file ? setup.file.name : "JPG, PNG or PDF"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="sticky bottom-0 bg-white border-t px-4 py-4 flex gap-3">
        <Button
          variant="ghost"
          onClick={handleNext}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm px-4"
        >
          <SkipForward className="w-4 h-4" />
          {copy.skip}
        </Button>
        <Button
          onClick={handleNext}
          className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold"
        >
          {currentIdx < total - 1 ? copy.next : copy.finish}
        </Button>
      </div>
    </div>
  );
}
