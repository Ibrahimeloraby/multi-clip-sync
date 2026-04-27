import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Search, User, BookMarked, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/collections", label: "Collections" },
  { href: "/mood", label: "Mood Finder ✨" },
  { href: "/events", label: "Events" },
  { href: "/membership", label: "Membership" },
  { href: "/visit", label: "Plan Your Visit" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"EN" | "AR">("EN");
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top utility bar */}
      <div className="bg-primary/95 border-b border-white/10 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <p className="text-xs text-white/60">
            Mon–Thu & Sat: 9:00 AM – 9:00 PM &nbsp;|&nbsp; Fri: 2:00 PM – 9:00 PM &nbsp;|&nbsp; Sun: Closed
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === "EN" ? "AR" : "EN")}
              className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "EN" ? "العربية" : "English"}
            </button>
            <Link to="/membership" className="text-xs text-accent hover:text-accent/80 font-medium transition-colors">
              Become a Member
            </Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="bg-primary shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0" onClick={() => setOpen(false)}>
              <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center">
                <BookMarked className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-serif text-base font-bold text-white tracking-tight">
                  Mohammed Bin Rashid Library
                </span>
                <span className="text-[10px] text-white/50 font-arabic tracking-wide">
                  مكتبة محمد بن راشد
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  to={href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-all",
                    pathname === href
                      ? "text-accent"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right icons */}
            <div className="flex items-center gap-2">
              <button className="hidden md:flex p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Search className="w-4 h-4" />
              </button>
              <Button
                asChild
                size="sm"
                className="hidden md:flex bg-accent text-white hover:bg-accent/90 text-xs font-semibold"
              >
                <Link to="/membership">
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  My Account
                </Link>
              </Button>
              <button
                className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setOpen(!open)}
              >
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-primary border-t border-white/10">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-white/10 text-accent"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/10 mt-1 flex flex-col gap-2">
              <Button asChild className="bg-accent text-white hover:bg-accent/90">
                <Link to="/membership" onClick={() => setOpen(false)}>
                  <User className="w-4 h-4 mr-2" />
                  My Account / Sign In
                </Link>
              </Button>
              <button
                onClick={() => setLang(lang === "EN" ? "AR" : "EN")}
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white"
              >
                <Globe className="w-4 h-4" />
                Switch to {lang === "EN" ? "العربية" : "English"}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
