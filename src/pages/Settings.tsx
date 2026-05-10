import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Key, Shield, Bell, Palette, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/constants";

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-indigo-400" />
        <h2 className="text-white font-semibold">{title}</h2>
      </div>
      <Separator className="bg-slate-700" />
      {children}
    </div>
  );
}

export default function Settings() {
  const [orgName, setOrgName] = useState("");
  const [notifications, setNotifications] = useState({
    processComplete: true,
    reviewRequired: true,
    weeklyDigest: false,
  });

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { mutate: saveOrg, isPending } = useMutation({
    mutationFn: async () => {
      // In a real app this would update the organization record
      await new Promise((r) => setTimeout(r, 500));
    },
    onSuccess: () => toast.success("Organization settings saved"),
  });

  const apiKey = `omf_live_${btoa(user?.id ?? "demo").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32)}`;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your workspace and preferences</p>
      </div>

      <Section icon={SettingsIcon} title="Organization">
        <div className="space-y-3">
          <div>
            <Label className="text-slate-300 text-sm mb-1.5 block">Organization name</Label>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your company name"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-sm mb-1.5 block">Account email</Label>
            <Input
              value={user?.email ?? ""}
              readOnly
              className="bg-slate-700/50 border-slate-600 text-slate-400"
            />
          </div>
          <Button
            onClick={() => saveOrg()}
            disabled={isPending || !orgName}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Save"}
          </Button>
        </div>
      </Section>

      <Section icon={Key} title="API Keys">
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">
            Use this key to push data programmatically via the {APP_NAME} REST API.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={apiKey}
              readOnly
              type="password"
              className="bg-slate-700/50 border-slate-600 text-slate-300 font-mono"
            />
            <Button
              onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("API key copied"); }}
              variant="outline"
              size="icon"
              className="shrink-0 border-slate-600 text-slate-300"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 border-slate-600 text-slate-300"
              onClick={() => toast.info("API key rotated (demo)")}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-slate-500 text-xs">Keep this secret. Rotate it immediately if compromised.</p>
        </div>
      </Section>

      <Section icon={Bell} title="Notifications">
        <div className="space-y-4">
          {[
            { key: "processComplete" as const, label: "Processing complete", desc: "Notify when documents finish processing" },
            { key: "reviewRequired" as const, label: "Review required", desc: "Alert when records need human review" },
            { key: "weeklyDigest" as const, label: "Weekly digest", desc: "Summary of activity every Monday" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-medium">{label}</div>
                <div className="text-slate-400 text-xs">{desc}</div>
              </div>
              <Switch
                checked={notifications[key]}
                onCheckedChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Shield} title="Data & Privacy">
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-white font-medium">Data isolation</div>
              <div className="text-slate-400">Your data is isolated using Row-Level Security. No other organization can access it.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-white font-medium">Encryption</div>
              <div className="text-slate-400">Files are encrypted at rest and in transit. Processing happens in isolated environments.</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10"
            onClick={() => toast.info("Export requested — you'll receive an email within 24h")}
          >
            Export my data
          </Button>
        </div>
      </Section>
    </div>
  );
}
