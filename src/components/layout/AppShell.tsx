import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "./BottomNav";
import PartnerPortal from "@/components/PartnerPortal";

interface AppShellProps {
  children: React.ReactNode;
  coinBalance?: number;
  hideNav?: boolean;
}

export default function AppShell({ children, coinBalance = 0, hideNav = false }: AppShellProps) {
  const navigate = useNavigate();
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="text-xl font-black tracking-tight text-white"
        >
          Fan<span className="text-[#00FF87]">Zone</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Coin balance */}
          <div className="flex items-center gap-1.5 bg-[#00FF87]/10 border border-[#00FF87]/20 rounded-full px-3 py-1">
            <span className="text-[#00FF87] text-sm font-bold">⚡</span>
            <span className="text-[#00FF87] text-sm font-bold">
              {coinBalance.toLocaleString()} FC
            </span>
          </div>

          {/* Partner portal pill */}
          <button
            onClick={() => setPortalOpen(true)}
            className="text-xs font-semibold text-white/60 border border-white/20 rounded-full px-3 py-1 hover:border-white/40 hover:text-white/80 transition-colors"
          >
            ⊞ Portal
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom nav */}
      {!hideNav && <BottomNav />}

      {/* Partner portal modal */}
      <PartnerPortal open={portalOpen} onClose={() => setPortalOpen(false)} />
    </div>
  );
}
