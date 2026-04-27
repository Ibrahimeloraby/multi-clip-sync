import { Link } from "react-router-dom";
import { BookMarked, MapPin, Clock, Phone, Instagram, Twitter, Facebook, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary text-white mt-20">
      {/* Gold divider */}
      <div className="h-1 gold-gradient" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
                <BookMarked className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-serif font-bold text-white text-base">Mohammed Bin Rashid Library</p>
                <p className="text-xs text-white/50 font-arabic">مكتبة محمد بن راشد</p>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs mb-5">
              Dubai's lighthouse of knowledge, culture and creativity. 1.5 million books across 10 specialised libraries. Free public access.
            </p>
            <div className="space-y-2.5 text-sm text-white/60">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>Al Jaddaf, Dubai Creek, Dubai, UAE</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>Mon–Thu & Sat: 9am–9pm · Fri: 2pm–9pm · Sun: Closed</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>800-MBRL (6275)</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {[
                { href: "https://www.instagram.com/mbrlae/", icon: Instagram },
                { href: "https://twitter.com/MBRLAE", icon: Twitter },
                { href: "https://www.facebook.com/mbrlae/", icon: Facebook },
                { href: "https://www.youtube.com/@MBRLAE", icon: Youtube },
              ].map(({ href, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Collections */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">Collections</h3>
            <ul className="space-y-2">
              {["General Library", "Business Library", "Children's Library", "Young Adult Library", "Special Collections", "Emirates Library"].map((item) => (
                <li key={item}>
                  <Link to="/collections" className="text-sm text-white/60 hover:text-white hover:text-accent transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">Services</h3>
            <ul className="space-y-2">
              {[
                { label: "Membership", to: "/membership" },
                { label: "Mood Finder ✨", to: "/mood" },
                { label: "Events & Programs", to: "/events" },
                { label: "Digital Services", to: "/visit" },
                { label: "E-Resources", to: "/visit" },
                { label: "Plan Your Visit", to: "/visit" },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-white/60 hover:text-accent transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* App + membership CTA */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">Get the App</h3>
            <p className="text-sm text-white/60 mb-4">Access your library account, reserve books, and explore AR experiences.</p>
            <div className="space-y-2">
              <a href="https://apps.apple.com/app/mbrl/id1508965336" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-accent/80 transition-colors text-sm text-white">
                🍎 Download on App Store
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.mbrlibrary" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-accent/80 transition-colors text-sm text-white">
                🤖 Get on Google Play
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Mohammed Bin Rashid Library. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-white/40">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-white transition-colors">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
