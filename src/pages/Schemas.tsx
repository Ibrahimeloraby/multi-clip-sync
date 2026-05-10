import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GitBranch, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { ExtractionSchema, SchemaField, FieldType } from "@/types";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "currency", label: "Currency" },
  { value: "boolean", label: "Boolean" },
  { value: "enum", label: "Enum (list)" },
];

const DOCUMENT_TYPES = [
  "invoice", "receipt", "whatsapp_message", "voice_note",
  "spreadsheet", "pdf", "screenshot", "pos_transaction", "contract",
];

function FieldRow({
  field, onChange, onRemove,
}: {
  field: SchemaField;
  onChange: (f: SchemaField) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2 bg-slate-700/50 rounded-lg p-3">
      <GripVertical className="w-4 h-4 text-slate-500 mt-2 shrink-0" />
      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
        <Input
          placeholder="field_key"
          value={field.key}
          onChange={(e) => onChange({ ...field, key: e.target.value.replace(/\s+/g, "_").toLowerCase() })}
          className="bg-slate-800 border-slate-600 text-white text-sm placeholder:text-slate-500"
        />
        <Input
          placeholder="Display label"
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white text-sm placeholder:text-slate-500"
        />
        <Select value={field.type} onValueChange={(v) => onChange({ ...field, type: v as FieldType })}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-300 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {FIELD_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-slate-300">{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-slate-400 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onChange({ ...field, required: e.target.checked })}
              className="accent-indigo-500"
            />
            Required
          </label>
          <button onClick={onRemove} className="ml-auto text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SchemaCard({ schema }: { schema: ExtractionSchema }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { mutate: toggleActive } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("extraction_schemas")
        .update({ is_active: !schema.is_active })
        .eq("id", schema.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schemas"] }),
  });

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
          <GitBranch className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium">{schema.name}</div>
          <div className="text-slate-400 text-xs mt-0.5">
            {schema.fields.length} fields · {schema.document_types.join(", ")}
          </div>
        </div>
        <Badge className={schema.is_active ? "bg-green-500/20 text-green-400" : "bg-slate-600/50 text-slate-400"}>
          {schema.is_active ? "Active" : "Inactive"}
        </Badge>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-4 space-y-2">
          {schema.fields.map((f) => (
            <div key={f.key} className="flex items-center gap-3 text-sm">
              <code className="text-indigo-400 bg-slate-700 px-2 py-0.5 rounded text-xs">{f.key}</code>
              <span className="text-slate-300">{f.label}</span>
              <Badge className="bg-slate-700 text-slate-400 text-xs">{f.type}</Badge>
              {f.required && <Badge className="bg-orange-500/20 text-orange-400 text-xs">required</Badge>}
            </div>
          ))}
          <Button
            onClick={() => toggleActive()}
            variant="outline"
            size="sm"
            className="mt-2 border-slate-600 text-slate-300"
          >
            {schema.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      )}
    </div>
  );
}

function CreateSchemaForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [fields, setFields] = useState<SchemaField[]>([
    { key: "vendor_name", label: "Vendor Name", type: "text", required: true },
    { key: "total_amount", label: "Total Amount", type: "currency", required: true },
    { key: "date", label: "Date", type: "date", required: false },
  ]);

  const addField = () => setFields((f) => [...f, { key: "", label: "", type: "text", required: false }]);
  const updateField = (i: number, f: SchemaField) => setFields((prev) => prev.map((v, idx) => idx === i ? f : v));
  const removeField = (i: number) => setFields((prev) => prev.filter((_, idx) => idx !== i));
  const toggleDocType = (t: string) => setDocTypes((prev) => prev.includes(t) ? prev.filter((d) => d !== t) : [...prev, t]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("extraction_schemas").insert({
        name,
        fields,
        document_types: docTypes,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Schema created");
      qc.invalidateQueries({ queryKey: ["schemas"] });
      onClose();
    },
    onError: () => toast.error("Failed to create schema"),
  });

  return (
    <div className="bg-slate-800 rounded-xl border border-indigo-500/30 p-5 space-y-5">
      <h3 className="text-white font-semibold">New Extraction Schema</h3>

      <div>
        <Label className="text-slate-300 text-sm mb-1.5 block">Schema name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Retail Invoice Schema"
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
        />
      </div>

      <div>
        <Label className="text-slate-300 text-sm mb-2 block">Applied to document types</Label>
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleDocType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                docTypes.includes(t)
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-700 border-slate-600 text-slate-300 hover:border-indigo-500"
              }`}
            >
              {docTypes.includes(t) && <Check className="w-3 h-3 inline mr-1" />}
              {t.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-slate-300 text-sm">Fields to extract</Label>
          <Button onClick={addField} variant="ghost" size="sm" className="text-indigo-400 h-7">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add field
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <FieldRow key={i} field={f} onChange={(nf) => updateField(i, nf)} onRemove={() => removeField(i)} />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => save()}
          disabled={isPending || !name || fields.length === 0}
          className="bg-indigo-600 hover:bg-indigo-500"
        >
          {isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Save Schema"}
        </Button>
        <Button onClick={onClose} variant="outline" className="border-slate-600 text-slate-300">Cancel</Button>
      </div>
    </div>
  );
}

export default function Schemas() {
  const [creating, setCreating] = useState(false);

  const { data: schemas = [], isLoading } = useQuery({
    queryKey: ["schemas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extraction_schemas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExtractionSchema[];
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Extraction Schemas</h1>
          <p className="text-slate-400 text-sm mt-1">Define what fields AI should extract per document type</p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)} className="bg-indigo-600 hover:bg-indigo-500">
            <Plus className="w-4 h-4 mr-2" /> New Schema
          </Button>
        )}
      </div>

      {creating && <CreateSchemaForm onClose={() => setCreating(false)} />}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : schemas.length === 0 && !creating ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <GitBranch className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No schemas yet</p>
          <p className="text-slate-500 text-sm mt-1">Create a schema to define extraction fields for your document types</p>
          <Button onClick={() => setCreating(true)} size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-500">
            <Plus className="w-4 h-4 mr-2" /> Create first schema
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {schemas.map((s) => <SchemaCard key={s.id} schema={s} />)}
        </div>
      )}
    </div>
  );
}
