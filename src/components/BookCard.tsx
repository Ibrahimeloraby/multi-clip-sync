import { useState } from "react";
import { Star, BookOpen, Heart, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Book, getCoverUrl } from "@/lib/bookData";
import { cn } from "@/lib/utils";

const AVAILABILITY_STYLES = {
  "In-Library": "bg-blue-100 text-blue-800 border-blue-200",
  "Digital": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Both": "bg-amber-100 text-amber-800 border-amber-200",
};

interface BookCardProps {
  book: Book;
  className?: string;
}

export default function BookCard({ book, className }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div
      className={cn(
        "group relative bg-white rounded-xl border border-border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col",
        className
      )}
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
        {!imgError ? (
          <img
            src={getCoverUrl(book.isbn)}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20 p-4">
            <span className="text-5xl mb-3">📚</span>
            <p className="text-xs text-center font-serif font-semibold text-primary/70 line-clamp-3">
              {book.title}
            </p>
          </div>
        )}

        {/* Rare badge */}
        {book.isRare && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ✦ Rare
          </div>
        )}

        {/* New badge */}
        {book.isNew && !book.isRare && (
          <div className="absolute top-2 left-2 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            New
          </div>
        )}

        {/* Save button */}
        <button
          onClick={() => setSaved(!saved)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Heart className={cn("w-3.5 h-3.5", saved ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
        </button>
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <div className="flex-1">
          <h3 className="font-serif text-sm font-semibold text-foreground leading-tight line-clamp-2">
            {book.title}
          </h3>
          {book.titleAr && (
            <p className="text-xs text-muted-foreground font-arabic mt-0.5">{book.titleAr}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-accent text-accent" />
          <span className="text-xs font-medium">{book.rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({book.reviewCount})</span>
        </div>

        {/* Collection + availability */}
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
            {book.collection.replace(" Library", "").replace(" Centre", "").replace(" Collections", "")}
          </span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium flex items-center gap-0.5", AVAILABILITY_STYLES[book.availability])}>
            {book.availability === "Digital" || book.availability === "Both" ? (
              <Wifi className="w-2.5 h-2.5" />
            ) : null}
            {book.availability}
          </span>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 mt-1"
        >
          <BookOpen className="w-3 h-3 mr-1.5" />
          Borrow / Reserve
        </Button>
      </div>
    </div>
  );
}
