import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Award,
  Store,
  BookOpen,
  ClipboardCheck,
  Users,
  FileText,
  BarChart2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/programs", label: "Programs", icon: Award },
  { to: "/admin/merchants", label: "Merchants", icon: Store },
  { to: "/admin/rules", label: "Rules", icon: BookOpen },
  { to: "/admin/review", label: "Review Queue", icon: ClipboardCheck },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/templates", label: "Templates", icon: FileText },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart2 },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_LINKS.map(({ to, label, icon: Icon, exact }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={exact}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/onboarding/auth", { replace: true });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-200">
        <div className="text-blue-700 font-bold text-lg leading-tight">LoyaltyOne</div>
        <div className="text-xs text-slate-500 font-medium mt-0.5">Admin Panel</div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <NavItems onNavigate={onNavigate} />
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-slate-200">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-sm text-slate-500">
      <span className="text-slate-700 font-medium">Admin</span>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span>/</span>
          <span className={cn(i === segments.length - 1 ? "text-slate-900 font-semibold" : "text-slate-600 capitalize")}>
            {seg.replace(/-/g, " ")}
          </span>
        </span>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-60">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-60 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          {/* Hamburger (mobile only) */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 -ml-2 transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          <Breadcrumb />
        </header>

        {/* Page outlet */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
