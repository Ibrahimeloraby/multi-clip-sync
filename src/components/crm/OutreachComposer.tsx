import { useState, useMemo } from "react";
import type { FieldDefinition, OutreachTemplate, Prospect } from "@/types/crm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, ExternalLink, Save, Trash2, Copy, Check } from "lucide-react";
import { buildWhatsAppLink, fillTemplate } from "@/lib/crm/dataClean";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospects: Prospect[];
  fields: FieldDefinition[];
  templates: OutreachTemplate[];
  defaultTemplate: string;
  industryId: string;
  stakeholderType: string;
  employeeId: string;
  onSaveTemplate: (tpl: Omit<OutreachTemplate, "id">) => void;
  onDeleteTemplate: (id: string) => void;
}

export default function OutreachComposer({
  open,
  onOpenChange,
  prospects,
  fields,
  templates,
  defaultTemplate,
  industryId,
  stakeholderType,
  employeeId,
  onSaveTemplate,
  onDeleteTemplate,
}: Props) {
  const [messageBody, setMessageBody] = useState(defaultTemplate);
  const [templateName, setTemplateName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const phoneField = fields.find((f) => f.type === "phone");
  const variableFields = fields.filter((f) => f.key !== "notes");

  const previews = useMemo(
    () =>
      prospects.map((p) => ({
        id: p.id,
        name: String(p.data.name ?? p.data.contact_name ?? p.data.company_name ?? "Contact"),
        phone: phoneField ? String(p.data[phoneField.key] ?? "") : "",
        message: fillTemplate(messageBody, p.data),
      })),
    [prospects, messageBody, phoneField]
  );

  const loadTemplate = (tpl: OutreachTemplate) => setMessageBody(tpl.body);

  const saveTemplate = () => {
    if (!templateName.trim() || !messageBody.trim()) return;
    onSaveTemplate({
      name: templateName.trim(),
      body: messageBody,
      channel: "whatsapp",
      industryId,
      stakeholderType,
      employeeId,
    });
    setTemplateName("");
  };

  const copyMessage = (id: string, message: string) => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Outreach
            <Badge variant="secondary">{prospects.length} contact{prospects.length !== 1 ? "s" : ""}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Saved templates */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Saved templates</p>
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="flex items-center gap-1">
                    <button
                      onClick={() => loadTemplate(tpl)}
                      className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs hover:bg-primary/10 hover:border-primary/40 transition-colors"
                    >
                      {tpl.name}
                    </button>
                    <button
                      onClick={() => onDeleteTemplate(tpl.id)}
                      className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Message editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Message template</p>
              <div className="flex flex-wrap gap-1">
                {variableFields.slice(0, 6).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setMessageBody((prev) => prev + `{{${f.key}}}`)}
                    className="rounded border bg-muted px-1.5 py-0.5 text-[11px] hover:bg-primary/10 hover:border-primary/40 font-mono transition-colors"
                  >
                    {`{{${f.key}}}`}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={4}
              placeholder="Type your message. Use {{field_key}} to personalize…"
              className="font-mono text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use variable buttons above to insert personalized fields.
            </p>
          </div>

          {/* Save template */}
          <div className="flex items-center gap-2">
            <Input
              className="h-8 text-xs"
              placeholder="Save as template…"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveTemplate(); }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs shrink-0"
              onClick={saveTemplate}
              disabled={!templateName.trim()}
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>

          <Separator />

          {/* Previews + send links */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Send to {prospects.length} contact{prospects.length !== 1 ? "s" : ""}</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {previews.map((preview) => (
                <div key={preview.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{preview.name}</p>
                      {preview.phone && <p className="text-xs text-muted-foreground">{preview.phone}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() => copyMessage(preview.id, preview.message)}
                      >
                        {copied === preview.id ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {preview.phone && (
                        <Button
                          size="sm"
                          className="h-7 gap-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => window.open(buildWhatsAppLink(preview.phone, preview.message), "_blank")}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Open
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-background rounded p-2 border">
                    {preview.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
