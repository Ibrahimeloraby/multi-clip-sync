import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MerchantRow {
  id: string;
  slug: string;
  display_name_en: string;
  display_name_ar: string;
  category: string[];
  logo_url: string | null;
  is_verified: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "All",
  "Groceries",
  "F&B",
  "Fuel",
  "Entertainment",
  "Pharmacy",
  "Fashion",
  "Online",
  "Hotels",
  "Fitness",
];

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: "bg-green-500",
  "F&B": "bg-orange-500",
  Fuel: "bg-yellow-500",
  Entertainment: "bg-purple-500",
  Pharmacy: "bg-red-500",
  Fashion: "bg-pink-500",
  Online: "bg-blue-500",
  Hotels: "bg-indigo-500",
  Fitness: "bg-teal-500",
  General: "bg-slate-400",
};

const PAGE_SIZE = 20;

// ─── Merchant Initials Circle ─────────────────────────────────────────────────

function MerchantAvatar({
  merchant,
  size = "md",
}: {
  merchant: MerchantRow;
  size?: "sm" | "md" | "lg";
}) {
  const initials = merchant.display_name_en.slice(0, 2).toUpperCase();
  const primaryCategory = merchant.category[0] ?? "General";
  const bg = CATEGORY_COLORS[primaryCategory] ?? "bg-slate-400";
  const sizeClass =
    size === "lg" ? "w-16 h-16 text-xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-12 h-12 text-sm";

  if (merchant.logo_url) {
    return (
      <img
        src={merchant.logo_url}
        alt={merchant.display_name_en}
        className={cn("rounded-full object-cover flex-shrink-0", sizeClass)}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white",
        sizeClass,
        bg
      )}
    >
      {initials}
    </div>
  );
}

// ─── Merchant Card ────────────────────────────────────────────────────────────

function MerchantCard({
  merchant,
  ruleCount,
  language,
  onClick,
}: {
  merchant: MerchantRow;
  ruleCount: number;
  language: "en" | "ar";
  onClick: () => void;
}) {
  const name = language === "ar" ? merchant.display_name_ar : merchant.display_name_en;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 hover:border-blue-400 hover:shadow-sm transition-all text-left w-full"
    >
      <div className="flex items-start gap-3">
        <MerchantAvatar merchant={merchant} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm leading-snug truncate max-w-[160px]">
              {name}
            </span>
            {merchant.is_verified && (
              <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {merchant.category.slice(0, 2).map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600"
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {ruleCount > 0
            ? `${ruleCount} rule${ruleCount !== 1 ? "s" : ""}`
            : "No rules yet"}
        </span>
        {ruleCount > 0 && (
          <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 border">
            {ruleCount} rules
          </Badge>
        )}
      </div>
    </button>
  );
}

// ─── Skeleton Grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MerchantsBrowser() {
  const navigate = useNavigate();
  const { language } = useAppContext();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [myProgramsOnly, setMyProgramsOnly] = useState(false);
  const [page, setPage] = useState(0);

  const debouncedSearch = useDebounce(search, 300);

  // Fetch user's enrolled program ids
  const { data: enrolledProgramIds } = useQuery({
    queryKey: ["enrolled-program-ids", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_programs")
        .select("program_id")
        .eq("user_id", user!.id);
      return (data ?? []).map((r) => r.program_id);
    },
    enabled: !!user && myProgramsOnly,
  });

  // Fetch merchant IDs that have rules for enrolled programs
  const { data: merchantIdsWithMyPrograms } = useQuery({
    queryKey: ["merchant-ids-my-programs", enrolledProgramIds],
    queryFn: async () => {
      if (!enrolledProgramIds || enrolledProgramIds.length === 0) return [];
      const { data } = await supabase
        .from("merchant_rules")
        .select("merchant_id")
        .in("program_id", enrolledProgramIds)
        .neq("status", "expired");
      const ids = [...new Set((data ?? []).map((r) => r.merchant_id))];
      return ids;
    },
    enabled: myProgramsOnly && !!enrolledProgramIds,
  });

  // Build query
  const { data: merchantsData, isLoading } = useQuery({
    queryKey: [
      "merchants",
      debouncedSearch,
      selectedCategory,
      myProgramsOnly,
      merchantIdsWithMyPrograms,
      page,
    ],
    queryFn: async () => {
      let q = supabase
        .from("merchants")
        .select("id, slug, display_name_en, display_name_ar, category, logo_url, is_verified", {
          count: "exact",
        });

      if (debouncedSearch.trim()) {
        q = q.or(
          `display_name_en.ilike.%${debouncedSearch}%,display_name_ar.ilike.%${debouncedSearch}%`
        );
      }

      if (selectedCategory !== "All") {
        q = q.contains("category", [selectedCategory]);
      }

      if (myProgramsOnly && merchantIdsWithMyPrograms) {
        if (merchantIdsWithMyPrograms.length === 0) {
          return { merchants: [], count: 0 };
        }
        q = q.in("id", merchantIdsWithMyPrograms);
      }

      q = q
        .order("display_name_en", { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, count, error } = await q;
      if (error) throw error;
      return { merchants: (data ?? []) as MerchantRow[], count: count ?? 0 };
    },
  });

  // Fetch rule counts for displayed merchants
  const merchantIds = (merchantsData?.merchants ?? []).map((m) => m.id);
  const { data: ruleCounts } = useQuery({
    queryKey: ["merchant-rule-counts", merchantIds],
    queryFn: async () => {
      if (merchantIds.length === 0) return {};
      const { data } = await supabase
        .from("merchant_rules")
        .select("merchant_id")
        .in("merchant_id", merchantIds)
        .neq("status", "expired");
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.merchant_id] = (counts[row.merchant_id] ?? 0) + 1;
      }
      return counts;
    },
    enabled: merchantIds.length > 0,
  });

  const merchants = merchantsData?.merchants ?? [];
  const totalCount = merchantsData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="px-4 py-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {language === "ar" ? "تصفح التجار" : "Browse Merchants"}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {language === "ar"
            ? "اكتشف أفضل العروض لدى التجار"
            : "Discover the best offers at merchants near you"}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={language === "ar" ? "ابحث عن تاجر..." : "Search merchants..."}
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setPage(0);
            }}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              selectedCategory === cat
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* My Programs toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="my-programs"
          checked={myProgramsOnly}
          onCheckedChange={(v) => {
            setMyProgramsOnly(v);
            setPage(0);
          }}
        />
        <Label htmlFor="my-programs" className="text-sm text-slate-700 cursor-pointer">
          {language === "ar" ? "برامجي فقط" : "My Programs only"}
        </Label>
      </div>

      {/* Results */}
      {isLoading ? (
        <SkeletonGrid />
      ) : merchants.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-base font-medium">
            {language === "ar" ? "لا يوجد تجار" : "No merchants found"}
          </p>
          <p className="text-sm mt-1">
            {language === "ar" ? "جرب مصطلح بحث مختلف" : "Try a different search term"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {totalCount} {language === "ar" ? "تاجر" : "merchants"}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {merchants.map((m) => (
              <MerchantCard
                key={m.id}
                merchant={m}
                ruleCount={ruleCounts?.[m.id] ?? 0}
                language={language}
                onClick={() => navigate(`/dashboard/merchants/${m.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
