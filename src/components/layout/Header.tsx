import { Bell, LogOut, User, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, NavLink } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";
import {
  LayoutDashboard, Upload, FileText, Database,
  Eye, GitBranch, Plug, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "Upload" },
  { to: "/documents", icon: FileText, label: "Documents" },
  { to: "/records", icon: Database, label: "Records" },
  { to: "/review", icon: Eye, label: "Review" },
  { to: "/schemas", icon: GitBranch, label: "Schemas" },
  { to: "/integrations", icon: Plug, label: "Integrations" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Header() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 bg-slate-950 border-b border-slate-800 shrink-0">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white text-lg">{APP_NAME}</span>
      </div>

      {/* Mobile nav (horizontal scroll) */}
      <nav className="flex md:hidden items-center gap-1 overflow-x-auto flex-1 mx-4 scrollbar-hide">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              )
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
          <Bell className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-indigo-600 text-white text-xs">U</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-700">
            <DropdownMenuItem className="text-slate-300">
              <User className="w-4 h-4 mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-400">
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
