import { useLocation, useNavigate } from "react-router-dom";
import { Camera, Film, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: Camera, label: "Camera" },
  { path: "/videos", icon: Film, label: "Videos" },
  { path: "/recommendations", icon: Sparkles, label: "Taste" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.path === "/recommendations"
              ? location.pathname.startsWith("/recommendations")
              : location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("w-6 h-6", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
