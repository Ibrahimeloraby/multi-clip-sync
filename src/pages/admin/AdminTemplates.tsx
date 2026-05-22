import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit2, Check, X } from "lucide-react";

export default function AdminTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    template_key: "",
    name: "",
    system_prompt: "",
    user_prompt_template: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prompt_templates")
        .select("*")
        .order("template_key");
      return (data as any[]) ?? [];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ template_key: "", name: "", system_prompt: "", user_prompt_template: "" });
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      template_key: t.template_key,
      name: t.name,
      system_prompt: t.system_prompt,
      user_prompt_template: t.user_prompt_template ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        user_prompt_template: form.user_prompt_template || null,
        updated_by: user?.id,
      };
      if (editing) {
        const { error } = await supabase
          .from("prompt_templates")
          .update({ ...payload, version: editing.version + 1 })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("prompt_templates")
          .insert({ ...payload, is_active: true });
        if (error) throw error;
      }
      toast.success("Template saved");
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("prompt_templates")
      .update({ is_active: !current })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      toast.success(!current ? "Template activated" : "Template deactivated");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Prompt Templates</h1>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {(templates ?? []).map((tmpl: any) => (
            <div key={tmpl.id} className="flex items-start gap-4 px-4 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 text-sm">{tmpl.name}</p>
                  <Badge className="text-[10px] px-1.5 border-0 bg-slate-100 text-slate-600">
                    {tmpl.template_key}
                  </Badge>
                  {tmpl.is_active ? (
                    <Badge className="text-[10px] px-1.5 border-0 bg-green-100 text-green-700">
                      active
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] px-1.5 border-0 bg-slate-100 text-slate-400">
                      inactive
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 font-mono">
                  {tmpl.system_prompt}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">v{tmpl.version}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(tmpl.id, tmpl.is_active)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    tmpl.is_active
                      ? "text-green-600 hover:bg-green-50"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                  title={tmpl.is_active ? "Deactivate" : "Activate"}
                >
                  {tmpl.is_active ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(tmpl)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-1 block">
                  Template Key
                </Label>
                <Input
                  value={form.template_key}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, template_key: e.target.value }))
                  }
                  placeholder="e.g. recommend_card"
                  className="rounded-xl h-10"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-1 block">
                  Display Name
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Card Recommendation"
                  className="rounded-xl h-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700 mb-1 block">
                System Prompt
              </Label>
              <textarea
                value={form.system_prompt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, system_prompt: e.target.value }))
                }
                rows={6}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="You are an AI assistant for LoyaltyOne..."
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700 mb-1 block">
                User Prompt Template (optional)
              </Label>
              <textarea
                value={form.user_prompt_template}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    user_prompt_template: e.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="User: {{input}}"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
