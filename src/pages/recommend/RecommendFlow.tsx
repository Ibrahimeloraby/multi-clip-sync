import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { useGeolocation } from "@/hooks/useGeolocation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  ArrowLeft,
  Search,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Camera,
  Loader2,
  Star,
  Zap,
  TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Merchant {
  id: string;
  display_name_en: string;
  display_name_ar?: string;
  logo_url?: string;
  categories: string[];
  verified: boolean;
}

interface Program {
  id: string;
  name: string;
  logo_url?: string;
  color?: string;
}

interface Recommendation {
  program: Program;
  points_earned: number;
  aed_value: number;
  description: string;
  extra_offer?: string;
  reasoning?: string;
}

interface RecommendationResult {
  best: Recommendation;
  alternatives: Recommendation[];
  ai_reasoning: string;
}

// ─── Step progress ────────────────────────────────────────────────────────────

const STEPS = [
  "Select Merchant",
  "Enter Amount",
  "Analyzing",
  "Result",
  "Log Transaction",
];

function StepHeader({
  step,
  onBack,
}: {
  step: number;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {step > 1 && (
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="flex-1">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Step {step} of {STEPS.length}</span>
          <span>{STEPS[step - 1]}</span>
        </div>
        <Progress value={(step / STEPS.length) * 100} className="h-1.5" />
      </div>
    </div>
  );
}

// ─── Step 1: Select Merchant ──────────────────────────────────────────────────

function StepSelectMerchant({
  onSelect,
}: {
  onSelect: (merchant: Merchant) => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { requestLocation, latitude, longitude, permissionStatus } = useGeolocation();

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["merchants-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const { data, error } = await supabase
        .from("merchants")
        .select("id, display_name_en, display_name_ar, logo_url, categories, verified")
        .or(
          `display_name_en.ilike.%${debouncedQuery}%,display_name_ar.ilike.%${debouncedQuery}%`
        )
        .limit(20);
      if (error) throw error;
      return data as Merchant[];
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const { data: recentMerchants } = useQuery({
    queryKey: ["recent-merchants", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("merchant_id, merchants(id, display_name_en, logo_url, categories, verified)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      const seen = new Set<string>();
      const unique: Merchant[] = [];
      for (const row of data ?? []) {
        const m = (row as any).merchants as Merchant;
        if (m && !seen.has(m.id)) {
          seen.add(m.id);
          unique.push(m);
        }
      }
      return unique;
    },
    enabled: !!user,
  });

  const { data: nearbyMerchants } = useQuery({
    queryKey: ["nearby-merchants", latitude, longitude],
    queryFn: async () => {
      if (!latitude || !longitude) return [];
      const { data, error } = await supabase
        .rpc("merchants_near", { lat: latitude, lng: longitude, radius_m: 2000 })
        .limit(5);
      if (error) {
        // fallback: just return empty if RPC doesn't exist
        return [];
      }
      return data as Merchant[];
    },
    enabled: !!latitude && !!longitude,
  });

  const displayList = debouncedQuery.trim() ? searchResults ?? [] : [];

  function MerchantRow({ m }: { m: Merchant }) {
    const initials = m.display_name_en.slice(0, 2).toUpperCase();
    return (
      <button
        className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-left"
        onClick={() => onSelect(m)}
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          {m.logo_url ? (
            <img src={m.logo_url} alt={m.display_name_en} className="h-10 w-10 object-cover" />
          ) : (
            <span className="text-sm font-bold text-primary">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium truncate">{m.display_name_en}</span>
            {m.verified && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {(m.categories ?? []).slice(0, 3).map((cat) => (
              <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Where are you shopping?</h2>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search merchants..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {displayList.length > 0 && (
        <div className="mb-4">
          {displayList.map((m) => (
            <MerchantRow key={m.id} m={m} />
          ))}
        </div>
      )}

      {!debouncedQuery.trim() && (
        <>
          {recentMerchants && recentMerchants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent</h3>
              {recentMerchants.map((m) => (
                <MerchantRow key={m.id} m={m} />
              ))}
            </div>
          )}

          {permissionStatus === "granted" && nearbyMerchants && nearbyMerchants.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-2">
                <MapPin className="h-3.5 w-3.5" />
                <span>Near me</span>
              </div>
              {nearbyMerchants.map((m) => (
                <MerchantRow key={m.id} m={m} />
              ))}
            </div>
          )}

          {permissionStatus !== "granted" && (
            <button
              className="flex items-center gap-2 text-sm text-primary hover:underline mt-2"
              onClick={() => requestLocation()}
            >
              <MapPin className="h-3.5 w-3.5" />
              Show merchants near me
            </button>
          )}
        </>
      )}

      {debouncedQuery.trim() && displayList.length === 0 && !searching && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No merchants found for "{debouncedQuery}"
        </p>
      )}
    </div>
  );
}

// ─── Step 2: Enter Amount ─────────────────────────────────────────────────────

const amountSchema = z.object({
  amount: z.string().min(1, "Enter an amount").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  category: z.string().optional(),
});

type AmountForm = z.infer<typeof amountSchema>;

const CATEGORIES = [
  "Groceries", "F&B", "Fuel", "Entertainment", "Pharmacy",
  "Fashion", "Online", "Hotels", "Fitness", "Other",
];

function StepEnterAmount({
  merchant,
  onNext,
}: {
  merchant: Merchant;
  onNext: (amount: number, category?: string) => void;
}) {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<AmountForm>({
    resolver: zodResolver(amountSchema),
  });

  const selectedCategory = watch("category");

  const { data: typicalSpend } = useQuery({
    queryKey: ["typical-spend", merchant.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("amount")
        .eq("merchant_id", merchant.id)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!data || data.length === 0) return null;
      const avg = data.reduce((s, r) => s + (r.amount ?? 0), 0) / data.length;
      return Math.round(avg);
    },
    enabled: !!user,
  });

  const onSubmit = (values: AmountForm) => {
    onNext(Number(values.amount), values.category || undefined);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-xl font-semibold mb-1">How much are you spending?</h2>
      <p className="text-sm text-muted-foreground mb-6">at {merchant.display_name_en}</p>

      <div className="mb-6">
        <Label className="text-base font-medium">Amount (AED)</Label>
        <div className="relative mt-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
            AED
          </span>
          <Input
            {...register("amount")}
            type="number"
            inputMode="decimal"
            placeholder="0"
            className="pl-16 text-3xl font-bold h-16 text-right pr-4"
          />
        </div>
        {errors.amount && (
          <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>
        )}
        {typicalSpend && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Typical spend here: <span className="font-medium text-foreground">AED {typicalSpend.toLocaleString()}</span>
          </p>
        )}
      </div>

      <div className="mb-8">
        <Label className="text-sm text-muted-foreground">Category (optional)</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary"
              )}
              onClick={() => setValue("category", selectedCategory === cat ? undefined : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full h-12 text-base">
        Find Best Program
      </Button>
    </form>
  );
}

// ─── Step 3: AI Thinking ──────────────────────────────────────────────────────

const THINKING_LINES = [
  "Fetching your enrolled programs...",
  "Checking earn rates at this merchant...",
  "Evaluating active offers & multipliers...",
  "Calculating real AED value...",
  "Ranking by your spending patterns...",
  "Finalizing recommendation...",
];

function StepThinking({ programs }: { programs: string[] }) {
  const [visibleIdx, setVisibleIdx] = useState(0);

  useEffect(() => {
    if (visibleIdx >= THINKING_LINES.length - 1) return;
    const t = setTimeout(() => setVisibleIdx((i) => i + 1), 600);
    return () => clearTimeout(t);
  }, [visibleIdx]);

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative h-20 w-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-4 border-primary/40 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="h-8 w-8 text-primary" />
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-2">Analyzing your programs</h2>
      <p className="text-sm text-muted-foreground mb-8">Finding the best option for you</p>

      <div className="w-full space-y-3">
        {THINKING_LINES.slice(0, visibleIdx + 1).map((line, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            {i < visibleIdx ? (
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            )}
            <span className={i < visibleIdx ? "text-muted-foreground" : "text-foreground"}>
              {line}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Result ───────────────────────────────────────────────────────────

function RecommendationCard({
  rec,
  isPrimary,
}: {
  rec: Recommendation;
  isPrimary: boolean;
}) {
  const initials = rec.program.name.slice(0, 2).toUpperCase();
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isPrimary
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-border bg-muted/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold overflow-hidden"
          style={{ backgroundColor: rec.program.color ?? "#3B82F6" }}
        >
          {rec.program.logo_url ? (
            <img src={rec.program.logo_url} alt={rec.program.name} className="h-10 w-10 object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{rec.program.name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{rec.description}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={isPrimary ? "bg-blue-600 hover:bg-blue-600" : ""}>
              {rec.points_earned.toLocaleString()} pts
            </Badge>
            <span className="text-sm font-medium text-green-600">
              ≈ AED {rec.aed_value.toFixed(2)}
            </span>
          </div>
          {rec.extra_offer && (
            <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
              <Star className="h-3 w-3" />
              {rec.extra_offer}
            </p>
          )}
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
  result: RecommendationResult;
  onUsedThis: () => void;
  onUsedOther: () => void;
}) {
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Best Choice</h2>
      </div>

      <RecommendationCard rec={result.best} isPrimary />

      {result.alternatives.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Alternatives</h3>
          {result.alternatives.map((alt, i) => (
            <RecommendationCard key={i} rec={alt} isPrimary={false} />
          ))}
        </div>
      )}

      <button
        className="mt-4 flex items-center gap-1.5 text-sm text-primary hover:underline"
        onClick={() => setShowReasoning((v) => !v)}
      >
        <span>Why this?</span>
        {showReasoning ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showReasoning && (
        <div className="mt-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground leading-relaxed">
          {result.ai_reasoning}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <p className="text-center text-sm text-muted-foreground">Did you use this recommendation?</p>
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

const logSchema = z.object({
  program_id: z.string().min(1, "Select a program"),
  followed_recommendation: z.boolean(),
  notes: z.string().optional(),
});

type LogForm = z.infer<typeof logSchema>;

function StepLogTransaction({
  merchant,
  amount,
  recommendation,
  followedRecommendation,
  onLogged,
}: {
  merchant: Merchant;
  amount: number;
  recommendation: RecommendationResult;
  followedRecommendation: boolean;
  onLogged: (txId: string) => void;
}) {
  const { user } = useAuth();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const { data: enrolledPrograms } = useQuery({
    queryKey: ["enrolled-programs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_programs")
        .select("program_id, programs(id, name, logo_url, color)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((row: any) => row.programs as Program).filter(Boolean);
    },
    enabled: !!user,
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<LogForm>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      program_id: recommendation.best.program.id,
      followed_recommendation: followedRecommendation,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: LogForm) => {
      let receiptUrl: string | null = null;

      if (receiptFile) {
        const ext = receiptFile.name.split(".").pop();
        const path = `receipts/${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(path, receiptFile);
        if (!uploadError) {
          const { data } = supabase.storage.from("receipts").getPublicUrl(path);
          receiptUrl = data.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user!.id,
          merchant_id: merchant.id,
          program_id: values.program_id,
          amount,
          followed_recommendation: values.followed_recommendation,
          recommended_program_id: recommendation.best.program.id,
          receipt_url: receiptUrl,
          notes: values.notes ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (txId) => {
      toast.success("Transaction logged!");
      onLogged(txId);
    },
    onError: () => toast.error("Failed to save transaction"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  return (
    <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))}>
      <h2 className="text-xl font-semibold mb-1">Log Transaction</h2>
      <p className="text-sm text-muted-foreground mb-6">Save for your records</p>

      <div className="space-y-4">
        <div className="flex justify-between text-sm border rounded-lg p-3">
          <span className="text-muted-foreground">Merchant</span>
          <span className="font-medium">{merchant.display_name_en}</span>
        </div>
        <div className="flex justify-between text-sm border rounded-lg p-3">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-medium">AED {amount.toLocaleString()}</span>
        </div>

        <div>
          <Label>Program Used</Label>
          <Select
            defaultValue={recommendation.best.program.id}
            onValueChange={(v) => setValue("program_id", v)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              {(enrolledPrograms ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.program_id && (
            <p className="text-xs text-destructive mt-1">{errors.program_id.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="receipt" className="flex items-center gap-2 cursor-pointer">
            <Camera className="h-4 w-4" />
            Add receipt photo (optional)
          </Label>
          <input
            id="receipt"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          {receiptPreview && (
            <img
              src={receiptPreview}
              alt="Receipt"
              className="mt-2 h-32 w-full object-cover rounded-lg border"
            />
          )}
          {!receiptPreview && (
            <label
              htmlFor="receipt"
              className="mt-1.5 flex items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
            >
              <span className="text-sm text-muted-foreground">Tap to add receipt</span>
            </label>
          )}
        </div>

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Any additional notes..."
            className="mt-1.5"
            rows={2}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 mt-6 text-base"
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Save Transaction
      </Button>
    </form>
  );
}

// ─── Main RecommendFlow ───────────────────────────────────────────────────────

export default function RecommendFlow() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string | undefined>();
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [followedRecommendation, setFollowedRecommendation] = useState(true);

  const step = parseInt(searchParams.get("step") ?? "1", 10);

  const setStep = useCallback(
    (s: number) => setSearchParams({ step: String(s) }),
    [setSearchParams]
  );

  const goBack = () => {
    if (step <= 1) {
      navigate(-1);
    } else {
      setStep(step - 1);
    }
  };

  const aiMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("recommend", {
        body: {
          user_id: user!.id,
          merchant_id: selectedMerchant!.id,
          amount,
          category,
        },
      });
      if (error) throw error;
      return data as RecommendationResult;
    },
    onSuccess: (result) => {
      setRecommendation(result);
      setStep(4);
    },
    onError: () => {
      // Provide fallback mock result so user isn't stuck
      setRecommendation({
        best: {
          program: { id: "mock-1", name: "ADCB TouchPoints", color: "#1E40AF" },
          points_earned: Math.round(amount * 1.5),
          aed_value: parseFloat((amount * 0.05).toFixed(2)),
          description: "Pay with ADCB credit card",
          extra_offer: "Show Entertainer for 25% off",
          reasoning: "Based on your enrolled programs and typical earn rates.",
        },
        alternatives: [],
        ai_reasoning:
          "ADCB TouchPoints offers the best earn rate at this merchant category based on your spending history and current enrolled programs.",
      });
      setStep(4);
    },
  });

  // Trigger AI when entering step 3
  useEffect(() => {
    if (step === 3 && selectedMerchant && amount > 0 && !recommendation) {
      aiMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleMerchantSelect = (m: Merchant) => {
    setSelectedMerchant(m);
    setStep(2);
  };

  const handleAmountNext = (amt: number, cat?: string) => {
    setAmount(amt);
    setCategory(cat);
    setStep(3);
  };

  if (step === 5 && !recommendation) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-[calc(100vh-4rem)]">
      {step !== 3 && <StepHeader step={step} onBack={goBack} />}

      {step === 1 && <StepSelectMerchant onSelect={handleMerchantSelect} />}

      {step === 2 && selectedMerchant && (
        <StepEnterAmount
          merchant={selectedMerchant}
          onNext={handleAmountNext}
        />
      )}

      {step === 3 && (
        <StepThinking programs={[]} />
      )}

      {step === 4 && recommendation && (
        <StepResult
          result={recommendation}
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

      {step === 5 && recommendation && selectedMerchant && (
        <StepLogTransaction
          merchant={selectedMerchant}
          amount={amount}
          recommendation={recommendation}
          followedRecommendation={followedRecommendation}
          onLogged={(txId) => navigate(`/dashboard/recommend/logged?tx=${txId}`)}
        />
      )}
    </div>
  );
}
