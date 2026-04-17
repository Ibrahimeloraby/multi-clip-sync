import { useState, useEffect } from "react";
import { PLATFORMS } from "@/lib/platforms";
import { loadUserPlatforms, saveUserPlatform, removeUserPlatform } from "@/lib/moodAgentService";
import type { UserPlatform } from "@/agent/types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const REGIONS = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "AE", label: "UAE" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "EG", label: "Egypt" },
  { code: "KW", label: "Kuwait" },
  { code: "QA", label: "Qatar" },
  { code: "IN", label: "India" },
];

interface PlatformConnectorProps {
  userId?: string;
  onPlatformsChange?: (platforms: UserPlatform[]) => void;
}

export default function PlatformConnector({ userId, onPlatformsChange }: PlatformConnectorProps) {
  const [connected, setConnected] = useState<Record<string, UserPlatform>>({});
  const [region, setRegion] = useState("US");
  const [saving, setSaving] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadUserPlatforms(userId).then((platforms) => {
      const map: Record<string, UserPlatform> = {};
      platforms.forEach((p) => (map[p.platform_id] = p));
      setConnected(map);
      if (platforms[0]) setRegion(platforms[0].country_code);
      setLoaded(true);
    });
  }, [userId]);

  const availablePlatforms = PLATFORMS.filter((p) => p.countries.includes(region));
  const connectedCount = Object.values(connected).filter((p) => p.is_active).length;

  const toggle = async (platformId: string, platformName: string, active: boolean) => {
    if (!userId) return;
    setSaving(platformId);
    try {
      if (active) {
        const platform: UserPlatform = {
          platform_id: platformId,
          platform_name: platformName,
          is_active: true,
          country_code: region,
        };
        await saveUserPlatform(userId, platform);
        const next = { ...connected, [platformId]: platform };
        setConnected(next);
        onPlatformsChange?.(Object.values(next));
      } else {
        await removeUserPlatform(userId, platformId);
        const next = { ...connected };
        delete next[platformId];
        setConnected(next);
        onPlatformsChange?.(Object.values(next));
      }
    } finally {
      setSaving(null);
    }
  };

  const handleRegionChange = async (newRegion: string) => {
    setRegion(newRegion);
    // Update country_code on all connected platforms
    if (!userId) return;
    const updated = { ...connected };
    for (const id of Object.keys(updated)) {
      updated[id] = { ...updated[id], country_code: newRegion };
      await saveUserPlatform(userId, updated[id]);
    }
    setConnected(updated);
    onPlatformsChange?.(Object.values(updated));
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Your Platforms</h2>
        <p className="text-sm text-muted-foreground">
          Connect the streaming services you subscribe to. We'll only recommend content available on them.
        </p>
      </div>

      {/* Region selector */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
        <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1">
          <div className="text-xs font-medium text-muted-foreground mb-1">Your region</div>
          <Select value={region} onValueChange={handleRegionChange}>
            <SelectTrigger className="h-8 text-sm border-0 bg-transparent p-0 shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r.code} value={r.code} className="text-sm">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {connectedCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-green-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {connectedCount} connected
          </div>
        )}
      </div>

      {!userId && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Sign in to save your platform preferences
        </div>
      )}

      {/* Platform list */}
      <div className="space-y-2">
        {availablePlatforms.map((platform) => {
          const isConnected = !!connected[platform.id];
          const isSaving = saving === platform.id;

          return (
            <div
              key={platform.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                isConnected ? "border-primary/40 bg-primary/5" : "border-border bg-card"
              )}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: platform.color + "20" }}
              >
                {platform.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{platform.name}</div>
                <div className="text-xs text-muted-foreground">
                  {isConnected ? "Connected · included in search" : "Not connected"}
                </div>
              </div>
              <Switch
                checked={isConnected}
                disabled={isSaving || !loaded}
                onCheckedChange={(checked) => toggle(platform.id, platform.name, checked)}
              />
            </div>
          );
        })}
      </div>

      {availablePlatforms.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          No platforms available for {region}. Try changing your region.
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Platform availability is sourced from TMDB's watch provider data
      </p>
    </div>
  );
}
