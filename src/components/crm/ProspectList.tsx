import { useState } from "react";
import type { Prospect, FieldDefinition, OutreachTemplate } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, MoreVertical, Trash2, ChevronDown, Phone, Mail } from "lucide-react";
import { buildWhatsAppLink, fillTemplate } from "@/lib/crm/dataClean";
import OutreachComposer from "./OutreachComposer";

interface Props {
  prospects: Prospect[];
  fields: FieldDefinition[];
  stakeholderColor: string;
  outreachTemplates: OutreachTemplate[];
  defaultTemplate: string;
  industryId: string;
  stakeholderType: string;
  employeeId: string;
  onStatusChange: (id: string, status: Prospect["status"]) => void;
  onDelete: (ids: string[]) => void;
  onSaveTemplate: (tpl: Omit<OutreachTemplate, "id">) => void;
  onDeleteTemplate: (id: string) => void;
}

const STATUS_LABELS: Record<Prospect["status"], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  closed: "Closed",
};

const STATUS_COLORS: Record<Prospect["status"], string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-yellow-100 text-yellow-700 border-yellow-200",
  qualified: "bg-green-100 text-green-700 border-green-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function ProspectList({
  prospects,
  fields,
  stakeholderColor,
  outreachTemplates,
  defaultTemplate,
  industryId,
  stakeholderType,
  employeeId,
  onStatusChange,
  onDelete,
  onSaveTemplate,
  onDeleteTemplate,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerProspects, setComposerProspects] = useState<Prospect[]>([]);

  const phoneField = fields.find((f) => f.type === "phone");
  const nameField = fields.find((f) => f.key === "name" || f.key === "contact_name" || f.key === "company_name");
  const emailField = fields.find((f) => f.type === "email");

  const displayFields = fields.filter(
    (f) => f.filterable && f.key !== "notes" && f.key !== phoneField?.key && f.key !== nameField?.key
  ).slice(0, 4);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === prospects.length ? new Set() : new Set(prospects.map((p) => p.id)));
  };

  const openComposer = (forProspects: Prospect[]) => {
    setComposerProspects(forProspects);
    setComposerOpen(true);
  };

  if (!prospects.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <MessageSquare className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm">No prospects match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Bulk actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected.size > 0 && selected.size === prospects.length}
            onCheckedChange={toggleAll}
            className="mr-1"
          />
          <span className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : `${prospects.length} prospects`}
          </span>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => openComposer(prospects.filter((p) => selected.has(p.id)))}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              WhatsApp ({selected.size})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              onClick={() => { onDelete(Array.from(selected)); setSelected(new Set()); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Prospect cards */}
      <div className="space-y-1.5">
        {prospects.map((prospect) => {
          const name = nameField ? prospect.data[nameField.key] : null;
          const phone = phoneField ? prospect.data[phoneField.key] : null;
          const email = emailField ? prospect.data[emailField.key] : null;
          const isSelected = selected.has(prospect.id);

          return (
            <div
              key={prospect.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                isSelected ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted/30"
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelect(prospect.id)}
                className="mt-0.5"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{name ?? "—"}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[prospect.status]}`}>
                    {STATUS_LABELS[prospect.status]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mb-1.5">
                  {phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {String(phone)}
                    </span>
                  )}
                  {email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {String(email)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {displayFields.map((f) => {
                    const val = prospect.data[f.key];
                    if (!val) return null;
                    return (
                      <Badge key={f.key} variant="secondary" className="text-[11px] font-normal">
                        {f.label}: {String(val)}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    onClick={() => openComposer([prospect])}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(["new", "contacted", "qualified", "closed"] as Prospect["status"][]).map((s) => (
                      <DropdownMenuItem key={s} onClick={() => onStatusChange(prospect.id, s)}>
                        Mark as {STATUS_LABELS[s]}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete([prospect.id])}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      <OutreachComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        prospects={composerProspects}
        fields={fields}
        templates={outreachTemplates.filter(
          (t) => t.industryId === industryId && t.stakeholderType === stakeholderType
        )}
        defaultTemplate={defaultTemplate}
        industryId={industryId}
        stakeholderType={stakeholderType}
        employeeId={employeeId}
        onSaveTemplate={onSaveTemplate}
        onDeleteTemplate={onDeleteTemplate}
      />
    </div>
  );
}
