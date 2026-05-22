import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, ShieldCheck, Pencil, Loader2 } from "lucide-react";

interface Merchant {
  id: string; slug: string; display_name_en: string; display_name_ar: string;
  category: string[]; logo_url: string | null; is_verified: boolean; created_at: string;
}

const MERCHANT_CATEGORIES = ["Groceries","F&B","Fuel","Entertainment","Pharmacy","Fashion","Online","Hotels","Fitness","General"];

function MerchantDialog({ open, merchant, onClose, onSave, saving }: {
  open: boolean; merchant: Merchant | null; onClose: () => void; onSave: (d: any) => void; saving: boolean;
}) {
  const [form, setForm] = useState(() => merchant ? {
    slug: merchant.slug, display_name_en: merchant.display_name_en,
    display_name_ar: merchant.display_name_ar, logo_url: merchant.logo_url ?? "",
    categories: merchant.category.join(", "), is_verified: merchant.is_verified,
  } : { slug: "", display_name_en: "", display_name_ar: "", logo_url: "", categories: "", is_verified: false });
  const p = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{merchant ? "Edit Merchant" : "Add Merchant"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Name (EN)</Label><Input value={form.display_name_en} onChange={(e) => p("display_name_en", e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Name (AR)</Label><Input value={form.display_name_ar} onChange={(e) => p("display_name_ar", e.target.value)} dir="rtl" className="mt-1" /></div>
          </div>
          <div><Label className="text-xs">Slug</Label><Input value={form.slug} onChange={(e) => p("slug", e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Categories (comma-separated)</Label><Input value={form.categories} onChange={(e) => p("categories", e.target.value)} placeholder="Groceries, F&B" className="mt-1" /></div>
          <div><Label className="text-xs">Logo URL</Label><Input value={form.logo_url} onChange={(e) => p("logo_url", e.target.value)} className="mt-1" /></div>
          <div className="flex items-center gap-3"><Switch checked={form.is_verified} onCheckedChange={(v) => p("is_verified", v)} /><Label className="text-sm">Verified merchant</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, id: merchant?.id })} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminMerchants() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);

  const { data: merchants, isLoading } = useQuery({
    queryKey: ["admin-merchants", search, categoryFilter],
    queryFn: async () => {
      let q = supabase.from("merchants").select("*").order("display_name_en");
      if (search.trim()) q = q.or(`display_name_en.ilike.%${search}%,display_name_ar.ilike.%${search}%`);
      if (categoryFilter !== "All") q = q.contains("category", [categoryFilter]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Merchant[];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, is_verified }: { id: string; is_verified: boolean }) => {
      const { error } = await supabase.from("merchants").update({ is_verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { is_verified }) => {
      toast.success(is_verified ? "Merchant verified" : "Merchant unverified");
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const cats = form.categories.split(",").map((s: string) => s.trim()).filter(Boolean);
      const payload = {
        slug: form.slug, display_name_en: form.display_name_en,
        display_name_ar: form.display_name_ar, logo_url: form.logo_url || null,
        category: cats, is_verified: form.is_verified,
      };
      if (form.id) {
        const { error } = await supabase.from("merchants").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("merchants").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Merchant saved");
      setDialogOpen(false);
      setEditingMerchant(null);
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Merchants</h1>
        <Button onClick={() => { setEditingMerchant(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add Merchant
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search merchants..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
          <option value="All">All Categories</option>
          {MERCHANT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Merchant</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Categories</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Verified</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Created</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
            )) : merchants?.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-slate-500 py-8">No merchants found</td></tr>
            ) : merchants?.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{m.display_name_en}</p>
                  <p className="text-xs text-slate-400" dir="rtl">{m.display_name_ar}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {m.category.slice(0, 3).map((cat) => <Badge key={cat} className="text-[10px] px-1.5 border-0 bg-slate-100 text-slate-600">{cat}</Badge>)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={m.is_verified}
                    onCheckedChange={(v) => verifyMutation.mutate({ id: m.id, is_verified: v })}
                  />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{m.created_at.split("T")[0]}</td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingMerchant(m); setDialogOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">{merchants?.length ?? 0} merchants</p>

      <MerchantDialog open={dialogOpen} merchant={editingMerchant}
        onClose={() => { setDialogOpen(false); setEditingMerchant(null); }}
        onSave={(d) => saveMutation.mutate(d)} saving={saveMutation.isPending} />
    </div>
  );
}
