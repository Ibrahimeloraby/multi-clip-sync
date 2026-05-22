import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { Check, ArrowLeft } from "lucide-react";

interface Program {
  id: string;
  slug: string;
  display_name_en: string;
  display_name_ar: string;
  logo_url: string | null;
  category: string;
  default_earn_rate_aed: number;
  default_redemption_value_aed: number;
  expiry_rule: any;
  transfer_partners: any[];
  key_merchants: string[];
  official_url: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  airline: "bg-sky-100 text-sky-700",
  hotel: "bg-purple-100 text-purple-700",
  banking: "bg-emerald-100 text-emerald-700",
  retail: "bg-orange-100 text-orange-700",
  telecom: "bg-pink-100 text-pink-700",
  fuel: "bg-yellow-100 text-yellow-700",
  default: "bg-gray-100 text-gray-600",
};

const GRADIENT_INITIALS_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-500",
  "from-green-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-500",
];

function ProgramCard({
  program,
  selected,
  onToggle,
  isRTL,
}: {
  program: Program;
  selected: boolean;
  onToggle: () => void;
  isRTL: boolean;
}) {
  const initials = program.display_name_en
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const colorIdx = program.id.charCodeAt(0) % GRADIENT_INITIALS_COLORS.length;
  const gradient = GRADIENT_INITIALS_COLORS[colorIdx];
  const catColor = CATEGORY_COLORS[program.category] ?? CATEGORY_COLORS.default;
  const name = isRTL ? program.display_name_ar : program.display_name_en;

  return (
    <button
      onClick={onToggle}
      className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all text-center ${
        selected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
      }`}
    >
      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-2 end-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Logo / initials */}
      {program.logo_url ? (
        <img
          src={program.logo_url}
          alt={name}
          className="w-12 h-12 rounded-xl object-contain mb-2"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-2 text-white font-bold text-sm`}
        >
          {initials}
        </div>
      )}

      <span className="text-xs font-semibold text-gray-800 leading-tight mb-1.5 line-clamp-2">
        {name}
      </span>
      <Badge className={`text-[10px] px-1.5 py-0 ${catColor} border-0`}>
        {program.category}
      </Badge>
    </button>
  );
}

// Fallback demo data when Supabase table doesn't exist yet
const DEMO_PROGRAMS: Program[] = [
  { id: "1", slug: "emirates-skywards", display_name_en: "Emirates Skywards", display_name_ar: "طيران الإمارات سكاي واردز", logo_url: null, category: "airline", default_earn_rate_aed: 1, default_redemption_value_aed: 0.02, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "2", slug: "etihad-guest", display_name_en: "Etihad Guest", display_name_ar: "ضيف الاتحاد", logo_url: null, category: "airline", default_earn_rate_aed: 1, default_redemption_value_aed: 0.02, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "3", slug: "flydubai-open-skies", display_name_en: "flydubai OPEN", display_name_ar: "فلاي دبي أوبن", logo_url: null, category: "airline", default_earn_rate_aed: 1, default_redemption_value_aed: 0.015, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "4", slug: "marriott-bonvoy", display_name_en: "Marriott Bonvoy", display_name_ar: "ماريوت بونفوي", logo_url: null, category: "hotel", default_earn_rate_aed: 1, default_redemption_value_aed: 0.008, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "5", slug: "hilton-honors", display_name_en: "Hilton Honors", display_name_ar: "هيلتون أونرز", logo_url: null, category: "hotel", default_earn_rate_aed: 1, default_redemption_value_aed: 0.005, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "6", slug: "adcb-touchpoints", display_name_en: "ADCB Touchpoints", display_name_ar: "نقاط أبوظبي التجاري", logo_url: null, category: "banking", default_earn_rate_aed: 1, default_redemption_value_aed: 0.01, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "7", slug: "fab-rewards", display_name_en: "FAB Rewards", display_name_ar: "مكافآت بنك أبوظبي الأول", logo_url: null, category: "banking", default_earn_rate_aed: 1, default_redemption_value_aed: 0.01, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "8", slug: "enbd-rewards", display_name_en: "Emirates NBD Rewards", display_name_ar: "مكافآت الإمارات دبي الوطني", logo_url: null, category: "banking", default_earn_rate_aed: 1, default_redemption_value_aed: 0.01, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "9", slug: "noon-one", display_name_en: "Noon One", display_name_ar: "نون ون", logo_url: null, category: "retail", default_earn_rate_aed: 1, default_redemption_value_aed: 0.02, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "10", slug: "carrefour-my-club", display_name_en: "Carrefour My Club", display_name_ar: "كارفور ماي كلوب", logo_url: null, category: "retail", default_earn_rate_aed: 1, default_redemption_value_aed: 0.01, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "11", slug: "lulu-rewards", display_name_en: "LuLu Rewards", display_name_ar: "مكافآت لولو", logo_url: null, category: "retail", default_earn_rate_aed: 1, default_redemption_value_aed: 0.01, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "12", slug: "du-rewards", display_name_en: "du Rewards", display_name_ar: "مكافآت دو", logo_url: null, category: "telecom", default_earn_rate_aed: 1, default_redemption_value_aed: 0.01, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "13", slug: "etisalat-smiles", display_name_en: "Etisalat Smiles", display_name_ar: "سمايلز اتصالات", logo_url: null, category: "telecom", default_earn_rate_aed: 1, default_redemption_value_aed: 0.01, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "14", slug: "adnoc-smart-miles", display_name_en: "ADNOC Smart Miles", display_name_ar: "ميل ذكي من أدنوك", logo_url: null, category: "fuel", default_earn_rate_aed: 1, default_redemption_value_aed: 0.02, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "15", slug: "enoc-drive", display_name_en: "ENOC Drive", display_name_ar: "درايف اينوك", logo_url: null, category: "fuel", default_earn_rate_aed: 1, default_redemption_value_aed: 0.015, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "16", slug: "ikea-family", display_name_en: "IKEA Family", display_name_ar: "إيكيا فاميلي", logo_url: null, category: "retail", default_earn_rate_aed: 1, default_redemption_value_aed: 0.01, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "17", slug: "starbucks-rewards", display_name_en: "Starbucks Rewards", display_name_ar: "ستاربكس ريواردز", logo_url: null, category: "retail", default_earn_rate_aed: 1, default_redemption_value_aed: 0.02, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
  { id: "18", slug: "spinneys-freshclub", display_name_en: "Spinneys FreshClub", display_name_ar: "سبينيز فريش كلوب", logo_url: null, category: "retail", default_earn_rate_aed: 1, default_redemption_value_aed: 0.01, expiry_rule: {}, transfer_partners: [], key_merchants: [], official_url: null },
];

export default function OnboardingPrograms() {
  const navigate = useNavigate();
  const { language, isRTL, setSelectedPrograms: saveSelected } = useAppContext();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("display_name_en");
      if (error || !data || data.length === 0) return DEMO_PROGRAMS;
      return data as Program[];
    },
  });

  const displayPrograms = programs ?? DEMO_PROGRAMS;

  const t = {
    en: { title: "Choose your programs", subtitle: "Select the loyalty programs you're a member of", selectAll: "Select all", selectNone: "Select none", continueBtn: (n: number) => n === 0 ? "Select at least 1 program" : `Continue with ${n} program${n !== 1 ? "s" : ""}` },
    ar: { title: "اختر برامجك", subtitle: "اختر برامج الولاء التي أنت عضو فيها", selectAll: "اختر الكل", selectNone: "إلغاء الكل", continueBtn: (n: number) => n === 0 ? "اختر برنامجاً واحداً على الأقل" : `تابع مع ${n} برنامج` },
  };

  const copy = t[language];

  const toggleProgram = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleContinue = () => {
    saveSelected(Array.from(selected));
    navigate("/onboarding/tracking");
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate("/onboarding/auth")} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{copy.title}</h1>
            <p className="text-xs text-gray-500">{copy.subtitle}</p>
          </div>
          <div className="text-xs text-gray-400">2 / 7</div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-blue-600 transition-all" style={{ width: "28.5%" }} />
        </div>
      </div>

      {/* Select all / none */}
      <div className="flex justify-end gap-4 px-4 py-3">
        <button onClick={() => setSelected(new Set(displayPrograms.map((p) => p.id)))} className="text-xs text-blue-600 font-medium hover:underline">
          {copy.selectAll}
        </button>
        <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
          {copy.selectNone}
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 px-4 pb-32 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {displayPrograms.map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                selected={selected.has(p.id)}
                onToggle={() => toggleProgram(p.id)}
                isRTL={isRTL}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t px-4 py-4 shadow-xl">
        <Button
          onClick={handleContinue}
          disabled={selected.size === 0}
          className="w-full h-13 py-3.5 rounded-2xl text-base font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {copy.continueBtn(selected.size)}
        </Button>
      </div>
    </div>
  );
}
