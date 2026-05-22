import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";
import { Plus, Search, CreditCard, Check } from "lucide-react";

interface Program {
  id: string;
  slug: string;
  display_name_en: string;
  display_name_ar: string;
  logo_url: string | null;
  category: string;
  default_earn_rate_aed: number;
  default_redemption_value_aed: number;
}

interface UserProgram {
  id: string;
  user_id: string;
  program_id: string;
  current_balance: number;
  tier_name: string | null;
  last_updated_at: string;
  tracking_method: string;
  program?: Program;
}

const CATEGORY_COLORS: Record<string, string> = {
  airline: "bg-sky-100 text-sky-700",
  hotel: "bg-purple-100 text-purple-700",
  banking: "bg-emerald-100 text-emerald-700",
  retail: "bg-orange-100 text-orange-700",
  telecom: "bg-pink-100 text-pink-700",
  fuel: "bg-yellow-100 text-yellow-700",
  default: "bg-slate-100 text-slate-600",
};

const GRADIENT_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-500",
  "from-green-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-500",
];

const CATEGORIES = ["all", "airline", "hotel", "banking", "retail", "telecom", "fuel"];

export default function ProgramsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, isRTL } = useAppContext();
  const queryClient = useQueryClient();

  const [filterCategory, setFilterCategory] = useState("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [programSearch, setProgramSearch] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: userPrograms, isLoading } = useQuery<UserProgram[]>({
    queryKey: ["user-programs-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("*, program:programs(*)")
        .eq("user_id", user!.id)
        .order("last_updated_at", { ascending: false });
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const { data: allPrograms } = useQuery<Program[]>({
    queryKey: ["all-programs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("programs")
        .select("*")
        .order("display_name_en");
      return (data as Program[]) ?? [];
    },
    enabled: addModalOpen,
  });

  const filtered = (userPrograms ?? []).filter((up) => {
    if (filterCategory === "all") return true;
    return up.program?.category === filterCategory;
  });

  const handleAddProgram = async () => {
    if (!selectedProgram || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("user_programs").upsert(
        {
          user_id: user.id,
          program_id: selectedProgram.id,
          current_balance: parseFloat(newBalance) || 0,
          tracking_method: "manual",
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,program_id" }
      );
      if (error) throw error;
      toast.success("Program added!");
      queryClient.invalidateQueries({ queryKey: ["user-programs-list"] });
      queryClient.invalidateQueries({ queryKey: ["user-programs"] });
      setAddModalOpen(false);
      setSelectedProgram(null);
      setNewBalance("");
      setProgramSearch("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add program");
    } finally {
      setSaving(false);
    }
  };

  const filteredAllPrograms = (allPrograms ?? []).filter((p) => {
    const q = programSearch.toLowerCase();
    return (
      p.display_name_en.toLowerCase().includes(q) ||
      p.display_name_ar.includes(q) ||
      p.category.includes(q)
    );
  });

  const t = {
    en: {
      title: "My Programs",
      add: "Add Program",
      all: "All",
      empty: "No programs yet",
      emptyDesc: "Add your first loyalty program to start tracking rewards",
      addFirst: "Add Program",
      balance: "Balance (points)",
      save: "Add Program",
      searchPrograms: "Search programs...",
      catLabel: (c: string) => c.charAt(0).toUpperCase() + c.slice(1),
      aed: (n: number) =>
        `≈ AED ${(n).toFixed(2)}`,
      tier: "Tier",
    },
    ar: {
      title: "برامجي",
      add: "إضافة برنامج",
      all: "الكل",
      empty: "لا توجد برامج بعد",
      emptyDesc: "أضف برنامج الولاء الأول لبدء تتبع المكافآت",
      addFirst: "إضافة برنامج",
      balance: "الرصيد (نقاط)",
      save: "إضافة برنامج",
      searchPrograms: "ابحث في البرامج...",
      catLabel: (c: string) => c,
      aed: (n: number) => `≈ AED ${n.toFixed(2)}`,
      tier: "المستوى",
    },
  };

  const copy = t[language];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900">{copy.title}</h1>
        <Button
          onClick={() => setAddModalOpen(true)}
          size="sm"
          className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-1"
        >
          <Plus className="w-4 h-4" />
          {copy.add}
        </Button>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filterCategory === cat
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat === "all" ? copy.all : copy.catLabel(cat)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 px-4 space-y-3 pb-24">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CreditCard />}
            title={copy.empty}
            description={copy.emptyDesc}
            action={{ label: copy.addFirst, onClick: () => setAddModalOpen(true) }}
          />
        ) : (
          filtered.map((up) => {
            const prog = up.program;
            const name = prog
              ? isRTL
                ? prog.display_name_ar
                : prog.display_name_en
              : "Unknown";
            const initials = (prog?.display_name_en ?? "??")
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();
            const gradient =
              GRADIENT_COLORS[up.program_id.charCodeAt(0) % GRADIENT_COLORS.length];
            const catColor =
              CATEGORY_COLORS[prog?.category ?? ""] ?? CATEGORY_COLORS.default;
            const redemptionRate = prog?.default_redemption_value_aed ?? 0.01;
            const aedValue = up.current_balance * redemptionRate;

            return (
              <button
                key={up.id}
                onClick={() => navigate(`/dashboard/programs/${up.id}`)}
                className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all text-start"
              >
                {prog?.logo_url ? (
                  <img
                    src={prog.logo_url}
                    alt={name}
                    className="w-14 h-14 rounded-xl object-contain border border-slate-100 flex-shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-base flex-shrink-0`}
                  >
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 truncate">{name}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 border-0 ${catColor}`}>
                      {prog?.category}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {up.current_balance.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-slate-400">pts</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {copy.aed(aedValue)}
                    {up.tier_name && (
                      <span className="ms-2 text-blue-600">
                        {copy.tier}: {up.tier_name}
                      </span>
                    )}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddModalOpen(true)}
        className="fixed bottom-20 end-4 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center text-white transition-transform active:scale-95 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Add program modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{copy.add}</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={copy.searchPrograms}
              value={programSearch}
              onChange={(e) => setProgramSearch(e.target.value)}
              className="ps-9 rounded-xl"
            />
          </div>

          {/* Program list */}
          <div className="max-h-52 overflow-y-auto space-y-1.5">
            {filteredAllPrograms.map((prog) => {
              const name = isRTL ? prog.display_name_ar : prog.display_name_en;
              const isSelected = selectedProgram?.id === prog.id;
              const gradient =
                GRADIENT_COLORS[prog.id.charCodeAt(0) % GRADIENT_COLORS.length];
              const initials = prog.display_name_en
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase();

              return (
                <button
                  key={prog.id}
                  onClick={() => setSelectedProgram(isSelected ? null : prog)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-start ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-transparent bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  {prog.logo_url ? (
                    <img
                      src={prog.logo_url}
                      alt={name}
                      className="w-8 h-8 rounded-lg object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
                    >
                      {initials}
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                    {name}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Balance input */}
          {selectedProgram && (
            <div>
              <Label className="text-sm font-medium mb-1.5 block text-slate-700">
                {copy.balance}
              </Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
          )}

          <Button
            onClick={handleAddProgram}
            disabled={!selectedProgram || saving}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold"
          >
            {saving ? "Saving..." : copy.save}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
