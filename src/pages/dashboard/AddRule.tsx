import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Search,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  Camera,
  Loader2,
  Plus,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RuleType = "earn" | "cashback" | "discount" | "bogo" | "multiplier";

interface MerchantItem {
  id: string;
  display_name_en: string;
  display_name_ar: string;
  category: string[];
  logo_url: string | null;
  is_verified: boolean;
}

interface ProgramItem {
  id: string;
  slug: string;
  display_name_en: string;
  display_name_ar: string;
  logo_url: string | null;
  category: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ["Merchant & Program", "Rule Details", "Evidence", "Review & Submit"];

const RULE_TYPES: { type: RuleType; label: string; desc: string; icon: string }[] = [
  { type: "earn", label: "Earn Rate", desc: "Points earned per AED spent", icon: "⭐" },
  { type: "cashback", label: "Cashback", desc: "% back on purchases", icon: "💰" },
  { type: "discount", label: "Discount", desc: "% off the purchase price", icon: "🏷️" },
  { type: "bogo", label: "Buy 1 Get 1", desc: "Buy one get one free", icon: "🎁" },
  { type: "multiplier", label: "Multiplier", desc: "Bonus points multiplier", icon: "✖️" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormData {
  merchantId: string | null;
  programId: string;
  ruleType: RuleType | null;
  earnRate: string;
  cashbackPct: string;
  discountPct: string;
  multiplier: string;
  descriptionText: string;
  daysOfWeek: number[];
  startDate: string;
  endDate: string;
  minSpend: string;
  maxSpend: string;
  appliesTo: string;
  notes: string;
  receiptFile: File | null;
  screenshotFile: File | null;
}

// ─── Confidence calculation ───────────────────────────────────────────────────

function calcConfidence(data: FormData): number {
  let score = 30; // base
  if (data.receiptFile) score += 20;
  if (data.screenshotFile) score += 10;
  if (data.notes.trim()) score += 5;
  if (data.daysOfWeek.length > 0) score += 5;
  if (data.startDate || data.endDate) score += 5;
  if (data.minSpend) score += 5;
  return Math.min(score, 95);
}

// ─── Step Header ──────────────────────────────────────────────────────────────

function StepHeader({
  step,
  onBack,
}: {
  step: number;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2">
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <div className="flex-1">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Step {step} of {STEPS.length}</span>
          <span>{STEPS[step - 1]}</span>
        </div>
        <Progress value={(step / STEPS.length) * 100} className="h-1.5" />
      </div>
    </div>
  );
}

// ─── Step 1: Merchant + Program ───────────────────────────────────────────────

function Step1({
  formData,
  prefillMerchant,
  onChange,
  language,
}: {
  formData: FormData;
  prefillMerchant: MerchantItem | null;
  onChange: (patch: Partial<FormData>) => void;
  language: "en" | "ar";
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantItem | null>(prefillMerchant);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["merchant-search-addrule", debouncedSearch],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchants")
        .select("id, display_name_en, display_name_ar, category, logo_url, is_verified")
        .or(`display_name_en.ilike.%${debouncedSearch}%,display_name_ar.ilike.%${debouncedSearch}%`)
        .limit(20);
      return (data ?? []) as MerchantItem[];
    },
    enabled: debouncedSearch.trim().length > 0 && !selectedMerchant,
  });

  const { data: enrolledPrograms } = useQuery({
    queryKey: ["enrolled-programs-addrule", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("program_id, programs:program_id(id, slug, display_name_en, display_name_ar, logo_url, category)")
        .eq("user_id", user!.id);
      return (data ?? []).map((r) => (r as any).programs as ProgramItem).filter(Boolean);
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Merchant & Program</h2>

      {/* Merchant selector */}
      {selectedMerchant ? (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
            {selectedMerchant.display_name_en.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">{selectedMerchant.display_name_en}</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {selectedMerchant.category.slice(0, 2).map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
              ))}
            </div>
          </div>
          {!prefillMerchant && (
            <button
              onClick={() => {
                setSelectedMerchant(null);
                onChange({ merchantId: null });
              }}
              className="text-xs text-slate-500 hover:text-red-500"
            >
              Change
            </button>
          )}
        </div>
      ) : (
        <div>
          <Label className="text-sm mb-1.5 block">Select Merchant</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search merchants..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
            )}
          </div>
          {(searchResults ?? []).length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {(searchResults ?? []).map((m) => (
                <button
                  key={m.id}
                  className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 text-left"
                  onClick={() => {
                    setSelectedMerchant(m);
                    onChange({ merchantId: m.id });
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0">
                    {m.display_name_en.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{m.display_name_en}</p>
                    <p className="text-xs text-slate-500">{m.category.slice(0, 2).join(", ")}</p>
                  </div>
                  {m.is_verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Program selector */}
      <div>
        <Label className="text-sm mb-1.5 block">Program</Label>
        {enrolledPrograms && enrolledPrograms.length > 0 ? (
          <Select
            value={formData.programId}
            onValueChange={(v) => onChange({ programId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your program" />
            </SelectTrigger>
            <SelectContent>
              {enrolledPrograms.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {language === "ar" ? p.display_name_ar : p.display_name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
            No enrolled programs found. Please enroll in programs first.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Rule Details ─────────────────────────────────────────────────────

function Step2({
  formData,
  onChange,
}: {
  formData: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  const [conditionsOpen, setConditionsOpen] = useState(false);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Rule Details</h2>

      {/* Rule type cards */}
      <div>
        <Label className="text-sm mb-2 block">Rule Type</Label>
        <div className="grid grid-cols-1 gap-2">
          {RULE_TYPES.map(({ type, label, desc, icon }) => (
            <button
              key={type}
              onClick={() => onChange({ ruleType: type })}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                formData.ruleType === type
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-medium text-slate-900 text-sm">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              {formData.ruleType === type && (
                <CheckCircle className="w-4 h-4 text-blue-600 ml-auto shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional value inputs */}
      {formData.ruleType === "earn" && (
        <div>
          <Label className="text-sm mb-1.5 block">Points per AED 1 spent</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="e.g. 1.5"
              value={formData.earnRate}
              onChange={(e) => onChange({ earnRate: e.target.value })}
              className="max-w-[140px]"
            />
            <span className="text-sm text-slate-500">points per AED 1</span>
          </div>
        </div>
      )}

      {formData.ruleType === "cashback" && (
        <div>
          <Label className="text-sm mb-1.5 block">Cashback Percentage</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="30"
              placeholder="e.g. 5"
              value={formData.cashbackPct}
              onChange={(e) => onChange({ cashbackPct: e.target.value })}
              className="max-w-[100px]"
            />
            <span className="text-sm text-slate-500">% cashback</span>
          </div>
        </div>
      )}

      {formData.ruleType === "discount" && (
        <div>
          <Label className="text-sm mb-1.5 block">Discount Percentage</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 20"
              value={formData.discountPct}
              onChange={(e) => onChange({ discountPct: e.target.value })}
              className="max-w-[100px]"
            />
            <span className="text-sm text-slate-500">% discount</span>
          </div>
        </div>
      )}

      {formData.ruleType === "bogo" && (
        <div>
          <Label className="text-sm mb-1.5 block">Description (optional)</Label>
          <Input
            placeholder="e.g. Valid on dine-in only"
            value={formData.descriptionText}
            onChange={(e) => onChange({ descriptionText: e.target.value })}
          />
        </div>
      )}

      {formData.ruleType === "multiplier" && (
        <div>
          <Label className="text-sm mb-1.5 block">Multiplier</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              step="0.5"
              placeholder="e.g. 3"
              value={formData.multiplier}
              onChange={(e) => onChange({ multiplier: e.target.value })}
              className="max-w-[100px]"
            />
            <span className="text-sm text-slate-500">× points</span>
          </div>
        </div>
      )}

      {/* Optional conditions */}
      <Collapsible open={conditionsOpen} onOpenChange={setConditionsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
            <span>Optional conditions</span>
            {conditionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4 pl-1">
          {/* Days of week */}
          <div>
            <Label className="text-sm mb-2 block">Valid Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, idx) => (
                <label
                  key={day}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <Checkbox
                    checked={formData.daysOfWeek.includes(idx)}
                    onCheckedChange={(checked) => {
                      const days = checked
                        ? [...formData.daysOfWeek, idx]
                        : formData.daysOfWeek.filter((d) => d !== idx);
                      onChange({ daysOfWeek: days });
                    }}
                  />
                  <span className="text-xs font-medium text-slate-700">{day}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => onChange({ startDate: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => onChange({ endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Spend range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Min Spend (AED)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.minSpend}
                onChange={(e) => onChange({ minSpend: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Max Spend (AED)</Label>
              <Input
                type="number"
                placeholder="No limit"
                value={formData.maxSpend}
                onChange={(e) => onChange({ maxSpend: e.target.value })}
              />
            </div>
          </div>

          {/* Applies to */}
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Category Applies To</Label>
            <Input
              placeholder="e.g. Dine-in, Full price items"
              value={formData.appliesTo}
              onChange={(e) => onChange({ appliesTo: e.target.value })}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ─── Step 3: Evidence ─────────────────────────────────────────────────────────

function Step3({
  formData,
  onChange,
}: {
  formData: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  const confidence = calcConfidence(formData);
  const receiptPreview = formData.receiptFile
    ? URL.createObjectURL(formData.receiptFile)
    : null;
  const screenshotPreview = formData.screenshotFile
    ? URL.createObjectURL(formData.screenshotFile)
    : null;

  const confColor =
    confidence >= 70
      ? "bg-green-100 text-green-700 border-green-200"
      : confidence >= 50
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : "bg-yellow-100 text-yellow-700 border-yellow-200";

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Evidence</h2>
      <p className="text-sm text-slate-500">
        Upload evidence to boost your confidence score and help verify this rule faster.
      </p>

      {/* Confidence preview */}
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
        <span className="text-sm text-slate-600">Estimated confidence</span>
        <span
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border font-semibold",
            confColor
          )}
        >
          {confidence}/100
        </span>
      </div>

      {/* Receipt upload */}
      <div>
        <Label className="text-sm mb-1.5 flex items-center gap-2">
          <Camera className="w-4 h-4 text-slate-500" />
          Receipt Photo
          <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
            +20 confidence
          </Badge>
        </Label>
        <input
          id="receipt-upload"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onChange({ receiptFile: e.target.files?.[0] ?? null })}
        />
        {receiptPreview ? (
          <div className="relative">
            <img
              src={receiptPreview}
              alt="Receipt"
              className="h-40 w-full object-cover rounded-lg border"
            />
            <button
              onClick={() => onChange({ receiptFile: null })}
              className="absolute top-2 right-2 text-xs bg-white border rounded px-2 py-0.5 text-slate-600 hover:bg-red-50 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ) : (
          <label
            htmlFor="receipt-upload"
            className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
          >
            <Upload className="w-6 h-6 text-slate-300 mb-1" />
            <span className="text-sm text-slate-400">Tap to upload receipt</span>
          </label>
        )}
      </div>

      {/* Screenshot upload */}
      <div>
        <Label className="text-sm mb-1.5 flex items-center gap-2">
          <Camera className="w-4 h-4 text-slate-500" />
          Screenshot
          <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">
            +10 confidence
          </Badge>
        </Label>
        <input
          id="screenshot-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange({ screenshotFile: e.target.files?.[0] ?? null })}
        />
        {screenshotPreview ? (
          <div className="relative">
            <img
              src={screenshotPreview}
              alt="Screenshot"
              className="h-40 w-full object-cover rounded-lg border"
            />
            <button
              onClick={() => onChange({ screenshotFile: null })}
              className="absolute top-2 right-2 text-xs bg-white border rounded px-2 py-0.5 text-slate-600 hover:bg-red-50 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ) : (
          <label
            htmlFor="screenshot-upload"
            className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
          >
            <Upload className="w-6 h-6 text-slate-300 mb-1" />
            <span className="text-sm text-slate-400">Tap to upload screenshot</span>
          </label>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label className="text-sm mb-1.5 block">Notes (optional)</Label>
        <Textarea
          placeholder="Any additional context about this rule..."
          value={formData.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}

// ─── Step 4: Review + Submit ──────────────────────────────────────────────────

function Step4({
  formData,
  merchant,
  program,
  onSubmit,
  submitting,
}: {
  formData: FormData;
  merchant: MerchantItem | null;
  program: ProgramItem | null;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const confidence = calcConfidence(formData);

  const confColor =
    confidence >= 70
      ? "bg-green-100 text-green-700 border-green-200"
      : confidence >= 50
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : "bg-yellow-100 text-yellow-700 border-yellow-200";

  const ruleTypeMeta = RULE_TYPES.find((r) => r.type === formData.ruleType);

  function ruleValueSummary() {
    switch (formData.ruleType) {
      case "earn": return `${formData.earnRate} pts per AED 1`;
      case "cashback": return `${formData.cashbackPct}% cashback`;
      case "discount": return `${formData.discountPct}% discount`;
      case "bogo": return formData.descriptionText || "Buy 1 Get 1 Free";
      case "multiplier": return `${formData.multiplier}× points`;
      default: return "N/A";
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Review & Submit</h2>

      {/* Summary card */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Merchant</span>
          <span className="font-medium text-slate-900">
            {merchant?.display_name_en ?? "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Program</span>
          <span className="font-medium text-slate-900">
            {program?.display_name_en ?? "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Rule Type</span>
          <span className="font-medium text-slate-900">
            {ruleTypeMeta?.label ?? "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Value</span>
          <span className="font-medium text-blue-700">{ruleValueSummary()}</span>
        </div>
        {formData.daysOfWeek.length > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Valid Days</span>
            <span className="font-medium text-slate-900">
              {formData.daysOfWeek.map((d) => DAYS[d]).join(", ")}
            </span>
          </div>
        )}
        {(formData.startDate || formData.endDate) && (
          <div className="flex justify-between">
            <span className="text-slate-500">Date Range</span>
            <span className="font-medium text-slate-900">
              {formData.startDate || "Any"} → {formData.endDate || "Any"}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Confidence</span>
          <span className={cn("text-xs px-2.5 py-0.5 rounded-full border font-semibold", confColor)}>
            {confidence}/100
          </span>
        </div>
        {formData.receiptFile && (
          <div className="flex justify-between">
            <span className="text-slate-500">Evidence</span>
            <span className="text-green-600 font-medium">Receipt attached</span>
          </div>
        )}
        {formData.screenshotFile && (
          <div className="flex justify-between">
            <span className="text-slate-500">Screenshot</span>
            <span className="text-blue-600 font-medium">Attached</span>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          By submitting, you confirm this information is accurate to the best of your knowledge.
          False submissions may result in account restrictions.
        </p>
      </div>

      <Button
        className="w-full h-12 text-base"
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Submit Rule
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AddRule() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { language } = useAppContext();

  const prefillMerchantId = searchParams.get("merchantId");
  const [step, setStep] = useState(prefillMerchantId ? 1 : 1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    merchantId: prefillMerchantId,
    programId: "",
    ruleType: null,
    earnRate: "",
    cashbackPct: "",
    discountPct: "",
    multiplier: "",
    descriptionText: "",
    daysOfWeek: [],
    startDate: "",
    endDate: "",
    minSpend: "",
    maxSpend: "",
    appliesTo: "",
    notes: "",
    receiptFile: null,
    screenshotFile: null,
  });

  // Fetch prefilled merchant
  const { data: prefillMerchant } = useQuery({
    queryKey: ["merchant-prefill", prefillMerchantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchants")
        .select("id, display_name_en, display_name_ar, category, logo_url, is_verified")
        .eq("id", prefillMerchantId!)
        .single();
      return data as MerchantItem;
    },
    enabled: !!prefillMerchantId,
  });

  // Enrolled programs for display
  const { data: enrolledPrograms } = useQuery({
    queryKey: ["enrolled-programs-addrule-main", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("program_id, programs:program_id(id, slug, display_name_en, display_name_ar, logo_url, category)")
        .eq("user_id", user!.id);
      return (data ?? []).map((r) => (r as any).programs as ProgramItem).filter(Boolean);
    },
    enabled: !!user,
  });

  const patch = (p: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...p }));

  const selectedMerchant =
    prefillMerchant ??
    (formData.merchantId ? null : null);

  const selectedProgram = enrolledPrograms?.find((p) => p.id === formData.programId) ?? null;

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!formData.merchantId && !prefillMerchantId) return "Please select a merchant";
      if (!formData.programId) return "Please select a program";
    }
    if (s === 2) {
      if (!formData.ruleType) return "Please select a rule type";
      if (formData.ruleType === "earn" && !formData.earnRate) return "Please enter earn rate";
      if (formData.ruleType === "cashback" && !formData.cashbackPct) return "Please enter cashback %";
      if (formData.ruleType === "discount" && !formData.discountPct) return "Please enter discount %";
      if (formData.ruleType === "multiplier" && !formData.multiplier) return "Please enter multiplier";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const evidenceUrls: string[] = [];

      // Upload receipt
      if (formData.receiptFile) {
        const ext = formData.receiptFile.name.split(".").pop();
        const path = `evidence/${user.id}/${Date.now()}-receipt.${ext}`;
        const { error } = await supabase.storage.from("evidence").upload(path, formData.receiptFile);
        if (!error) {
          const { data } = supabase.storage.from("evidence").getPublicUrl(path);
          evidenceUrls.push(data.publicUrl);
        }
      }

      // Upload screenshot
      if (formData.screenshotFile) {
        const ext = formData.screenshotFile.name.split(".").pop();
        const path = `evidence/${user.id}/${Date.now()}-screenshot.${ext}`;
        const { error } = await supabase.storage.from("evidence").upload(path, formData.screenshotFile);
        if (!error) {
          const { data } = supabase.storage.from("evidence").getPublicUrl(path);
          evidenceUrls.push(data.publicUrl);
        }
      }

      const confidence = calcConfidence(formData);

      const { error } = await supabase.from("merchant_rules").insert({
        merchant_id: formData.merchantId ?? prefillMerchantId!,
        program_id: formData.programId,
        rule_type: formData.ruleType!,
        earn_rate: formData.earnRate ? parseFloat(formData.earnRate) : null,
        cashback_pct: formData.cashbackPct ? parseFloat(formData.cashbackPct) : null,
        discount_pct: formData.discountPct ? parseFloat(formData.discountPct) : null,
        multiplier: formData.multiplier ? parseFloat(formData.multiplier) : null,
        description_text: formData.descriptionText || null,
        days_of_week: formData.daysOfWeek,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        min_spend: formData.minSpend ? parseFloat(formData.minSpend) : 0,
        max_spend: formData.maxSpend ? parseFloat(formData.maxSpend) : null,
        applies_to_categories: formData.appliesTo ? [formData.appliesTo] : [],
        source: "user_submission",
        status: "pending",
        submitted_by_user_id: user.id,
        confidence_score: confidence,
        evidence_attachments: evidenceUrls,
      });

      if (error) throw error;

      toast.success("Rule submitted! You'll earn +10 reputation when it's verified.");
      navigate(prefillMerchantId ? `/dashboard/merchants/${prefillMerchantId}` : "/dashboard");
    } catch {
      toast.error("Failed to submit rule. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <StepHeader
        step={step}
        onBack={() => {
          if (step <= 1) navigate(-1);
          else setStep((s) => s - 1);
        }}
      />

      {step === 1 && (
        <Step1
          formData={formData}
          prefillMerchant={prefillMerchant ?? null}
          onChange={patch}
          language={language}
        />
      )}

      {step === 2 && <Step2 formData={formData} onChange={patch} />}

      {step === 3 && <Step3 formData={formData} onChange={patch} />}

      {step === 4 && (
        <Step4
          formData={formData}
          merchant={prefillMerchant ?? null}
          program={selectedProgram}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      {step < 4 && (
        <Button className="w-full h-12 mt-8 text-base" onClick={handleNext}>
          Continue
        </Button>
      )}
    </div>
  );
}
