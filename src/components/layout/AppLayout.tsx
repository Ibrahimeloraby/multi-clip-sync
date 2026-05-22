import { Outlet } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import BottomNav from "./BottomNav";

export default function AppLayout() {
  const { isRTL, setLanguage } = useAppContext();

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col min-h-screen bg-slate-50">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-blue-700 font-bold text-xl tracking-tight">LoyaltyOne</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button className="p-2 rounded-full hover:bg-slate-100 relative">
            <Bell className="w-5 h-5 text-slate-600" />
          </button>
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(isRTL ? "en" : "ar")}
            className="text-xs font-medium px-2 py-1 rounded border border-slate-200 hover:bg-slate-100"
          >
            {isRTL ? "EN" : "عربي"}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <BottomNav />
    </div>
  );
}
