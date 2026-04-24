import { Link } from "react-router-dom";
import { BookMarked, Instagram, Facebook, MapPin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <BookMarked className="w-4 h-4 text-primary" />
              </div>
              <span className="font-serif text-xl font-bold">Bookends</span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
              UAE's favourite marketplace for pre-loved books. Every book has a story — and so does its next owner. Founded in Dubai by two moms who love reading.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://www.instagram.com/bookendsae/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.facebook.com/Bookendsae/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-primary-foreground/80">
              Explore
            </h3>
            <ul className="space-y-2.5">
              {[
                { to: "/", label: "Home" },
                { to: "/mood", label: "Mood Finder" },
                { to: "/reviews", label: "Community Reviews" },
                { to: "/new-releases", label: "New Releases" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-primary-foreground/80">
              Contact
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-primary-foreground/70">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
                <span>Dubai Silicon Oasis, Dubai, UAE</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-primary-foreground/70">
                <Mail className="w-4 h-4 shrink-0 text-accent" />
                <a href="mailto:hello@bookends.ae" className="hover:text-primary-foreground transition-colors">
                  hello@bookends.ae
                </a>
              </li>
            </ul>
            <div className="mt-5 p-3 rounded-lg bg-primary-foreground/10 text-sm">
              <p className="font-medium text-accent">1 Million Books Challenge</p>
              <p className="text-primary-foreground/60 text-xs mt-1">
                Help us reach 1 million books read by 2031!
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} Bookends UAE. All rights reserved.
          </p>
          <p className="text-xs text-primary-foreground/40 italic font-serif">
            "A reader lives a thousand lives before he dies."
          </p>
        </div>
      </div>
    </footer>
  );
}
