import { useState } from "react";
import { Star, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Book, getCoverUrl } from "@/lib/bookData";
import { cn } from "@/lib/utils";

const CONDITION_COLORS: Record<Book["condition"], string> = {
  "Like New": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Very Good": "bg-blue-100 text-blue-800 border-blue-200",
  "Good": "bg-amber-100 text-amber-800 border-amber-200",
  "Acceptable": "bg-gray-100 text-gray-700 border-gray-200",
};

interface BookCardProps {
  book: Book;
  className?: string;
}

export default function BookCard({ book, className }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const [wishlist, setWishlist] = useState(false);

  return (
    <div
      className={cn(
        "group relative bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col",
        className
      )}
    >
      {/* Cover image */}
      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
        {!imgError ? (
          <img
            src={getCoverUrl(book.isbn)}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-muted p-4">
            <span className="text-4xl mb-2">📚</span>
            <p className="text-xs text-center font-serif font-medium text-foreground/60 line-clamp-3">
              {book.title}
            </p>
          </div>
        )}

        {/* Condition badge */}
        <div className="absolute top-2 left-2">
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              CONDITION_COLORS[book.condition]
            )}
          >
            {book.condition}
          </span>
        </div>

        {/* Wishlist button */}
        <button
          onClick={() => setWishlist(!wishlist)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          aria-label="Add to wishlist"
        >
          <Heart
            className={cn("w-3.5 h-3.5", wishlist ? "fill-red-500 text-red-500" : "text-muted-foreground")}
          />
        </button>
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <div className="flex-1">
          <h3 className="font-serif text-sm font-semibold text-foreground leading-tight line-clamp-2">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-accent text-accent" />
          <span className="text-xs font-medium text-foreground">{book.rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({book.reviewCount.toLocaleString()})</span>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="font-bold text-primary text-sm">
            AED {book.priceAED}
          </span>
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            Buy
          </Button>
        </div>
      </div>
    </div>
  );
}
