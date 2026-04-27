import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Users, BookOpen, Database, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookCard from "@/components/BookCard";
import MoodSelector from "@/components/MoodSelector";
import { getFeaturedBooks, LIBRARY_COLLECTIONS } from "@/lib/bookData";
import { MOODS } from "@/lib/moods";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const FEATURED = getFeaturedBooks();
const PREVIEW_MOODS = MOODS.slice(0, 6);

const STATS = [
  { value: "1.5M+", label: "Books & Digital Titles", icon: BookOpen },
  { value: "10", label: "Specialised Libraries", icon: Database },
  { value: "21M+", label: "Database Records", icon: Award },
  { value: "Free", label: "Public Access", icon: Users },
];

const EVENTS = [
  { title: "Author Talk: Voices of the Gulf", date: "May 3, 2026", type: "Author Talk", time: "6:00 PM" },
  { title: "Children's Storytelling Hour", date: "Every Saturday", type: "Kids Program", time: "10:00 AM" },
  { title: "Arabic Calligraphy Workshop", date: "May 10, 2026", type: "Workshop", time: "3:00 PM" },
  { title: "Book Club: World Literature", date: "May 17, 2026", type: "Book Club", time: "7:00 PM" },
];

const EVENT_COLORS: Record<string, string> = {
  "Author Talk": "bg-blue-100 text-blue-800",
  "Kids Program": "bg-green-100 text-green-800",
  "Workshop": "bg-purple-100 text-purple-800",
  "Book Club": "bg-amber-100 text-amber-800",
};

export default function Home() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const navigate = useNavigate();

  function handleMoodSelect(id: string) {
    setSelectedMood(id);
    setTimeout(() => navigate(`/mood?mood=${id}`), 300);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden navy-gradient text-white">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-20 text-9xl">☽</div>
          <div className="absolute bottom-10 right-20 text-8xl">✦</div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20rem] opacity-30">◈</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 gold-gradient" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium mb-6 border border-accent/30">
              <Sparkles className="w-3.5 h-3.5" />
              New: Personalised Mood-Based Discovery
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              A Lighthouse of
              <span className="block text-transparent bg-clip-text gold-gradient">Knowledge</span>
            </h1>
            <p className="text-xl text-white/70 leading-relaxed mb-8 max-w-xl">
              Explore 1.5 million books across 10 specialised libraries. Dubai's most ambitious cultural institution, open to all.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-white hover:bg-accent/90 font-semibold">
                <Link to="/mood">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Find Books by Mood
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link to="/collections">
                  Explore Collections
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-bold text-xl text-primary leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mood Finder Feature */}
      <section className="bg-gradient-to-br from-primary/5 to-accent/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4 border border-accent/20">
              <Sparkles className="w-3.5 h-3.5" />
              Personalised Discovery
            </div>
            <h2 className="font-serif text-4xl font-bold text-primary mb-3">
              What Are You in the Mood to Read?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Our intelligent mood-matching engine connects your feeling to the perfect book from our 1.5 million collection.
            </p>
          </div>

          <MoodSelector selected={selectedMood} onSelect={handleMoodSelect} compact />

          <div className="text-center mt-8">
            <Button asChild className="bg-primary text-white hover:bg-primary/90">
              <Link to="/mood">
                <Sparkles className="w-4 h-4 mr-2" />
                Open Full Mood Finder
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured books */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-1">Curated For You</p>
            <h2 className="font-serif text-3xl font-bold text-primary">Editor's Picks</h2>
          </div>
          <Link to="/collections" className="hidden sm:flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
            Browse all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {FEATURED.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>

      {/* 10 Collections */}
      <section className="bg-muted/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-sm font-medium text-accent uppercase tracking-wider mb-1">Explore</p>
              <h2 className="font-serif text-3xl font-bold text-primary">10 Specialised Libraries</h2>
            </div>
            <Link to="/collections" className="hidden sm:flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
              All collections <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {LIBRARY_COLLECTIONS.map((col) => (
              <Link
                key={col.id}
                to="/collections"
                className="flex flex-col items-center text-center p-4 bg-white rounded-xl border border-border hover:shadow-md hover:border-accent/50 transition-all group"
              >
                <span className="text-3xl mb-2">{col.icon}</span>
                <p className="text-sm font-semibold text-primary group-hover:text-accent transition-colors leading-tight">
                  {col.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{col.floor}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-1">Coming Up</p>
            <h2 className="font-serif text-3xl font-bold text-primary">Events & Programs</h2>
          </div>
          <Link to="/events" className="hidden sm:flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
            All events <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EVENTS.map((event) => (
            <div key={event.title} className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow group">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${EVENT_COLORS[event.type]}`}>
                {event.type}
              </span>
              <h3 className="font-serif font-semibold text-foreground mt-3 mb-1 group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              <p className="text-sm text-muted-foreground">{event.date}</p>
              <p className="text-sm text-accent font-medium">{event.time}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Membership CTA */}
      <section className="navy-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="h-1 w-16 gold-gradient rounded-full mb-5" />
              <h2 className="font-serif text-4xl font-bold mb-4">Become a Member</h2>
              <p className="text-white/70 leading-relaxed mb-2">
                Unlock the full power of the library — borrow books, access digital resources, get personalised reading recommendations, and join exclusive events.
              </p>
              <p className="text-accent font-medium">Children's membership is free. Adult from AED 50/year.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button asChild size="lg" className="bg-accent text-white hover:bg-accent/90 font-semibold">
                <Link to="/membership">Join Now — It's Free for Kids</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link to="/visit">Plan Your Visit</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Digital services */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-accent uppercase tracking-wider mb-2">Always Accessible</p>
          <h2 className="font-serif text-3xl font-bold text-primary">Digital Services</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "📱", title: "MBRL App", desc: "Personalised dashboard, book reservations & AR experiences inside the library." },
            { icon: "📖", title: "OverDrive", desc: "Thousands of eBooks and audiobooks available to borrow on any device." },
            { icon: "🔬", title: "ProQuest", desc: "Millions of academic articles, journals, and research papers in English." },
            { icon: "📚", title: "Al Manhal", desc: "The largest Arabic digital academic content platform — books, journals, dissertations." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-border p-6 hover:shadow-md hover:border-accent/40 transition-all">
              <span className="text-3xl block mb-3">{icon}</span>
              <h3 className="font-serif font-semibold text-primary mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
