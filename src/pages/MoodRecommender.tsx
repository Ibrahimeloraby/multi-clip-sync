import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, SlidersHorizontal, RotateCcw, Filter, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MoodSelector from "@/components/MoodSelector";
import BookCard from "@/components/BookCard";
import { getBooksByMoodGenres, LIBRARY_COLLECTIONS, type Book } from "@/lib/bookData";
import { MOODS } from "@/lib/moods";

type SortOption = "relevance" | "rating" | "newest";
type AvailFilter = "all" | "In-Library" | "Digital" | "Both";
type LangFilter = "all" | "English" | "Arabic";

export default function MoodRecommender() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMood, setSelectedMood] = useState<string | null>(searchParams.get("mood"));
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [availFilter, setAvailFilter] = useState<AvailFilter>("all");
  const [langFilter, setLangFilter] = useState<LangFilter>("all");

  useEffect(() => {
    if (selectedMood) setSearchParams({ mood: selectedMood });
    else setSearchParams({});
  }, [selectedMood]);

  const activeMood = MOODS.find((m) => m.id === selectedMood);
  const books: Book[] = selectedMood ? getBooksByMoodGenres(activeMood?.genres ?? []) : [];

  const filtered = books
    .filter((b) => availFilter === "all" || b.availability === availFilter)
    .filter((b) => langFilter === "all" || b.language.includes(langFilter));

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "newest") return b.year - a.year;
    return 0;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="navy-gradient text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium mb-5 border border-accent/30">
            <Sparkles className="w-3.5 h-3.5" />
            Personalised Reading Discovery
          </div>
          <h1 className="font-serif text-5xl font-bold mb-4">
            How Are You Feeling Today?
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Tell us your mood — our engine will match you with books from MBRL's 1.5 million collection across all 10 libraries.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Mood grid */}
        <div className="mb-10">
          <h2 className="font-serif text-2xl font-semibold text-primary mb-5">
            {selectedMood ? "Your selected mood" : "Select your mood to begin"}
          </h2>
          <MoodSelector selected={selectedMood} onSelect={setSelectedMood} />
        </div>

        {/* Results */}
        {selectedMood && activeMood && (
          <>
            {/* Active mood banner */}
            <div className={`flex items-center justify-between p-5 rounded-xl bg-gradient-to-r ${activeMood.gradient} border ${activeMood.borderColor} mb-6`}>
              <div className="flex items-center gap-4">
                <span className="text-4xl">{activeMood.emoji}</span>
                <div>
                  <p className="font-serif font-bold text-foreground text-lg">{activeMood.label}</p>
                  <p className="text-sm text-muted-foreground">{activeMood.description}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Library className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">Best found in: {activeMood.collection}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-bold text-primary">{sorted.length}</p>
                <p className="text-xs text-muted-foreground">books found</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-border">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium shrink-0">Filter:</span>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SlidersHorizontal className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Best Match</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="newest">Most Recent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={availFilter} onValueChange={(v) => setAvailFilter(v as AvailFilter)}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="In-Library">In-Library Only</SelectItem>
                  <SelectItem value="Digital">Digital Only</SelectItem>
                  <SelectItem value="Both">In-Library & Digital</SelectItem>
                </SelectContent>
              </Select>

              <Select value={langFilter} onValueChange={(v) => setLangFilter(v as LangFilter)}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Arabic">Arabic</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={() => { setSortBy("relevance"); setAvailFilter("all"); setLangFilter("all"); }} className="ml-auto">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            </div>

            {sorted.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {sorted.map((book) => <BookCard key={book.id} book={book} />)}
              </div>
            ) : (
              <div className="text-center py-16">
                <span className="text-5xl block mb-4">🔍</span>
                <h3 className="font-serif text-xl font-semibold text-primary mb-2">No books match these filters</h3>
                <Button variant="outline" onClick={() => { setAvailFilter("all"); setLangFilter("all"); }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </>
        )}

        {!selectedMood && (
          <div className="text-center py-16">
            <span className="text-6xl block mb-4">🎭</span>
            <p className="font-serif text-2xl text-primary font-semibold">Select a mood above to see recommendations</p>
            <p className="text-muted-foreground mt-2">We'll match you with books from all 10 MBRL libraries.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
