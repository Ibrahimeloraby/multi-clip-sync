import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Search,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
  TrendingUp,
  Camera,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  display_name_en: string;
  display_name_ar: string;
  logo_url: string | null;
  category: string;
  default_earn_rate_aed: number;
  default_redemption_value_aed: number;
}

interface RecItem {
  program: ProgramItem;
  action_description: string;
  aed_equivalent: number;
  reasoning?: string;
}

interface RecommendResult {
  best: RecItem;
  alternatives: RecItem[];
  ai_reasoning: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPEND_CATEGORIES = [
  "General",
  "Groceries",
  "Electronics",
  "Dining",
  "Fashion",
  "Travel",
  "Fuel",
  "Pharmacy",
  "Entertainment",
];

const STEPS = ["Select Merchant", "Enter Amount", "Analyzing", "Result", "Log Transaction"];

// ─── Step Header ──────────────────────────────────────────────────────────────

function StepHeader({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {step > 1 && (
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      )}
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

// ─── Merchant Row ─────────────────────────────────────────────────────────────

function MerchantRow({
  m,
  language,
  onClick,
}: {
  m: MerchantItem;
  language: "en" | "ar";
  onClick: () => void;
}) {
  const initials = m.display_name_en.slice(0, 2).toUpperCase();
  const name = language === "ar" ? m.display_name_ar : m.display_name_en;

  return (
    <button
      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
        {m.logo_url ? (
          <img src={m.logo_url} alt={name} className="w-10 h-10 object-cover" />
        ) : (
          <span className="text-sm font-bold text-blue-600">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-900 truncate">{name}</span>
          {m.is_verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {m.category.slice(0, 3).map((cat) => (
            <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">
              {cat}
            </Badge>
          ))}
        </div>
      </div>
    </button>
  );
}

// ─── Step 1: Select Merchant ──────────────────────────────────────────────────

function StepSelectMerchant({
  language,
  onSelect,
}: {
  language: "en" | "ar";
  onSelect: (m: MerchantItem) => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  // Fetch recent merchants from localStorage
  const [recentLocalIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("loyaltyone_recent_merchants") ?? "[]");
    } catch {
      return [];
    }
  });

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["merchant-search-recommend", debouncedQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchants")
        .select("id, display_name_en, display_name_ar, category, logo_url, is_verified")
        .or(
          `display_name_en.ilike.%${debouncedQuery}%,display_name_ar.ilike.%${debouncedQuery}%`
        )
        .limit(20);
      return (data ?? []) as MerchantItem[];
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const { data: recentFromTx } = useQuery({
    queryKey: ["recent-merchants-recommend", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("merchant_id, merchants:merchant_id(id, display_name_en, display_name_ar, category, logo_url, is_verified)")
        .eq("user_id", user!.id)
        .not("merchant_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);
      const seen = new Set<string>();
      const unique: MerchantItem[] = [];
      for (const row of data ?? []) {
        const m = (row as any).merchants as MerchantItem;
        if (m && !seen.has(m.id)) {
          seen.add(m.id);
          unique.push(m);
        }
      }
      return unique.slice(0, 5);
    },
    enabled: !!user,
  });

  const displayList = debouncedQuery.trim() ? (searchResults ?? []) : [];
  const recents = recentFromTx ?? [];

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Where are you shopping?</h2>
      <p className="text-sm text-slate-500 mb-4">Search or pick a recent merchant</p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search merchants..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
        )}
      </div>

      {displayList.length > 0 && (
        <div className="divide-y divide-slate-50">
          {displayList.map((m) => (
            <MerchantRow
              key={m.id}
              m={m}
              language={language}
              onClick={() => {
                // Save to recent in localStorage
                try {
                  const curr: string[] = JSON.parse(
                    localStorage.getItem("loyaltyone_recent_merchants") ?? "[]"
                  );
                  const updated = [m.id, ...curr.filter((x) => x !== m.id)].slice(0, 5);
                  localStorage.setItem("loyaltyone_recent_merchants", JSON.stringify(updated));
                } catch {}
                onSelect(m);
              }}
            />
          ))}
        </div>
      )}

      {!debouncedQuery.trim() && recents.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Recent
          </h3>
          <div className="divide-y divide-slate-50">
            {recents.map((m) => (
              <MerchantRow
                key={m.id}
                m={m}
                language={language}
                onClick={() => onSelect(m)}
              />
            ))}
          </div>
        </div>
      )}

      {debouncedQuery.trim() && displayList.length === 0 && !searching && (
        <p className="text-sm text-slate-500 text-center py-8">
          No merchants found for "{debouncedQuery}"
        </p>
      )}
    </div>
  );
}

// ─── Step 2: Enter Amount ─────────────────────────────────────────────────────

function StepEnterAmount({
  merchant,
  language,
  onNext,
}: {
  merchant: MerchantItem;
  language: "en" | "ar";
  onNext: (amount: number, category?: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [error, setError] = useState("");

  const name = language === "ar" ? merchant.display_name_ar : merchant.display_name_en;

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    onNext(num, selectedCategory || undefined);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          {merchant.logo_url ? (
            <img src={merchant.logo_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-blue-600">
              {merchant.display_name_en.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{name}</p>
          {merchant.is_verified && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Verified merchant
            </p>
          )}
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-1">How much are you spending?</h2>
      <p className="text-sm text-slate-500 mb-5">Enter the amount in AED</p>

      <div className="mb-5">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
            AED
          </span>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            className="pl-16 h-16 text-3xl font-bold text-right pr-4 border-2"
          />
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <div className="mb-7">
        <Label className="text-sm text-slate-600 mb-2 block">Category (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {SPEND_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                selectedCategory === cat
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-200 text-slate-600 hover:border-blue-400"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSubmit} className="w-full h-12 text-base">
        Get Recommendation
      </Button>
    </div>
  );
}

// ─── Step 3: Thinking ─────────────────────────────────────────────────────────

const THINKING_LINES = [
  "Fetching your enrolled programs...",
  "Checking earn rates at this merchant...",
  "Evaluating active offers & multipliers...",
  "Calculating real AED value...",
  "Ranking by your spending patterns...",
  "Finalizing recommendation...",
];

function StepThinking({ programNames }: { programNames: string[] }) {
  const [visibleIdx, setVisibleIdx] = useState(0);

  useEffect(() => {
    if (visibleIdx >= THINKING_LINES.length - 1) return;
    const t = setTimeout(() => setVisibleIdx((i) => i + 1), 600);
    return () => clearTimeout(t);
  }, [visibleIdx]);

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative h-20 w-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping" />
        <div className="absolute inset-2 rounded-full border-4 border-blue-400 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="h-8 w-8 text-blue-600" />
        </div>
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-1">Analyzing your programs</h2>
      <p className="text-sm text-slate-500 mb-6">
        Comparing {programNames.length > 0 ? programNames.length : ""} enrolled programs...
      </p>

      <div className="w-full space-y-3">
        {THINKING_LINES.slice(0, visibleIdx + 1).map((line, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            {i < visibleIdx ? (
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
            )}
            <span className={i < visibleIdx ? "text-slate-400" : "text-slate-700"}>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Result ───────────────────────────────────────────────────────────

function ProgramAvatar({ program }: { program: ProgramItem }) {
  const initials = program.display_name_en.slice(0, 2).toUpperCase();
  if (program.logo_url) {
    return (
      <img
        src={program.logo_url}
        alt={program.display_name_en}
        className="w-12 h-12 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
      {initials}
    </div>
  );
}

function RecCard({ rec, isPrimary }: { rec: RecItem; isPrimary: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isPrimary
          ? "border-blue-400 bg-blue-50"
          : "border-slate-200 bg-white"
      )}
    >
      {isPrimary && (
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
            Best Choice
          </span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <ProgramAvatar program={rec.program} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{rec.program.display_name_en}</p>
          <p className="text-sm text-slate-500 mt-0.5">{rec.action_description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-bold text-green-600">
              ~AED {rec.aed_equivalent.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">estimated value</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepResult({
  result,
  onUsedThis,
  onUsedOther,
}: {
  result: RecommendResult;
  onUsedThis: () => void;
  onUsedOther: () => void;
}) {
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-4">Your Recommendation</h2>

      <RecCard rec={result.best} isPrimary />

      {result.alternatives.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium text-slate-500">Alternatives</h3>
          {result.alternatives.map((alt, i) => (
            <RecCard key={i} rec={alt} isPrimary={false} />
          ))}
        </div>
      )}

      <button
        className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
        onClick={() => setShowReasoning((v) => !v)}
      >
        <span>Why this?</span>
        {showReasoning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showReasoning && (
        <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 leading-relaxed border border-slate-200">
          {result.ai_reasoning}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <p className="text-center text-sm text-slate-500">Did you use this recommendation?</p>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onUsedThis}>
            I used this
          </Button>
          <Button variant="outline" className="flex-1" onClick={onUsedOther}>
            I used something else
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Log Transaction ──────────────────────────────────────────────────

function StepLogTransaction({
  merchant,
  amount,
  result,
  followedRecommendation,
  language,
  onLogged,
}: {
  merchant: MerchantItem;
  amount: number;
  result: RecommendResult;
  followedRecommendation: boolean;
  language: "en" | "ar";
  onLogged: () => void;
}) {
  const { user } = useAuth();
  const [selectedProgramId, setSelectedProgramId] = useState(result.best.program.id);
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: enrolledPrograms } = useQuery({
    queryKey: ["enrolled-programs-log", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("program_id, programs:program_id(id, display_name_en, display_name_ar)")
        .eq("user_id", user!.id);
      return (data ?? []).map((r) => (r as any).programs as ProgramItem).filter(Boolean);
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let receiptUrl: string | null = null;
      if (receiptFile) {
        const ext = receiptFile.name.split(".").pop();
        const path = `receipts/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("receipts")
          .upload(path, receiptFile);
        if (!uploadErr) {
          const { data } = supabase.storage.from("receipts").getPublicUrl(path);
          receiptUrl = data.publicUrl;
        }
      }

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        merchant_id: merchant.id,
        amount_aed: amount,
        was_recommendation_followed: followedRecommendation,
        notes: notes || null,
        receipt_url: receiptUrl,
      });

      if (error) throw error;
      toast.success("Transaction saved!");
      onLogged();
    } catch {
      toast.error("Failed to save transaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Log Transaction</h2>
      <p className="text-sm text-slate-500 mb-5">Save for your records</p>

      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Merchant</span>
            <span className="font-medium text-slate-900">
              {language === "ar" ? merchant.display_name_ar : merchant.display_name_en}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount</span>
            <span className="font-medium text-slate-900">AED {amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Followed recommendation</span>
            <span className={followedRecommendation ? "text-green-600 font-medium" : "text-slate-600"}>
              {followedRecommendation ? "Yes" : "No"}
            </span>
          </div>
        </div>

        <div>
          <Label className="text-sm mb-1.5 block">Program Used</Label>
          <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
            <SelectTrigger>
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              {(enrolledPrograms ?? [result.best.program]).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="receipt-log" className="text-sm flex items-center gap-2 cursor-pointer mb-1.5">
            <Camera className="w-4 h-4" />
            Receipt photo (optional)
          </Label>
          <input
            id="receipt-log"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setReceiptFile(file);
                setReceiptPreview(URL.createObjectURL(file));
              }
            }}
          />
          {receiptPreview ? (
            <img
              src={receiptPreview}
              alt="Receipt"
              className="h-32 w-full object-cover rounded-lg border"
            />
          ) : (
            <label
              htmlFor="receipt-log"
              className="flex items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
            >
              <span className="text-sm text-slate-400">Tap to add receipt</span>
            </label>
          )}
        </div>

        <div>
          <Label className="text-sm mb-1.5 block">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
          />
        </div>
      </div>

      <Button
        className="w-full h-12 mt-6 text-base"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Save Transaction
      </Button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RecommendFlow() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useAppContext();

  const [selectedMerchant, setSelectedMerchant] = useState<MerchantItem | null>(null);
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<string | undefined>();
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [followedRecommendation, setFollowedRecommendation] = useState(true);

  const step = parseInt(searchParams.get("step") ?? "1", 10);

  const setStep = useCallback(
    (s: number) => setSearchParams({ step: String(s) }),
    [setSearchParams]
  );

  const goBack = () => {
    if (step <= 1) navigate(-1);
    else setStep(step - 1);
  };

  const { data: enrolledPrograms } = useQuery({
    queryKey: ["enrolled-programs-recommend", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("program_id, programs:program_id(id, display_name_en, display_name_ar, logo_url, category, default_earn_rate_aed, default_redemption_value_aed)")
        .eq("user_id", user!.id);
      return (data ?? []).map((r) => (r as any).programs as ProgramItem).filter(Boolean);
    },
    enabled: !!user,
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-recommendation", {
        body: {
          merchant_id: selectedMerchant!.id,
          spend_estimate: amount,
          user_id: user!.id,
          category,
        },
      });
      if (error) throw error;
      return data as RecommendResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep(4);
    },
    onError: () => {
      // Fallback: pick the best enrolled program by default_redemption_value_aed
      const progs = enrolledPrograms ?? [];
      const best = [...progs].sort(
        (a, b) => b.default_redemption_value_aed - a.default_redemption_value_aed
      )[0];

      if (best) {
        const aedEquivalent = amount * best.default_earn_rate_aed * best.default_redemption_value_aed;
        const fallback: RecommendResult = {
          best: {
            program: best,
            action_description: `Pay with ${best.display_name_en} to earn points`,
            aed_equivalent: parseFloat(aedEquivalent.toFixed(2)),
            reasoning: "Based on your program's default earn rate.",
          },
          alternatives: [],
          ai_reasoning: `Based on your enrolled programs, ${best.display_name_en} offers the best default redemption value (AED ${best.default_redemption_value_aed} per point).`,
        };
        setResult(fallback);
      }
      setStep(4);
    },
  });

  useEffect(() => {
    if (step === 3 && selectedMerchant && amount > 0 && !result) {
      aiMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {step !== 3 && <StepHeader step={step} onBack={goBack} />}

      {step === 1 && (
        <StepSelectMerchant
          language={language}
          onSelect={(m) => {
            setSelectedMerchant(m);
            setStep(2);
          }}
        />
      )}

      {step === 2 && selectedMerchant && (
        <StepEnterAmount
          merchant={selectedMerchant}
          language={language}
          onNext={(amt, cat) => {
            setAmount(amt);
            setCategory(cat);
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <StepThinking programNames={(enrolledPrograms ?? []).map((p) => p.display_name_en)} />
      )}

      {step === 4 && result && (
        <StepResult
          result={result}
          onUsedThis={() => {
            setFollowedRecommendation(true);
            setStep(5);
          }}
          onUsedOther={() => {
            setFollowedRecommendation(false);
            setStep(5);
          }}
        />
      )}

      {step === 5 && result && selectedMerchant && (
        <StepLogTransaction
          merchant={selectedMerchant}
          amount={amount}
          result={result}
          followedRecommendation={followedRecommendation}
          language={language}
          onLogged={() => navigate("/dashboard")}
        />
      )}
    </div>
  );
}
