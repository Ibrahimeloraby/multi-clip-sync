import { useNavigate, useLocation } from "react-router-dom";
import { Zap, Shield, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Earn", path: "/earn", icon: Zap },
  { label: "Passport", path: "/passport", icon: Shield },
  { label: "Wallet", path: "/wallet", icon: Wallet },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0F]/95 backdrop-blur-md border-t border-white/10 safe-area-inset-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ label, path, icon: Icon }) => {
          const active = pathname === path || (path === "/earn" && pathname === "/");
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-150",
                active ? "text-[#00FF87]" : "text-white/40 hover:text-white/60"
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.5}
                className={cn("transition-transform", active && "scale-110")}
              />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
