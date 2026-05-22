import { NavLink } from "react-router-dom";
import { Home, Store, Sparkles, Users, Settings } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", icon: Home, labelEn: "Home", labelAr: "الرئيسية", exact: true },
  { to: "/dashboard/merchants", icon: Store, labelEn: "Merchants", labelAr: "التجار" },
  { to: "/dashboard/recommend", icon: Sparkles, labelEn: "Use Now", labelAr: "استخدم", isFab: true },
  { to: "/dashboard/community", icon: Users, labelEn: "Community", labelAr: "المجتمع" },
  { to: "/dashboard/settings", icon: Settings, labelEn: "Settings", labelAr: "الإعدادات" },
];

export default function BottomNav() {
  const { language } = useAppContext();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-area-inset-bottom">
      <div className="flex items-end justify-around px-1 h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          if (item.isFab) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center -mt-5 w-14 h-14 rounded-full shadow-lg transition-all",
                    isActive
                      ? "bg-blue-800 shadow-blue-300"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                  )
                }
                aria-label={language === "ar" ? item.labelAr : item.labelEn}
              >
                <Icon className="w-6 h-6 text-white" />
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-xs font-medium transition-colors",
                  isActive ? "text-blue-700" : "text-slate-500 hover:text-slate-700"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                  <span className="text-[10px] leading-tight">
                    {language === "ar" ? item.labelAr : item.labelEn}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
