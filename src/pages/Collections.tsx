import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookCard from "@/components/BookCard";
import { LIBRARY_COLLECTIONS, BOOKS } from "@/lib/bookData";

export default function Collections() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="navy-gradient text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">Browse</p>
          <h1 className="font-serif text-5xl font-bold mb-4">10 Specialised Libraries</h1>
          <p className="text-white/70 text-lg max-w-xl">
            From rare 13th-century manuscripts to the latest business titles — every collection has its own dedicated space and expertise.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-16">
        {LIBRARY_COLLECTIONS.map((col) => {
          const colBooks = BOOKS.filter((b) => b.collection === col.name).slice(0, 4);
          return (
            <section key={col.id}>
              {/* Collection header */}
              <div className={`flex items-center gap-5 p-6 rounded-2xl bg-gradient-to-r ${col.color} text-white mb-6`}>
                <span className="text-5xl">{col.icon}</span>
                <div className="flex-1">
                  <h2 className="font-serif text-2xl font-bold">{col.name}</h2>
                  <p className="font-arabic text-sm text-white/70">{col.nameAr}</p>
                  <p className="text-white/80 text-sm mt-1 max-w-xl">{col.description}</p>
                </div>
                <div className="shrink-0 text-right hidden sm:block">
                  <p className="text-white/60 text-sm">{col.floor}</p>
                </div>
              </div>

              {/* Books from this collection */}
              {colBooks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {colBooks.map((book) => <BookCard key={book.id} book={book} />)}
                  <div className="flex items-center justify-center bg-muted rounded-xl border-2 border-dashed border-border min-h-[200px]">
                    <div className="text-center p-4">
                      <p className="text-4xl mb-2">📚</p>
                      <p className="text-sm text-muted-foreground">Thousands more titles</p>
                      <Button asChild size="sm" variant="outline" className="mt-3">
                        <Link to={`/mood`}>
                          <Sparkles className="w-3 h-3 mr-1" />
                          Find by Mood
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-muted rounded-xl p-8 text-center">
                  <p className="text-muted-foreground">Visit the {col.name} on {col.floor} for full catalogue access.</p>
                </div>
              )}
            </section>
          );
        })}
      </main>

      <Footer />
    </div>
  );
}
