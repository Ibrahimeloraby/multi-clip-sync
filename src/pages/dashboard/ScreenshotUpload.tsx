import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Camera, Upload, X, CheckCircle2, Loader2 } from "lucide-react";

interface ParseResult {
  program_slug: string | null;
  balance_after: number | null;
  expiry_date: string | null;
  tier: string | null;
  confidence: number;
}

export default function ScreenshotUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, isRTL } = useAppContext();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Editable fields (pre-filled from parse result)
  const [editBalance, setEditBalance] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [editTier, setEditTier] = useState("");
  const [editProgramId, setEditProgramId] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: programs } = useQuery({
    queryKey: ["all-programs-screenshot"],
    queryFn: async () => {
      const { data } = await supabase
        .from("programs")
        .select("id, slug, display_name_en, display_name_ar")
        .order("display_name_en");
      return (data as any[]) ?? [];
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setParseResult(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !user) return;
    setAnalyzing(true);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:...;base64,
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const { data, error } = await supabase.functions.invoke(
        "parse-screenshot",
        {
          body: { image: base64, user_id: user.id },
        }
      );

      if (error) throw error;

      const result: ParseResult = data ?? {
        program_slug: null,
        balance_after: null,
        expiry_date: null,
        tier: null,
        confidence: 0,
      };
      setParseResult(result);

      // Pre-fill editable fields
      if (result.balance_after != null) setEditBalance(String(result.balance_after));
      if (result.expiry_date) setEditExpiry(result.expiry_date.slice(0, 10));
      if (result.tier) setEditTier(result.tier);

      // Try to match program by slug
      if (result.program_slug && programs) {
        const match = programs.find(
          (p: any) =>
            p.slug === result.program_slug ||
            p.slug.includes(result.program_slug ?? "")
        );
        if (match) setEditProgramId(match.id);
      }

      toast.success(
        language === "ar"
          ? "تم تحليل لقطة الشاشة بنجاح!"
          : "Screenshot analyzed successfully!"
      );
    } catch (e: any) {
      console.error(e);
      toast.error(
        language === "ar"
          ? "فشل التحليل. يرجى المحاولة مجدداً."
          : "Analysis failed. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!user || !editProgramId) {
      toast.error(
        language === "ar"
          ? "يرجى اختيار البرنامج"
          : "Please select a program"
      );
      return;
    }
    setSaving(true);
    try {
      const balance = parseFloat(editBalance) || 0;
      const expiryDates =
        editExpiry && balance > 0
          ? [{ amount: balance, expires_at: editExpiry }]
          : [];

      const { error } = await supabase.from("user_programs").upsert(
        {
          user_id: user.id,
          program_id: editProgramId,
          current_balance: balance,
          tier_name: editTier || null,
          expiry_dates: expiryDates,
          tracking_method: "screenshot",
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,program_id" }
      );
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-programs"] });
      toast.success(
        language === "ar" ? "تم الحفظ بنجاح!" : "Saved successfully!"
      );
      navigate("/dashboard/programs");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const t = {
    en: {
      title: "Upload Statement Screenshot",
      dropZone: "Tap to select image or take photo",
      changeFile: "Change image",
      analyze: "Analyze",
      analyzing: "Analyzing screenshot...",
      results: "Extracted Information",
      confidence: (pct: number) => `Confidence: ${(pct * 100).toFixed(0)}%`,
      program: "Program",
      selectProgram: "Select program",
      balance: "Balance (points)",
      expiry: "Expiry date",
      tier: "Tier (optional)",
      save: "Save to My Programs",
      saving: "Saving...",
      noFile: "No file selected",
    },
    ar: {
      title: "رفع لقطة شاشة الكشف",
      dropZone: "اضغط لاختيار صورة أو التقاط صورة",
      changeFile: "تغيير الصورة",
      analyze: "تحليل",
      analyzing: "جارٍ تحليل لقطة الشاشة...",
      results: "المعلومات المستخرجة",
      confidence: (pct: number) => `الثقة: ${(pct * 100).toFixed(0)}%`,
      program: "البرنامج",
      selectProgram: "اختر البرنامج",
      balance: "الرصيد (نقاط)",
      expiry: "تاريخ الانتهاء",
      tier: "المستوى (اختياري)",
      save: "حفظ في برامجي",
      saving: "جارٍ الحفظ...",
      noFile: "لم يتم اختيار ملف",
    },
  };

  const copy = t[language];

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
        {/* File drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative bg-white rounded-2xl border-2 border-dashed border-blue-200 overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
        >
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-64 object-contain bg-slate-50"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setPreview(null);
                  setParseResult(null);
                  setEditBalance("");
                  setEditExpiry("");
                  setEditTier("");
                  setEditProgramId("");
                }}
                className="absolute top-2 end-2 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Camera className="w-12 h-12 text-blue-300" />
              <p className="text-sm font-medium text-slate-600 text-center px-4">
                {copy.dropZone}
              </p>
              <p className="text-xs text-slate-400">JPG, PNG</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Analyze button */}
        {selectedFile && !parseResult && (
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {copy.analyzing}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {copy.analyze}
              </>
            )}
          </Button>
        )}

        {/* Results / Edit form */}
        {parseResult && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {copy.results}
              </h2>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {copy.confidence(parseResult.confidence)}
              </span>
            </div>

            {/* Program select */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block text-slate-700">
                {copy.program}
              </Label>
              <select
                value={editProgramId}
                onChange={(e) => setEditProgramId(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{copy.selectProgram}</option>
                {(programs ?? []).map((prog: any) => (
                  <option key={prog.id} value={prog.id}>
                    {isRTL ? prog.display_name_ar : prog.display_name_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Balance */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block text-slate-700">
                {copy.balance}
              </Label>
              <Input
                type="number"
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
                placeholder="e.g. 10000"
                className="h-11 rounded-xl"
              />
            </div>

            {/* Expiry */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block text-slate-700">
                {copy.expiry}
              </Label>
              <Input
                type="date"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Tier */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block text-slate-700">
                {copy.tier}
              </Label>
              <Input
                value={editTier}
                onChange={(e) => setEditTier(e.target.value)}
                placeholder="e.g. Gold"
                className="h-11 rounded-xl"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !editProgramId}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              {saving ? copy.saving : copy.save}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
