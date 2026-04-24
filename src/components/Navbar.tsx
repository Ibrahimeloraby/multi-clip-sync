import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookMarked, Menu, X, Sparkles, Star, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/mood", label: "Mood Finder", icon: Sparkles },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/new-releases", label: "New Releases", icon: Flame },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookMarked className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-serif text-lg font-bold text-primary tracking-tight">Bookends</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Pre-Loved Books UAE</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-accent/20 text-primary font-semibold"
                    : "text-muted-foreground hover:text-primary hover:bg-muted"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA + hamburger */}
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <a href="https://bookends.ae/pages/our-services" target="_blank" rel="noopener noreferrer">
                Sell a Book
              </a>
            </Button>

            <button
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-white">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-accent/20 text-primary font-semibold"
                    : "text-muted-foreground hover:text-primary hover:bg-muted"
                )}
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-border mt-1">
              <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <a href="https://bookends.ae/pages/our-services" target="_blank" rel="noopener noreferrer">
                  Sell a Book
                </a>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
