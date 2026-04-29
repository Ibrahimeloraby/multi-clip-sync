import { useState } from "react";
import type { FieldDefinition, FilterPreset, FilterRule } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Save, Trash2, BookmarkCheck } from "lucide-react";

interface Props {
  fields: FieldDefinition[];
  activeRules: FilterRule[];
  onRulesChange: (rules: FilterRule[]) => void;
  presets: FilterPreset[];
  onSavePreset: (name: string, rules: FilterRule[]) => void;
  onLoadPreset: (preset: FilterPreset) => void;
  onDeletePreset: (id: string) => void;
  employeeId: string;
  industryId: string;
  stakeholderType: string;
}

const OPERATORS: Record<string, { label: string; forTypes: string[] }> = {
  eq: { label: "equals", forTypes: ["text", "select", "phone", "email"] },
  neq: { label: "not equals", forTypes: ["text", "select"] },
  contains: { label: "contains", forTypes: ["text", "phone", "email"] },
  gt: { label: ">", forTypes: ["number", "date"] },
  lt: { label: "<", forTypes: ["number", "date"] },
  gte: { label: "≥", forTypes: ["number", "date"] },
  lte: { label: "≤", forTypes: ["number", "date"] },
  in: { label: "is one of", forTypes: ["select"] },
};

export default function FilterPanel({
  fields,
  activeRules,
  onRulesChange,
  presets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  industryId,
  stakeholderType,
}: Props) {
  const [presetName, setPresetName] = useState("");
  const filterableFields = fields.filter((f) => f.filterable);

  const addRule = () => {
    const field = filterableFields[0];
    if (!field) return;
    const op = getOpsForField(field)[0].key;
    onRulesChange([...activeRules, { fieldKey: field.key, operator: op as FilterRule["operator"], value: "" }]);
  };

  const updateRule = (index: number, patch: Partial<FilterRule>) => {
    const next = activeRules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onRulesChange(next);
  };

  const removeRule = (index: number) => {
    onRulesChange(activeRules.filter((_, i) => i !== index));
  };

  const getOpsForField = (field: FieldDefinition) =>
    Object.entries(OPERATORS)
      .filter(([, v]) => v.forTypes.includes(field.type))
      .map(([key, v]) => ({ key, label: v.label }));

  const savePreset = () => {
    if (!presetName.trim() || !activeRules.length) return;
    onSavePreset(presetName.trim(), activeRules);
    setPresetName("");
  };

  const relevantPresets = presets.filter(
    (p) => p.industryId === industryId && p.stakeholderType === stakeholderType
  );

  return (
    <div className="space-y-4">
      {/* Saved presets */}
      {relevantPresets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Saved filters</p>
          <div className="flex flex-wrap gap-2">
            {relevantPresets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-1">
                <button
                  onClick={() => onLoadPreset(preset)}
                  className="flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs hover:bg-primary/10 hover:border-primary/40 transition-colors"
                >
                  <BookmarkCheck className="h-3 w-3" />
                  {preset.name}
                  <span className="text-muted-foreground">({preset.rules.length})</span>
                </button>
                <button
                  onClick={() => onDeletePreset(preset.id)}
                  className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <Separator />
        </div>
      )}

      {/* Active rules */}
      <div className="space-y-2">
        {activeRules.map((rule, i) => {
          const field = filterableFields.find((f) => f.key === rule.fieldKey);
          const ops = field ? getOpsForField(field) : [];
          return (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              {/* Field selector */}
              <Select
                value={rule.fieldKey}
                onValueChange={(v) => {
                  const newField = filterableFields.find((f) => f.key === v)!;
                  updateRule(i, { fieldKey: v, operator: getOpsForField(newField)[0].key as FilterRule["operator"], value: "" });
                }}
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterableFields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator */}
              <Select
                value={rule.operator}
                onValueChange={(v) => updateRule(i, { operator: v as FilterRule["operator"] })}
              >
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ops.map((op) => (
                    <SelectItem key={op.key} value={op.key}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value */}
              {field?.type === "select" && field.options ? (
                <Select
                  value={String(rule.value)}
                  onValueChange={(v) => updateRule(i, { value: v })}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 w-32 text-xs"
                  value={String(rule.value)}
                  placeholder={field?.type === "number" ? "0" : "value…"}
                  onChange={(e) => updateRule(i, { value: e.target.value })}
                />
              )}

              <button onClick={() => removeRule(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        <Button variant="outline" size="sm" onClick={addRule} className="gap-1 text-xs h-8">
          <Plus className="h-3.5 w-3.5" />
          Add filter
        </Button>
      </div>

      {/* Save preset */}
      {activeRules.length > 0 && (
        <div className="flex items-center gap-2">
          <Input
            className="h-8 text-xs flex-1"
            placeholder="Preset name (e.g. Dubai Buyers 2M+)"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") savePreset(); }}
          />
          <Button variant="outline" size="sm" onClick={savePreset} className="gap-1 h-8 text-xs" disabled={!presetName.trim()}>
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
