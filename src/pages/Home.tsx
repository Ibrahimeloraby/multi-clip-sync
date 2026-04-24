import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Star, Flame, BookOpen, Users, Package, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookCard from "@/components/BookCard";
import ReviewCard, { type Review } from "@/components/ReviewCard";
import { getFeaturedBooks } from "@/lib/bookData";
import { MOODS } from "@/lib/moods";

const FEATURED_BOOKS = getFeaturedBooks();

const SAMPLE_REVIEWS: Review[] = [
  {
    id: "r1",
    reviewerName: "Layla M.",
    bookTitle: "The Alchemist",
    bookAuthor: "Paulo Coelho",
    rating: 5,
    text: "This book changed the way I look at life. I picked it up from Bookends for AED 30 and it was worth every fils. Paulo Coelho's writing is so simple yet so profound. Highly recommend to everyone.",
    createdAt: "2026-03-15",
    likes: 24,
    genre: "Philosophy",
  },
  {
    id: "r2",
    reviewerName: "Ahmed S.",
    bookTitle: "Sapiens",
    bookAuthor: "Yuval Noah Harari",
    rating: 5,
    text: "Mind-blowing from start to finish. Harari manages to cover all of human history in a way that never feels dry. Got a Like New copy from Bookends — couldn't put it down.",
    createdAt: "2026-04-01",
    likes: 18,
    genre: "Non-Fiction",
  },
  {
    id: "r3",
    reviewerName: "Priya N.",
    bookTitle: "Eleanor Oliphant is Completely Fine",
    bookAuthor: "Gail Honeyman",
    rating: 4,
    text: "I laughed, I cried, I hugged my friends. Eleanor is such a unique character and this book is a beautiful reminder that kindness can change someone's whole world.",
    createdAt: "2026-03-28",
    likes: 31,
    genre: "Contemporary Fiction",
  },
];

const STATS = [
  { value: "30,000+", label: "Books in Stock", icon: BookOpen },
  { value: "1,800+", label: "Active Sellers", icon: Users },
  { value: "AED 5", label: "Starting Price", icon: Package },
  { value: "100%", label: "Pre-Loved with Love", icon: Heart },
];

const PREVIEW_MOODS = MOODS.slice(0, 4);

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-[#5C3317] text-primary-foreground">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent/10 -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent/10 translate-y-1/2 -translate-x-1/3 blur-2xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              New: Mood-Based Book Recommendations
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Every Book Has a Story.
              <span className="block text-accent mt-1">So Does Its Next Owner.</span>
            </h1>
            <p className="text-lg text-primary-foreground/80 leading-relaxed mb-8 max-w-xl">
              UAE's favourite marketplace for pre-loved books. Discover your next great read from as little as AED 5. 30,000+ titles in stock. Based in Dubai.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-accent text-primary hover:bg-accent/90 font-semibold"
              >
                <Link to="/mood">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Find by Mood
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <a href="https://bookends.ae/collections/all" target="_blank" rel="noopener noreferrer">
                  Browse All Books
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Floating book emojis */}
        <div className="absolute right-10 top-20 text-5xl opacity-20 hidden lg:block rotate-12">📚</div>
        <div className="absolute right-32 top-40 text-3xl opacity-15 hidden lg:block -rotate-6">📖</div>
        <div className="absolute right-16 bottom-20 text-4xl opacity-20 hidden lg:block rotate-3">🔖</div>
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
                  <p className="font-bold text-lg text-primary leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-1">Staff Picks</p>
            <h2 className="font-serif text-3xl font-bold text-primary">Featured This Week</h2>
          </div>
          <a
            href="https://bookends.ae/collections/all"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            View all <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {FEATURED_BOOKS.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>

      {/* Mood Finder teaser */}
      <section className="bg-gradient-to-r from-purple-50 to-violet-50 border-y border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-purple-600 uppercase tracking-wider mb-2">New Feature</p>
            <h2 className="font-serif text-3xl font-bold text-primary mb-3">How Are You Feeling Today?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Tell us your mood and we'll match you with books you'll love. Powered by genre science and reader reviews.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-8">
            {PREVIEW_MOODS.map((mood) => (
              <Link
                key={mood.id}
                to={`/mood?mood=${mood.id}`}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent bg-gradient-to-br ${mood.gradient} hover:scale-105 hover:shadow-md transition-all text-center`}
              >
                <span className="text-3xl">{mood.emoji}</span>
                <span className="text-sm font-semibold text-foreground">{mood.label}</span>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/mood">
                <Sparkles className="w-4 h-4 mr-2" />
                Explore All 12 Moods
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Community Reviews teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-1">By Readers, For Readers</p>
            <h2 className="font-serif text-3xl font-bold text-primary">What the Community Says</h2>
          </div>
          <Link
            to="/reviews"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            All reviews <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SAMPLE_REVIEWS.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
        <div className="text-center mt-8">
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Link to="/reviews">
              <Star className="w-4 h-4 mr-2" />
              Read All Reviews & Share Yours
            </Link>
          </Button>
        </div>
      </section>

      {/* New Releases teaser */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 border-y border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-sm font-medium text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Flame className="w-4 h-4" /> Updated Monthly
              </p>
              <h2 className="font-serif text-3xl font-bold text-primary">Hot New Releases</h2>
              <p className="text-muted-foreground mt-1">NYT Bestsellers · Amazon Charts · Goodreads Choice</p>
            </div>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              <Link to="/new-releases">
                See This Month's List
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { rank: 1, title: "The Women", author: "Kristin Hannah", badge: "NYT #1 Fiction" },
              { rank: 2, title: "Intermezzo", author: "Sally Rooney", badge: "Goodreads Choice" },
              { rank: 3, title: "Nexus", author: "Yuval Noah Harari", badge: "NYT #1 Non-Fiction" },
            ].map(({ rank, title, author, badge }) => (
              <div key={rank} className="flex items-center gap-4 bg-white rounded-xl p-4 border border-border shadow-sm">
                <span className="text-3xl font-serif font-bold text-primary/20">#{rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-semibold text-foreground truncate">{title}</p>
                  <p className="text-sm text-muted-foreground">{author}</p>
                  <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/20 text-accent mt-1">
                    {badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Bookends mini */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl border border-border p-8 sm:p-12 flex flex-col sm:flex-row gap-8 items-center">
          <div className="text-6xl shrink-0">📚</div>
          <div className="flex-1">
            <h2 className="font-serif text-2xl font-bold text-primary mb-3">Our Story</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Bookends was founded by two moms — Grace and Somia — who discovered how hard it is to keep curious kids in books without breaking the bank.
              Starting as an online platform, we've grown into a vibrant store in Dubai Silicon Oasis with 30,000+ books and a community of 1,800 sellers.
              We believe in sustainability, accessibility, and the magic of connecting a book to its next reader.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://bookends.ae/pages/about-us"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                Read our full story <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
