import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, ExternalLink, Pencil, Loader2 } from "lucide-react";

interface Program {
  id: string;
  slug: string;
  display_name_en: string;
  display_name_ar: string;
  logo_url: string | null;
  category: string;
  default_earn_rate_aed: number;
  default_redemption_value_aed: number;
  official_url: string | null;
  last_official_update: string;
}

const PROGRAM_CATEGORIES = ["airline","hotel","bank","retail","telco","gov","fitness","entertainment"];

const DEFAULT_FORM = {
  slug: "", display_name_en: "", display_name_ar: "", logo_url: "",
  category: "bank", default_earn_rate_aed: "1", default_redemption_value_aed: "0.01",
  official_url: "", last_official_update: new Date().toISOString().split("T")[0],
};

function ProgramDialog({ open, program, onClose, onSave, saving }: {
  open: boolean; program: Program | null;
  onClose: () => void; onSave: (d: any) => void; saving: boolean;
}) {
  const [form, setForm] = useState(() => program ? {
    slug: program.slug, display_name_en: program.display_name_en,
    display_name_ar: program.display_name_ar, logo_url: program.logo_url ?? "",
    category: program.category, default_earn_rate_aed: String(program.default_earn_rate_aed),
    default_redemption_value_aed: String(program.default_redemption_value_aed),
    official_url: program.official_url ?? "",
    last_official_update: program.last_official_update?.split("T")[0] ?? "",
  } : { ...DEFAULT_FORM });
  const p = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{program ? "Edit Program" : "Add Program"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Name (EN)</Label><Input value={form.display_name_en} onChange={(e) => p("display_name_en", e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Name (AR)</Label><Input value={form.display_name_ar} onChange={(e) => p("display_name_ar", e.target.value)} dir="rtl" className="mt-1" /></div>
          </div>
          <div><Label className="text-xs">Slug</Label><Input value={form.slug} onChange={(e) => p("slug", e.target.value)} placeholder="e.g. emirates-skywards" className="mt-1" /></div>
          <div><Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={(v) => p("category", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{PROGRAM_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Earn Rate (pts/AED)</Label><Input type="number" value={form.default_earn_rate_aed} onChange={(e) => p("default_earn_rate_aed", e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Redemption (AED/pt)</Label><Input type="number" step="0.001" value={form.default_redemption_value_aed} onChange={(e) => p("default_redemption_value_aed", e.target.value)} className="mt-1" /></div>
          </div>
          <div><Label className="text-xs">Logo URL</Label><Input value={form.logo_url} onChange={(e) => p("logo_url", e.target.value)} placeholder="https://..." className="mt-1" /></div>
          <div><Label className="text-xs">Official URL</Label><Input value={form.official_url} onChange={(e) => p("official_url", e.target.value)} placeholder="https://..." className="mt-1" /></div>
          <div><Label className="text-xs">Last Official Update</Label><Input type="date" value={form.last_official_update} onChange={(e) => p("last_official_update", e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, id: program?.id })} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPrograms() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const { data: programs, isLoading } = useQuery({
    queryKey: ["admin-programs", search],
    queryFn: async () => {
      let q = supabase.from("programs").select("*").order("display_name_en");
      if (search.trim()) q = q.or(`display_name_en.ilike.%${search}%,slug.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Program[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        slug: form.slug, display_name_en: form.display_name_en,
        display_name_ar: form.display_name_ar, logo_url: form.logo_url || null,
        category: form.category, default_earn_rate_aed: parseFloat(form.default_earn_rate_aed),
        default_redemption_value_aed: parseFloat(form.default_redemption_value_aed),
        official_url: form.official_url || null, last_official_update: form.last_official_update,
      };
      if (form.id) {
        const { error } = await supabase.from("programs").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("programs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Program saved");
      setDialogOpen(false);
      setEditingProgram(null);
      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const CATEGORY_COLORS: Record<string, string> = {
    airline: "bg-sky-100 text-sky-700", hotel: "bg-purple-100 text-purple-700",
    bank: "bg-emerald-100 text-emerald-700", retail: "bg-orange-100 text-orange-700",
    telco: "bg-pink-100 text-pink-700", gov: "bg-slate-100 text-slate-600",
    fitness: "bg-green-100 text-green-700", entertainment: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Programs</h1>
        <Button onClick={() => { setEditingProgram(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add Program
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search programs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Program</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Category</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Earn Rate</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Redemption</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Last Updated</th>
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
            )) : programs?.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-slate-500 py-8">No programs found</td></tr>
            ) : programs?.map((prog) => (
              <tr key={prog.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {prog.logo_url && <img src={prog.logo_url} alt="" className="w-6 h-6 rounded object-cover" />}
                    <div>
                      <p className="font-medium text-slate-900">{prog.display_name_en}</p>
                      <p className="text-xs text-slate-400">{prog.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs border-0 ${CATEGORY_COLORS[prog.category] ?? "bg-slate-100 text-slate-600"}`}>{prog.category}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{prog.default_earn_rate_aed} pts/AED</td>
                <td className="px-4 py-3 text-right text-slate-600">AED {prog.default_redemption_value_aed}/pt</td>
                <td className="px-4 py-3 text-slate-500">{prog.last_official_update?.split("T")[0] ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {prog.official_url && <a href={prog.official_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-slate-100"><ExternalLink className="w-3.5 h-3.5 text-slate-400" /></a>}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingProgram(prog); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">{programs?.length ?? 0} programs</p>

      <ProgramDialog
        open={dialogOpen} program={editingProgram}
        onClose={() => { setDialogOpen(false); setEditingProgram(null); }}
        onSave={(d) => saveMutation.mutate(d)} saving={saveMutation.isPending}
      />
    </div>
  );
}
