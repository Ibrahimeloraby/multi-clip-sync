import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, Mail, HardDrive, ShoppingBag, Upload,
  Code, Plus, CheckCircle, Circle, Copy, ExternalLink, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { DataSource } from "@/types";

const SOURCE_DEFS = [
  {
    type: "whatsapp",
    icon: MessageCircle,
    name: "WhatsApp Business",
    desc: "Receive messages and media from WhatsApp Business API via webhook",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    fields: [{ key: "phone_number_id", label: "Phone Number ID", placeholder: "123456789" },
              { key: "access_token", label: "Access Token", placeholder: "EAABwzLix...", type: "password" }],
  },
  {
    type: "email",
    icon: Mail,
    name: "Email Inbox",
    desc: "Forward emails to your dedicated inbox address to ingest attachments and body",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    fields: [{ key: "inbox_address", label: "Forwarding address", placeholder: "auto-generated", readOnly: true }],
  },
  {
    type: "google_drive",
    icon: HardDrive,
    name: "Google Drive",
    desc: "Watch a Google Drive folder and automatically ingest new files",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    fields: [{ key: "folder_id", label: "Folder ID", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" },
              { key: "service_account_json", label: "Service Account JSON", placeholder: "{...}", type: "textarea" }],
  },
  {
    type: "pos_webhook",
    icon: ShoppingBag,
    name: "POS Webhook",
    desc: "Connect your POS system to stream transactions in real-time",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    fields: [{ key: "webhook_secret", label: "Webhook Secret", placeholder: "auto-generated", readOnly: true }],
  },
  {
    type: "api",
    icon: Code,
    name: "REST API",
    desc: "Programmatically push data using the Omniform REST API",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    fields: [{ key: "api_key", label: "API Key", placeholder: "auto-generated", readOnly: true }],
  },
] as const;

function SourceCard({ sourceDef, existing }: {
  sourceDef: typeof SOURCE_DEFS[number];
  existing: DataSource | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const Icon = sourceDef.icon;

  const { mutate: connect, isPending } = useMutation({
    mutationFn: async () => {
      if (existing) {
        const { error } = await supabase
          .from("data_sources")
          .update({ config, is_active: true })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("data_sources").insert({
          name: sourceDef.name,
          type: sourceDef.type,
          config,
          is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`${sourceDef.name} connected`);
      qc.invalidateQueries({ queryKey: ["data-sources"] });
      setOpen(false);
    },
    onError: () => toast.error("Failed to connect"),
  });

  const webhookUrl = `${window.location.origin}/api/webhook/${sourceDef.type}`;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className={`w-10 h-10 rounded-xl ${sourceDef.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${sourceDef.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{sourceDef.name}</span>
            {existing?.is_active && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Connected</Badge>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-0.5">{sourceDef.desc}</p>
        </div>
        <Button
          onClick={() => setOpen((o) => !o)}
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 shrink-0"
        >
          <Settings2 className="w-3.5 h-3.5 mr-1.5" />
          {existing ? "Configure" : "Connect"}
        </Button>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-4 space-y-3">
          {(sourceDef.type === "whatsapp" || sourceDef.type === "pos_webhook") && (
            <div className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-2">
              <code className="text-indigo-300 text-xs flex-1 truncate">{webhookUrl}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copied!"); }}
                className="text-slate-400 hover:text-white shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {sourceDef.fields.map((field) => (
            <div key={field.key}>
              <Label className="text-slate-300 text-sm mb-1.5 block">{field.label}</Label>
              <Input
                value={config[field.key] ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                type={"type" in field && field.type === "password" ? "password" : "text"}
                readOnly={"readOnly" in field && field.readOnly}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          ))}
          <Button
            onClick={() => connect()}
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {isPending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <CheckCircle className="w-4 h-4 mr-2" />}
            {existing ? "Update" : "Connect"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Integrations() {
  const { data: sources = [] } = useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("data_sources").select("*");
      if (error) throw error;
      return (data ?? []) as DataSource[];
    },
  });

  const getExisting = (type: string) => sources.find((s) => s.type === type);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-slate-400 text-sm mt-1">
          Connect data sources to automatically ingest and process files
        </p>
      </div>

      <div className="space-y-3">
        {SOURCE_DEFS.map((def) => (
          <SourceCard key={def.type} sourceDef={def} existing={getExisting(def.type)} />
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Upload className="w-4 h-4 text-indigo-400" />
          <span className="text-white font-medium text-sm">Manual upload always available</span>
        </div>
        <p className="text-slate-400 text-xs">
          You can always upload files manually via the Upload page regardless of connected integrations.
        </p>
      </div>
    </div>
  );
}
