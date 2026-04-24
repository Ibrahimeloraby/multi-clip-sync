import { useState } from "react";
import { Flame, ExternalLink, TrendingUp, BookOpen, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

type Tab = "fiction" | "nonfiction" | "arrived";

interface ReleaseBook {
  rank: number;
  title: string;
  author: string;
  description: string;
  source: string;
  sourceColor: string;
  weeksOnList?: number;
  cover: string;
  amazonUrl?: string;
}

const FICTION: ReleaseBook[] = [
  {
    rank: 1,
    title: "The Women",
    author: "Kristin Hannah",
    description: "The powerful story of a young woman who joins the Vietnam War as an army nurse and returns home to a country that doesn't want to hear about what she experienced.",
    source: "NYT #1 Bestseller",
    sourceColor: "bg-blue-100 text-blue-800",
    weeksOnList: 52,
    cover: "https://covers.openlibrary.org/b/isbn/9781250318480-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=The+Women+Kristin+Hannah",
  },
  {
    rank: 2,
    title: "Intermezzo",
    author: "Sally Rooney",
    description: "Two grieving brothers navigate love and loss in very different ways. A deeply affecting novel about family, romance, and what holds us together when everything falls apart.",
    source: "Goodreads Choice Award",
    sourceColor: "bg-amber-100 text-amber-800",
    weeksOnList: 28,
    cover: "https://covers.openlibrary.org/b/isbn/9780374611712-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=Intermezzo+Sally+Rooney",
  },
  {
    rank: 3,
    title: "James",
    author: "Percival Everett",
    description: "A Pulitzer Prize winner — a radical reimagining of Huckleberry Finn, told from the perspective of Jim, the enslaved man. A profound meditation on identity, freedom, and humanity.",
    source: "Pulitzer Prize Winner",
    sourceColor: "bg-purple-100 text-purple-800",
    weeksOnList: 40,
    cover: "https://covers.openlibrary.org/b/isbn/9780385550369-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=James+Percival+Everett",
  },
  {
    rank: 4,
    title: "The God of the Woods",
    author: "Lauren Fox",
    description: "When a thirteen-year-old girl vanishes from an elite Adirondack summer camp in 1975, secrets buried for decades begin to surface. A riveting mystery and family saga.",
    source: "Amazon Editors' Pick",
    sourceColor: "bg-orange-100 text-orange-800",
    weeksOnList: 20,
    cover: "https://covers.openlibrary.org/b/isbn/9780593472408-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=The+God+of+the+Woods",
  },
  {
    rank: 5,
    title: "The Covenant of Water",
    author: "Abraham Verghese",
    description: "An epic spanning three generations of a family in South India, grappling with a mysterious condition that causes drowning on land. Rich, beautiful, and deeply human.",
    source: "Goodreads Best Fiction",
    sourceColor: "bg-amber-100 text-amber-800",
    weeksOnList: 60,
    cover: "https://covers.openlibrary.org/b/isbn/9780802162175-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=The+Covenant+of+Water",
  },
];

const NONFICTION: ReleaseBook[] = [
  {
    rank: 1,
    title: "Nexus: A Brief History of Information Networks",
    author: "Yuval Noah Harari",
    description: "From the author of Sapiens — a sweeping history of how information networks have shaped humanity, from ancient scripts to AI. Essential reading for our digital age.",
    source: "NYT #1 Non-Fiction",
    sourceColor: "bg-blue-100 text-blue-800",
    weeksOnList: 30,
    cover: "https://covers.openlibrary.org/b/isbn/9780593735244-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=Nexus+Yuval+Noah+Harari",
  },
  {
    rank: 2,
    title: "The Anxious Generation",
    author: "Jonathan Haidt",
    description: "How the great rewiring of childhood is causing an epidemic of mental illness in teenagers — and what we can do about it. A landmark, urgent book for parents and educators.",
    source: "NYT Bestseller",
    sourceColor: "bg-blue-100 text-blue-800",
    weeksOnList: 48,
    cover: "https://covers.openlibrary.org/b/isbn/9780593655030-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=The+Anxious+Generation+Haidt",
  },
  {
    rank: 3,
    title: "Spare",
    author: "Prince Harry",
    description: "The most candid and captivating memoir to emerge from the Royal Family. Prince Harry recounts his journey from military service to the decision that changed his life.",
    source: "Amazon Charts",
    sourceColor: "bg-orange-100 text-orange-800",
    weeksOnList: 80,
    cover: "https://covers.openlibrary.org/b/isbn/9780593593806-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=Spare+Prince+Harry",
  },
  {
    rank: 4,
    title: "Clear Thinking",
    author: "Shane Parrish",
    description: "The Farnam Street founder delivers a practical guide to making better decisions. Learn to understand your own defaults and use clear thinking to get what you really want.",
    source: "Goodreads Choice",
    sourceColor: "bg-amber-100 text-amber-800",
    weeksOnList: 22,
    cover: "https://covers.openlibrary.org/b/isbn/9780593086124-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=Clear+Thinking+Shane+Parrish",
  },
  {
    rank: 5,
    title: "The Creative Act: A Way of Being",
    author: "Rick Rubin",
    description: "The legendary music producer shares his philosophy of creativity, offering guidance for living a creative life and connecting to the universal forces that inspire great work.",
    source: "NYT Bestseller",
    sourceColor: "bg-blue-100 text-blue-800",
    weeksOnList: 55,
    cover: "https://covers.openlibrary.org/b/isbn/9780593652886-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=The+Creative+Act+Rick+Rubin",
  },
];

const JUST_ARRIVED: ReleaseBook[] = [
  {
    rank: 1,
    title: "Demon Copperhead",
    author: "Barbara Kingsolver",
    description: "A Pulitzer Prize winner set in Appalachian Virginia, retelling David Copperfield through the opioid crisis. Devastating, compassionate, and utterly gripping.",
    source: "New to Bookends",
    sourceColor: "bg-emerald-100 text-emerald-800",
    cover: "https://covers.openlibrary.org/b/isbn/9780063251922-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=Demon+Copperhead",
  },
  {
    rank: 2,
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    author: "Gabrielle Zevin",
    description: "A sweeping story of friendship, love, and creative collaboration across three decades of the video game industry. Funny, moving, and endlessly inventive.",
    source: "New to Bookends",
    sourceColor: "bg-emerald-100 text-emerald-800",
    cover: "https://covers.openlibrary.org/b/isbn/9780593321201-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=Tomorrow+and+Tomorrow+Gabrielle+Zevin",
  },
  {
    rank: 3,
    title: "Trust",
    author: "Hernan Diaz",
    description: "Winner of the Pulitzer Prize. Four interlocking narratives about wealth, power, and the stories we tell about ourselves — a dazzling formally inventive novel.",
    source: "New to Bookends",
    sourceColor: "bg-emerald-100 text-emerald-800",
    cover: "https://covers.openlibrary.org/b/isbn/9781644451960-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=Trust+Hernan+Diaz",
  },
  {
    rank: 4,
    title: "Fourth Wing",
    author: "Rebecca Yarros",
    description: "Violet Sorrengail is sent to train as a dragon rider instead of a scribe. A fantasy romance with intense action, dragons, and undeniable chemistry. Hugely addictive.",
    source: "New to Bookends",
    sourceColor: "bg-emerald-100 text-emerald-800",
    cover: "https://covers.openlibrary.org/b/isbn/9781649374042-L.jpg",
    amazonUrl: "https://www.amazon.ae/s?k=Fourth+Wing+Rebecca+Yarros",
  },
];

const MONTH = "April 2026";

export default function NewReleases() {
  const [activeTab, setActiveTab] = useState<Tab>("fiction");

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: "fiction", label: "Fiction", emoji: "📖" },
    { id: "nonfiction", label: "Non-Fiction", emoji: "🔬" },
    { id: "arrived", label: "Just Arrived", emoji: "✨" },
  ];

  const bookList =
    activeTab === "fiction" ? FICTION : activeTab === "nonfiction" ? NONFICTION : JUST_ARRIVED;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-amber-50 border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 mt-1">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-700 uppercase tracking-wider mb-1">Updated Monthly</p>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-primary mb-3">
                Hot New Releases
                <span className="block text-2xl text-muted-foreground font-normal mt-1">{MONTH}</span>
              </h1>
              <p className="text-muted-foreground max-w-xl">
                The most talked-about books right now, curated from NYT Bestsellers, Amazon Charts, and Goodreads Choice Awards. Updated every month.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Source badges */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Sources:</span>
          {[
            { label: "NYT Bestsellers", color: "bg-blue-50 text-blue-700 border-blue-200" },
            { label: "Amazon Charts", color: "bg-orange-50 text-orange-700 border-orange-200" },
            { label: "Goodreads Choice", color: "bg-amber-50 text-amber-700 border-amber-200" },
            { label: "Pulitzer Prize", color: "bg-purple-50 text-purple-700 border-purple-200" },
          ].map(({ label, color }) => (
            <span key={label} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${color}`}>
              {label}
            </span>
          ))}
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            <span>Rankings based on public bestseller lists</span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-muted rounded-xl w-fit">
          {tabs.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === id
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Book list */}
        <div className="space-y-4">
          {bookList.map((book, idx) => (
            <ReleaseCard key={book.title} book={book} index={idx} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-gradient-to-r from-primary to-primary/80 rounded-2xl text-primary-foreground text-center">
          <TrendingUp className="w-8 h-8 text-accent mx-auto mb-3" />
          <h2 className="font-serif text-2xl font-bold mb-2">Find These Books Pre-Loved</h2>
          <p className="text-primary-foreground/70 mb-5 max-w-md mx-auto">
            Many of these bestsellers may already be available at Bookends at a fraction of the retail price.
          </p>
          <Button
            asChild
            className="bg-accent text-primary hover:bg-accent/90 font-semibold"
          >
            <a href="https://bookends.ae/collections/all" target="_blank" rel="noopener noreferrer">
              <BookOpen className="w-4 h-4 mr-2" />
              Browse Bookends Collection
            </a>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ReleaseCard({ book, index }: { book: ReleaseBook; index: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex gap-5 bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow group">
      {/* Rank */}
      <div className="flex items-center justify-center w-10 shrink-0">
        <span className="text-3xl font-serif font-bold text-primary/20 group-hover:text-primary/40 transition-colors">
          {book.rank}
        </span>
      </div>

      {/* Cover */}
      <div className="w-16 h-24 shrink-0 rounded-md overflow-hidden bg-muted border border-border">
        {!imgError ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <span className="text-2xl">📚</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-serif text-lg font-semibold text-foreground leading-tight">{book.title}</h3>
            <p className="text-sm text-muted-foreground">by {book.author}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${book.sourceColor}`}>
              {book.source}
            </span>
            {book.weeksOnList && (
              <span className="text-xs text-muted-foreground">{book.weeksOnList} weeks</span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">{book.description}</p>
        {book.amazonUrl && (
          <a
            href={book.amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-accent transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Find on Amazon
          </a>
        )}
      </div>
    </div>
  );
}
