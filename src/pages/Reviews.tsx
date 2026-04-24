import { useState, useEffect } from "react";
import { PenLine, Star, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard, { type Review } from "@/components/ReviewCard";
import ReviewForm from "@/components/ReviewForm";

const INITIAL_REVIEWS: Review[] = [
  {
    id: "r1",
    reviewerName: "Layla M.",
    bookTitle: "The Alchemist",
    bookAuthor: "Paulo Coelho",
    rating: 5,
    text: "This book changed the way I look at life. I picked it up from Bookends for AED 30 and it was worth every fils. Paulo Coelho's writing is so simple yet so profound. The story of Santiago is really the story of all of us — following our Personal Legend despite all the obstacles. I've already recommended it to five friends.",
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
    text: "Mind-blowing from start to finish. Harari manages to cover all of human history in a way that never feels dry. Got a Like New copy from Bookends — couldn't put it down. I've never thought about money, religion, or society the same way since. Essential reading for anyone curious about the world.",
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
    text: "I laughed, I cried, I hugged my friends. Eleanor is such a unique character and this book is a beautiful reminder that kindness can change someone's whole world. Perfect read if you want something funny, heartfelt and ultimately joyful.",
    createdAt: "2026-03-28",
    likes: 31,
    genre: "Contemporary Fiction",
  },
  {
    id: "r4",
    reviewerName: "Fatima Al-K.",
    bookTitle: "Harry Potter and the Philosopher's Stone",
    bookAuthor: "J.K. Rowling",
    rating: 5,
    text: "I bought this for my daughter who was reluctant to read. Within two days she'd finished it and was begging for the next one! A true gateway book. The copy I got from Bookends was in great condition too — Very Good as described. Highly recommend for children and adults alike.",
    createdAt: "2026-02-20",
    likes: 45,
    genre: "Fantasy",
  },
  {
    id: "r5",
    reviewerName: "Marcus T.",
    bookTitle: "Atomic Habits",
    bookAuthor: "James Clear",
    rating: 5,
    text: "Got the Like New copy and it genuinely looks brand new. More importantly, the content is life-changing. I've been applying the 1% improvement principle for three months now and the results are incredible. Clear's writing is practical and motivating without being preachy.",
    createdAt: "2026-04-10",
    likes: 27,
    genre: "Self-Help",
  },
  {
    id: "r6",
    reviewerName: "Noor R.",
    bookTitle: "The Midnight Library",
    bookAuthor: "Matt Haig",
    rating: 4,
    text: "I read this in one sitting on a rainy Friday. The concept is beautiful — a library between life and death where every book is a life you could have lived. It made me reflect on my own choices and feel grateful for what I have. Emotional but ultimately uplifting.",
    createdAt: "2026-03-05",
    likes: 22,
    genre: "Literary Fiction",
  },
  {
    id: "r7",
    reviewerName: "James O.",
    bookTitle: "Good Omens",
    bookAuthor: "Terry Pratchett & Neil Gaiman",
    rating: 5,
    text: "The funniest book I've read in years. Pratchett and Gaiman are a dream team — every page is quotable. If you want to laugh while reading about the apocalypse, this is your book. The Bookends copy was in Very Good condition at a great price.",
    createdAt: "2026-01-18",
    likes: 38,
    genre: "Humor",
  },
  {
    id: "r8",
    reviewerName: "Sara B.",
    bookTitle: "Where the Crawdads Sing",
    bookAuthor: "Delia Owens",
    rating: 5,
    text: "I was completely absorbed by Kya's story. The North Carolina marsh practically becomes a character of its own. There's mystery, romance, and beautiful nature writing all woven together. I found a Very Good copy here and it was in perfect condition. Highly recommend.",
    createdAt: "2026-02-14",
    likes: 33,
    genre: "Contemporary Fiction",
  },
  {
    id: "r9",
    reviewerName: "David M.",
    bookTitle: "Dune",
    bookAuthor: "Frank Herbert",
    rating: 5,
    text: "The greatest science fiction novel ever written in my opinion. Herbert created an entire universe with its own religions, politics, ecology and philosophy. Dense but deeply rewarding. Grabbed a copy from Bookends after seeing the movie and I'm so glad I did — the book is infinitely richer.",
    createdAt: "2026-03-22",
    likes: 19,
    genre: "Sci-Fi",
  },
];

const STORAGE_KEY = "bookends_reviews";

function loadReviews(): Review[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const userReviews: Review[] = JSON.parse(stored);
      return [...userReviews, ...INITIAL_REVIEWS];
    }
  } catch {}
  return INITIAL_REVIEWS;
}

function saveUserReview(review: Review) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const existing: Review[] = stored ? JSON.parse(stored) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([review, ...existing]));
  } catch {}
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "top-rated" | "most-liked">("newest");
  const [ratingFilter, setRatingFilter] = useState<"all" | "5" | "4" | "3">("all");
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    setReviews(loadReviews());
  }, []);

  function handleNewReview(data: Omit<Review, "id" | "likes" | "createdAt">) {
    const review: Review = {
      ...data,
      id: `user-${Date.now()}`,
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    saveUserReview(review);
    setReviews((prev) => [review, ...prev]);
    setShowForm(false);
  }

  const filtered = reviews
    .filter((r) => ratingFilter === "all" || r.rating === Number(ratingFilter))
    .sort((a, b) => {
      if (sortBy === "top-rated") return b.rating - a.rating;
      if (sortBy === "most-liked") return b.likes - a.likes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: reviews.filter((r) => r.rating === s).length,
    pct: Math.round((reviews.filter((r) => r.rating === s).length / reviews.length) * 100),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-50 to-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div>
              <p className="text-sm font-medium text-accent uppercase tracking-wider mb-2">Community</p>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-primary mb-3">
                By Readers, For Readers
              </h1>
              <p className="text-muted-foreground max-w-lg">
                Real reviews from the Bookends community. Find your next great read based on what fellow readers in the UAE love — and share your own thoughts.
              </p>
            </div>

            {/* Rating summary */}
            <div className="bg-white rounded-2xl border border-border p-6 min-w-[220px] shadow-sm">
              <div className="text-center mb-4">
                <p className="text-5xl font-bold text-primary font-serif">{avgRating.toFixed(1)}</p>
                <div className="flex justify-center gap-0.5 my-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.round(avgRating) ? "fill-accent text-accent" : "text-muted fill-muted"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{reviews.length} reviews</p>
              </div>
              <div className="space-y-1.5">
                {starCounts.map(({ stars, pct }) => (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{stars}★</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Write review CTA */}
        {!showForm && (
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-primary to-primary/80 rounded-xl text-primary-foreground">
            <div>
              <h2 className="font-serif text-xl font-semibold">Share Your Reading Experience</h2>
              <p className="text-primary-foreground/70 text-sm mt-0.5">
                Your review helps other readers find their next great book.
              </p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-accent text-primary hover:bg-accent/90 font-semibold shrink-0"
            >
              <PenLine className="w-4 h-4 mr-2" />
              Write a Review
            </Button>
          </div>
        )}

        {/* Review form */}
        {showForm && (
          <div className="mb-8 bg-white rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-semibold text-primary">Write a Review</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ReviewForm onSubmit={handleNewReview} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Most Recent</SelectItem>
              <SelectItem value="top-rated">Top Rated</SelectItem>
              <SelectItem value="most-liked">Most Helpful</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ratingFilter} onValueChange={(v) => setRatingFilter(v as typeof ratingFilter)}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="All Ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars ★★★★★</SelectItem>
              <SelectItem value="4">4 Stars ★★★★</SelectItem>
              <SelectItem value="3">3 Stars ★★★</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground ml-auto">
            {filtered.length} review{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.slice(0, visibleCount).map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">📝</span>
            <p className="font-serif text-xl text-primary font-medium">No reviews match your filters</p>
            <p className="text-muted-foreground text-sm mt-1">Try a different rating filter.</p>
          </div>
        )}

        {visibleCount < filtered.length && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => setVisibleCount((c) => c + 6)}
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Load More Reviews
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
