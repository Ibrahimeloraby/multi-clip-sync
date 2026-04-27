import { Check, User, Users, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TIERS = [
  {
    name: "Children",
    nameAr: "الأطفال",
    icon: Baby,
    price: "Free",
    fee: "+ AED 75 insurance",
    color: "from-green-500 to-emerald-600",
    popular: false,
    benefits: [
      "Access to Children's Library",
      "Borrow up to 5 books at a time",
      "Free storytelling sessions",
      "Children's reading programs",
      "MBRL mobile app access",
      "Augmented reality experiences",
    ],
  },
  {
    name: "Individual",
    nameAr: "فردي",
    icon: User,
    price: "AED 50",
    fee: "+ AED 150 insurance / year",
    color: "from-primary to-blue-800",
    popular: true,
    benefits: [
      "Access to all 10 libraries",
      "Borrow up to 10 books at a time",
      "Digital library access (OverDrive, ProQuest)",
      "Reserve books online",
      "Attend all public events",
      "Personalised reading recommendations",
      "MBRL app with member dashboard",
      "Access to Al Manhal Arabic database",
    ],
  },
  {
    name: "Family",
    nameAr: "عائلي",
    icon: Users,
    price: "AED 50",
    fee: "+ AED 200 insurance / year",
    color: "from-accent to-yellow-600",
    popular: false,
    benefits: [
      "Everything in Individual",
      "Cover up to 4 family members",
      "All children in family included free",
      "Family reading programs",
      "Priority event booking",
      "Dedicated family reading rooms",
      "Joint family reading goals",
    ],
  },
];

const BENEFITS = [
  { icon: "📚", title: "1.5 Million Titles", desc: "Print and digital access to one of the world's great collections." },
  { icon: "💻", title: "Digital Access 24/7", desc: "OverDrive, ProQuest, Al Manhal — available on your devices anywhere." },
  { icon: "🤖", title: "Smart Services", desc: "Pepper robot guides, AR experiences, and the automated Monorail book system." },
  { icon: "🎤", title: "Exclusive Events", desc: "Author talks, workshops, book clubs, and cultural programs all year round." },
  { icon: "✨", title: "Mood Recommendations", desc: "Our AI-powered mood finder matches your feelings to your next perfect read." },
  { icon: "🏛️", title: "Rare Collections", desc: "Access to manuscripts and rare items dating back to the 13th century." },
];

export default function Membership() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="navy-gradient text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="h-1 w-16 gold-gradient rounded-full mx-auto mb-6" />
          <h1 className="font-serif text-5xl font-bold mb-4">Become a Member</h1>
          <p className="text-white/70 text-lg max-w-lg mx-auto">
            Open to all UAE citizens and residents. Free public entry — membership unlocks borrowing, digital access, and exclusive benefits.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full">

        {/* Pricing tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {TIERS.map(({ name, nameAr, icon: Icon, price, fee, color, popular, benefits }) => (
            <div
              key={name}
              className={`relative rounded-2xl overflow-hidden border ${popular ? "border-accent shadow-xl scale-105" : "border-border shadow-sm"} bg-white flex flex-col`}
            >
              {popular && (
                <div className="absolute top-0 left-0 right-0 text-center py-1.5 bg-accent text-white text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <div className={`p-6 bg-gradient-to-br ${color} text-white ${popular ? "pt-9" : ""}`}>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="font-serif text-2xl font-bold">{name}</h2>
                <p className="font-arabic text-white/70 text-sm">{nameAr}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{price}</span>
                  <p className="text-white/60 text-sm mt-1">{fee}</p>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-2.5 flex-1">
                  {benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/80">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`mt-6 w-full font-semibold ${popular ? "bg-accent text-white hover:bg-accent/90" : "bg-primary text-white hover:bg-primary/90"}`}
                >
                  <a href="https://www.mbrl.ae/membership-info" target="_blank" rel="noopener noreferrer">
                    Apply for {name} Membership
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Why join */}
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl font-bold text-primary mb-3">Why Join MBRL?</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Everything a curious mind could need — in one extraordinary place.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-border p-6 hover:shadow-md hover:border-accent/30 transition-all">
              <span className="text-3xl block mb-3">{icon}</span>
              <h3 className="font-serif font-semibold text-primary mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
