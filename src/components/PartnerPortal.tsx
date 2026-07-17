import { useState } from "react";
import { X, BarChart3, Users, Target, TrendingUp, Award, Megaphone, Globe, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface PartnerPortalProps {
  open: boolean;
  onClose: () => void;
}

type PortalView = "menu" | "club" | "sponsor";
type ClubScreen = "overview" | "intelligence" | "segments" | "campaigns" | "rewards" | "top_fans";
type SponsorScreen = "overview" | "explorer" | "creator" | "live" | "reports";

// Mock data
const MOCK_CLUB = {
  name: "Arsenal FC",
  fans: 42800,
  avgScore: 74,
  activeLast7d: 18400,
  fanValue: "£1.8M",
  tier: "Pro",
};

const MOCK_SEGMENTS = [
  { name: "Superfans", count: 8200, score: 89, color: "#00FF87" },
  { name: "Active Fans", count: 14600, score: 66, color: "#00D4FF" },
  { name: "Casual", count: 15800, score: 32, color: "#FF8C00" },
  { name: "Lapsed", count: 4200, score: 11, color: "#FF4444" },
];

const MOCK_TOP_FANS = [
  { username: "GoonsGlobal", city: "Dubai", coins: 18400, tier: "Legend" },
  { username: "ArseneWho", city: "London", coins: 15200, tier: "Legend" },
  { username: "NorthLondon7", city: "Toronto", coins: 12800, tier: "Superfan" },
  { username: "GunnersDaily", city: "Lagos", coins: 11100, tier: "Superfan" },
  { username: "RedAndWhite", city: "Paris", coins: 9800, tier: "Superfan" },
];

const MOCK_CAMPAIGNS = [
  { name: "Kit Launch Survey", type: "survey", reach: 12400, engagement: "68%", spend: "24,800 FC", status: "active" },
  { name: "Matchday Brand Pick", type: "brand_pick", reach: 8200, engagement: "71%", spend: "16,400 FC", status: "active" },
  { name: "Fan Proof: Away Kit", type: "fan_proof", reach: 3100, engagement: "44%", spend: "6,200 FC", status: "paused" },
];

const MOCK_SPONSOR = {
  name: "Nike FC",
  totalBudget: "500,000 FC",
  spent: "182,400 FC",
  reach: 94200,
  engagements: 61800,
  cpe: "£0.12",
};

export default function PartnerPortal({ open, onClose }: PartnerPortalProps) {
  const [view, setView] = useState<PortalView>("menu");
  const [clubScreen, setClubScreen] = useState<ClubScreen>("overview");
  const [sponsorScreen, setSponsorScreen] = useState<SponsorScreen>("overview");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#080810]">
      {/* Portal header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b",
          view === "sponsor" ? "border-[#00D4FF]/20 bg-[#00D4FF]/5" : "border-[#00FF87]/20 bg-[#00FF87]/5"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest uppercase text-white/40">
            Partner Portal
          </span>
          {view !== "menu" && (
            <>
              <span className="text-white/20">›</span>
              <span
                className={cn(
                  "text-xs font-bold tracking-widest uppercase",
                  view === "sponsor" ? "text-[#00D4FF]" : "text-[#00FF87]"
                )}
              >
                {view === "club" ? "Club Dashboard" : "Sponsor Dashboard"}
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => { onClose(); setView("menu"); }}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={18} className="text-white/60" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === "menu" && <PortalMenu onSelect={setView} />}
        {view === "club" && <ClubDashboard screen={clubScreen} setScreen={setClubScreen} />}
        {view === "sponsor" && <SponsorDashboard screen={sponsorScreen} setScreen={setSponsorScreen} />}
      </div>

      {view !== "menu" && (
        <button
          onClick={() => setView("menu")}
          className="m-4 py-3 rounded-xl border border-white/20 text-white/60 text-sm font-medium hover:bg-white/5 transition-colors"
        >
          ← Back to Portal Menu
        </button>
      )}
    </div>
  );
}

function PortalMenu({ onSelect }: { onSelect: (v: PortalView) => void }) {
  return (
    <div className="p-6 flex flex-col gap-4 max-w-lg mx-auto">
      <p className="text-white/40 text-sm text-center mb-2">Select a dashboard to preview</p>

      <button
        onClick={() => onSelect("club")}
        className="p-5 rounded-2xl border border-[#00FF87]/30 bg-[#00FF87]/5 text-left hover:bg-[#00FF87]/10 transition-colors"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#00FF87]/20 flex items-center justify-center">
            <BarChart3 size={20} className="text-[#00FF87]" />
          </div>
          <div>
            <p className="font-bold text-white">Club Dashboard</p>
            <p className="text-xs text-white/40">Fan intelligence & campaign tools</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Fan Intelligence", "Segments", "Campaigns"].map((s) => (
            <span key={s} className="text-[10px] text-[#00FF87]/70 bg-[#00FF87]/10 rounded-lg px-2 py-1 text-center">
              {s}
            </span>
          ))}
        </div>
      </button>

      <button
        onClick={() => onSelect("sponsor")}
        className="p-5 rounded-2xl border border-[#00D4FF]/30 bg-[#00D4FF]/5 text-left hover:bg-[#00D4FF]/10 transition-colors"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/20 flex items-center justify-center">
            <Target size={20} className="text-[#00D4FF]" />
          </div>
          <div>
            <p className="font-bold text-white">Sponsor Dashboard</p>
            <p className="text-xs text-white/40">Audience targeting & campaign performance</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Audience Explorer", "Campaign Creator", "Live Performance"].map((s) => (
            <span key={s} className="text-[10px] text-[#00D4FF]/70 bg-[#00D4FF]/10 rounded-lg px-2 py-1 text-center">
              {s}
            </span>
          ))}
        </div>
      </button>
    </div>
  );
}

function ClubDashboard({ screen, setScreen }: { screen: ClubScreen; setScreen: (s: ClubScreen) => void }) {
  const navItems: { key: ClubScreen; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "intelligence", label: "Intelligence", icon: TrendingUp },
    { key: "segments", label: "Segments", icon: PieChart },
    { key: "campaigns", label: "Campaigns", icon: Megaphone },
    { key: "rewards", label: "Rewards", icon: Award },
    { key: "top_fans", label: "Top Fans", icon: Users },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub-nav */}
      <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-white/10 scrollbar-none">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setScreen(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
              screen === key ? "bg-[#00FF87]/20 text-[#00FF87]" : "text-white/40 hover:text-white/60"
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {screen === "overview" && <ClubOverview />}
        {screen === "intelligence" && <ClubIntelligence />}
        {screen === "segments" && <ClubSegments />}
        {screen === "campaigns" && <ClubCampaigns />}
        {screen === "rewards" && <ClubRewards />}
        {screen === "top_fans" && <ClubTopFans />}
      </div>
    </div>
  );
}

function ClubOverview() {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#EF0107]/20 flex items-center justify-center text-2xl">⚽</div>
        <div>
          <p className="font-bold text-white">{MOCK_CLUB.name}</p>
          <span className="text-xs text-[#00FF87] bg-[#00FF87]/10 px-2 py-0.5 rounded-full">{MOCK_CLUB.tier} Tier</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Fans", value: MOCK_CLUB.fans.toLocaleString(), color: "#00FF87" },
          { label: "Active (7d)", value: MOCK_CLUB.activeLast7d.toLocaleString(), color: "#00D4FF" },
          { label: "Avg Fan Score", value: `${MOCK_CLUB.avgScore}/100`, color: "#FFB800" },
          { label: "Est. Fan Value", value: MOCK_CLUB.fanValue, color: "#FF6B35" },
        ].map(({ label, value, color }) => (
          <KpiCard key={label} label={label} value={value} color={color} />
        ))}
      </div>
      <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs text-white/40 mb-3">Fan Tier Distribution</p>
        {MOCK_SEGMENTS.map((s) => (
          <div key={s.name} className="flex items-center gap-3 mb-2">
            <span className="text-xs text-white/60 w-20">{s.name}</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(s.count / MOCK_CLUB.fans) * 100}%`, background: s.color }} />
            </div>
            <span className="text-xs text-white/40 w-12 text-right">{s.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function ClubIntelligence() {
  const stats = [
    { label: "Prediction Accuracy", value: "67%", trend: "+4%" },
    { label: "Community Posts/wk", value: "2,840", trend: "+12%" },
    { label: "Avg Session Time", value: "8.4 min", trend: "+2%" },
    { label: "Survey Response Rate", value: "74%", trend: "+8%" },
    { label: "Brand Pick Responses", value: "5,200", trend: "+18%" },
    { label: "Fan Proof Submissions", value: "380", trend: "+24%" },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 uppercase tracking-widest">Engagement Intelligence</p>
      {stats.map(({ label, value, trend }) => (
        <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-sm text-white/70">{label}</span>
          <div className="text-right">
            <p className="text-sm font-bold text-white">{value}</p>
            <p className="text-xs text-[#00FF87]">{trend} vs prev 7d</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClubSegments() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 uppercase tracking-widest">Fan Segments</p>
      {MOCK_SEGMENTS.map((s) => (
        <div key={s.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
              <span className="font-medium text-white">{s.name}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: s.color }}>{s.count.toLocaleString()} fans</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Avg commercial score:</span>
            <span className="text-xs font-bold text-white">{s.score}/100</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: s.color }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClubCampaigns() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40 uppercase tracking-widest">Active Campaigns</p>
        <button className="text-xs text-[#00FF87] font-medium">+ New</button>
      </div>
      {MOCK_CAMPAIGNS.map((c) => (
        <div key={c.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-white text-sm">{c.name}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
              c.status === "active" ? "bg-[#00FF87]/20 text-[#00FF87]" : "bg-white/10 text-white/40"
            )}>{c.status}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><p className="text-white/40">Reach</p><p className="text-white font-medium">{c.reach.toLocaleString()}</p></div>
            <div><p className="text-white/40">Engagement</p><p className="text-white font-medium">{c.engagement}</p></div>
            <div><p className="text-white/40">Spend</p><p className="text-white font-medium">{c.spend}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClubRewards() {
  const prizes = [
    { name: "Match Day VIP", claimed: 3, remaining: 2, coins: "25,000 FC" },
    { name: "Signed Shirt", claimed: 8, remaining: 12, coins: "8,000 FC" },
    { name: "Stadium Tour", claimed: 12, remaining: 18, coins: "6,000 FC" },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 uppercase tracking-widest">Rewards Manager</p>
      {prizes.map((p) => (
        <div key={p.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-white text-sm">{p.name}</span>
            <span className="text-xs text-[#00FF87]">{p.coins}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-white/40">Claimed: <span className="text-white">{p.claimed}</span></span>
            <span className="text-white/40">Remaining: <span className="text-white">{p.remaining}</span></span>
          </div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#00FF87] rounded-full" style={{ width: `${(p.claimed / (p.claimed + p.remaining)) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ClubTopFans() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 uppercase tracking-widest">Top Fans</p>
      {MOCK_TOP_FANS.map((fan, i) => (
        <div key={fan.username} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-lg font-black text-white/30 w-6 text-center">{i + 1}</span>
          <div className="w-9 h-9 rounded-full bg-[#00FF87]/20 flex items-center justify-center text-sm font-bold text-[#00FF87]">
            {fan.username[0]}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{fan.username}</p>
            <p className="text-xs text-white/40">{fan.city} · {fan.tier}</p>
          </div>
          <p className="text-xs font-bold text-[#00FF87]">{fan.coins.toLocaleString()} FC</p>
        </div>
      ))}
    </div>
  );
}

function SponsorDashboard({ screen, setScreen }: { screen: SponsorScreen; setScreen: (s: SponsorScreen) => void }) {
  const navItems: { key: SponsorScreen; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "explorer", label: "Audience", icon: Globe },
    { key: "creator", label: "Create", icon: Megaphone },
    { key: "live", label: "Live", icon: TrendingUp },
    { key: "reports", label: "Reports", icon: PieChart },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-[#00D4FF]/10 scrollbar-none">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setScreen(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
              screen === key ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "text-white/40 hover:text-white/60"
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {screen === "overview" && <SponsorOverview />}
        {screen === "explorer" && <SponsorExplorer />}
        {screen === "creator" && <SponsorCreator />}
        {screen === "live" && <SponsorLive />}
        {screen === "reports" && <SponsorReports />}
      </div>
    </div>
  );
}

function SponsorOverview() {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#00D4FF]/20 flex items-center justify-center text-2xl">👟</div>
        <div>
          <p className="font-bold text-white">{MOCK_SPONSOR.name}</p>
          <span className="text-xs text-[#00D4FF] bg-[#00D4FF]/10 px-2 py-0.5 rounded-full">Enterprise Partner</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Reach", value: MOCK_SPONSOR.reach.toLocaleString(), color: "#00D4FF" },
          { label: "Engagements", value: MOCK_SPONSOR.engagements.toLocaleString(), color: "#00FF87" },
          { label: "Budget Spent", value: MOCK_SPONSOR.spent, color: "#FFB800" },
          { label: "Cost Per Engage", value: MOCK_SPONSOR.cpe, color: "#FF6B35" },
        ].map(({ label, value, color }) => (
          <KpiCard key={label} label={label} value={value} color={color} />
        ))}
      </div>
    </>
  );
}

function SponsorExplorer() {
  const filters = [
    { label: "Engagement Tier", options: ["All", "Legend", "Superfan", "Active", "Casual"] },
    { label: "Sport", options: ["All Sports", "Football", "Basketball", "F1"] },
    { label: "Age Range", options: ["All Ages", "18-24", "25-34", "35-44", "45+"] },
  ];
  return (
    <div className="space-y-4">
      <p className="text-xs text-white/40 uppercase tracking-widest">Audience Explorer</p>
      {filters.map(({ label, options }) => (
        <div key={label}>
          <p className="text-xs text-white/60 mb-1.5">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {options.map((o, i) => (
              <button
                key={o}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
                  i === 0
                    ? "border-[#00D4FF]/50 bg-[#00D4FF]/15 text-[#00D4FF]"
                    : "border-white/20 text-white/50 hover:border-white/40"
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="p-4 rounded-xl bg-[#00D4FF]/5 border border-[#00D4FF]/20">
        <p className="text-xs text-white/40 mb-1">Estimated audience size</p>
        <p className="text-3xl font-black text-[#00D4FF]">94,200</p>
        <p className="text-xs text-white/40">verified sports fans</p>
      </div>
    </div>
  );
}

function SponsorCreator() {
  const steps = [
    { n: 1, label: "Campaign Goal", desc: "Brand awareness, fan data, product trial" },
    { n: 2, label: "Target Audience", desc: "Select sport, tier, demographics" },
    { n: 3, label: "Task Format", desc: "Survey, brand pick, watch & earn, fan proof" },
    { n: 4, label: "Budget & Timeline", desc: "Set FC budget and campaign dates" },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 uppercase tracking-widest">Campaign Creator</p>
      {steps.map(({ n, label, desc }) => (
        <div key={n} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="w-7 h-7 rounded-full bg-[#00D4FF]/20 flex items-center justify-center text-xs font-bold text-[#00D4FF] shrink-0 mt-0.5">
            {n}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{label}</p>
            <p className="text-xs text-white/40">{desc}</p>
          </div>
        </div>
      ))}
      <button className="w-full py-3 rounded-xl bg-[#00D4FF] text-[#0A0A0F] text-sm font-bold mt-2">
        Launch Campaign →
      </button>
    </div>
  );
}

function SponsorLive() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 uppercase tracking-widest">Live Performance</p>
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-sm font-medium text-white mb-1">Kit Launch Survey</p>
        <div className="space-y-2 mt-3">
          {[
            { label: "Fire 🔥", pct: 58 },
            { label: "Good", pct: 24 },
            { label: "Average", pct: 13 },
            { label: "Terrible", pct: 5 },
          ].map(({ label, pct }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-white/60 w-20">{label}</span>
              <div className="flex-1 h-4 bg-white/10 rounded overflow-hidden">
                <div className="h-full bg-[#00D4FF] rounded flex items-center justify-end pr-1.5 text-[10px] font-bold text-[#0A0A0F]" style={{ width: `${pct}%` }}>
                  {pct}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Responses", value: "8,240" },
          { label: "Avg Time", value: "23s" },
          { label: "Share Rate", value: "14%" },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-lg font-black text-[#00D4FF]">{value}</p>
            <p className="text-[10px] text-white/40">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SponsorReports() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 uppercase tracking-widest">Campaign Reports</p>
      {["Weekly Summary", "Audience Insights", "Brand Lift Report", "ROI Analysis"].map((r) => (
        <div key={r} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <PieChart size={16} className="text-[#00D4FF]" />
            <span className="text-sm text-white">{r}</span>
          </div>
          <button className="text-xs text-[#00D4FF] font-medium">Download</button>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}
