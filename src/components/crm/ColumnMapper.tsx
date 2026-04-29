import { useMemo } from "react";
import type { FieldDefinition } from "@/types/crm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

interface Props {
  parsedHeaders: string[];
  rawHeaders: string[];
  sampleRows: Record<string, string>[];
  fields: FieldDefinition[];
  mapping: Record<string, string>; // sourceHeader -> fieldKey
  onChange: (mapping: Record<string, string>) => void;
}

export default function ColumnMapper({ parsedHeaders, rawHeaders, sampleRows, fields, mapping, onChange }: Props) {
  const mappedFields = new Set(Object.values(mapping));

  const setMapping = (source: string, fieldKey: string) => {
    const next = { ...mapping };
    if (fieldKey === "__skip") {
      delete next[source];
    } else {
      // Remove any existing mapping for this field
      Object.keys(next).forEach((k) => { if (next[k] === fieldKey) delete next[k]; });
      next[source] = fieldKey;
    }
    onChange(next);
  };

  const requiredFields = fields.filter((f) => f.required);
  const mappedRequired = requiredFields.filter((f) => mappedFields.has(f.key));
  const allRequiredMapped = mappedRequired.length === requiredFields.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Map your file's columns to the fields below. Required fields are marked with *.
        </p>
        <div className="flex items-center gap-1 text-xs">
          {allRequiredMapped ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={allRequiredMapped ? "text-green-600" : "text-muted-foreground"}>
            {mappedRequired.length}/{requiredFields.length} required mapped
          </span>
        </div>
      </div>

      <div className="rounded-lg border divide-y overflow-hidden">
        {parsedHeaders.map((header, i) => {
          const sample = sampleRows.slice(0, 2).map((r) => r[header]).filter(Boolean).join(", ");
          const mapped = mapping[header];
          return (
            <div key={header} className="flex items-center gap-3 px-3 py-2 bg-card hover:bg-muted/30 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{rawHeaders[i]}</p>
                {sample && <p className="truncate text-xs text-muted-foreground">{sample}</p>}
              </div>
              <Select value={mapped ?? "__skip"} onValueChange={(v) => setMapping(header, v)}>
                <SelectTrigger className="w-48 shrink-0 h-8 text-xs">
                  <SelectValue placeholder="Skip column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__skip">
                    <span className="text-muted-foreground">— Skip —</span>
                  </SelectItem>
                  {fields.map((f) => (
                    <SelectItem key={f.key} value={f.key} disabled={mappedFields.has(f.key) && mapping[header] !== f.key}>
                      {f.label}{f.required ? " *" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mapped && <Badge variant="outline" className="text-xs shrink-0">{mapped}</Badge>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
