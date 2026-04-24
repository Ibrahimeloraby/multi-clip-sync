import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, SlidersHorizontal, RotateCcw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MoodSelector from "@/components/MoodSelector";
import BookCard from "@/components/BookCard";
import { getBooksByMoodGenres, type Book } from "@/lib/bookData";
import { MOODS } from "@/lib/moods";

type SortOption = "relevance" | "rating" | "price-asc" | "price-desc";
type ConditionFilter = "all" | "Like New" | "Very Good" | "Good" | "Acceptable";

export default function MoodRecommender() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMood, setSelectedMood] = useState<string | null>(
    searchParams.get("mood") || null
  );
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>("all");
  const [maxPrice, setMaxPrice] = useState<number>(200);

  useEffect(() => {
    if (selectedMood) {
      setSearchParams({ mood: selectedMood });
    } else {
      setSearchParams({});
    }
  }, [selectedMood]);

  const activeMood = MOODS.find((m) => m.id === selectedMood);

  const books: Book[] = selectedMood
    ? getBooksByMoodGenres(activeMood?.genres ?? [])
    : [];

  const filtered = books
    .filter((b) => conditionFilter === "all" || b.condition === conditionFilter)
    .filter((b) => b.priceAED <= maxPrice);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "price-asc") return a.priceAED - b.priceAED;
    if (sortBy === "price-desc") return b.priceAED - a.priceAED;
    return 0; // keep relevance order
  });

  function reset() {
    setSelectedMood(null);
    setSortBy("relevance");
    setConditionFilter("all");
    setMaxPrice(200);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-50 via-violet-50 to-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Mood Matching
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-primary mb-4">
            How Are You Feeling Today?
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Choose your mood and we'll recommend books that match exactly how you're feeling. Every recommendation is curated from our library of 30,000+ books.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Mood grid */}
        <div className="mb-10">
          <h2 className="font-serif text-2xl font-semibold text-primary mb-5">
            {selectedMood ? "Your mood:" : "Pick a mood to get started"}
          </h2>
          <MoodSelector selected={selectedMood} onSelect={setSelectedMood} />
        </div>

        {/* Results */}
        {selectedMood && activeMood && (
          <>
            {/* Active mood banner */}
            <div className={`flex items-center justify-between p-4 rounded-xl bg-gradient-to-r ${activeMood.gradient} border ${activeMood.borderColor} mb-6`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeMood.emoji}</span>
                <div>
                  <p className="font-semibold text-foreground">{activeMood.label}</p>
                  <p className="text-sm text-muted-foreground">{activeMood.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{sorted.length}</p>
                <p className="text-xs text-muted-foreground">books found</p>
              </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-border">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground shrink-0">Filter & Sort:</span>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SlidersHorizontal className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Best Match</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={conditionFilter} onValueChange={(v) => setConditionFilter(v as ConditionFilter)}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  <SelectItem value="Like New">Like New</SelectItem>
                  <SelectItem value="Very Good">Very Good</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Acceptable">Acceptable</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={maxPrice.toString()}
                onValueChange={(v) => setMaxPrice(Number(v))}
              >
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="Max Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">Under AED 20</SelectItem>
                  <SelectItem value="30">Under AED 30</SelectItem>
                  <SelectItem value="40">Under AED 40</SelectItem>
                  <SelectItem value="200">Any Price</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={reset} className="ml-auto text-muted-foreground">
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            </div>

            {/* Book grid */}
            {sorted.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {sorted.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <span className="text-5xl block mb-4">🔍</span>
                <h3 className="font-serif text-xl font-semibold text-primary mb-2">No books match your filters</h3>
                <p className="text-muted-foreground mb-4">Try widening the price range or changing the condition filter.</p>
                <Button variant="outline" onClick={() => { setConditionFilter("all"); setMaxPrice(200); }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty state before selection */}
        {!selectedMood && (
          <div className="text-center py-16 text-muted-foreground">
            <span className="text-6xl block mb-4">🎭</span>
            <p className="font-serif text-xl text-primary font-medium">Select a mood above to see your recommendations</p>
            <p className="text-sm mt-2">We'll match you with books from our 30,000+ collection.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
