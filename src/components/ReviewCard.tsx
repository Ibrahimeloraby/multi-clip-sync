import { useState } from "react";
import { ThumbsUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Review {
  id: string;
  reviewerName: string;
  bookTitle: string;
  bookAuthor: string;
  rating: number;
  text: string;
  createdAt: string;
  likes: number;
  genre?: string;
}

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(review.likes);
  const [expanded, setExpanded] = useState(false);

  const initials = review.reviewerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isLong = review.text.length > 200;

  function handleLike() {
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary-foreground">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{review.reviewerName}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString("en-AE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        {/* Stars */}
        <div className="flex gap-0.5 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "w-3.5 h-3.5",
                i < review.rating ? "fill-accent text-accent" : "text-muted fill-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Book info */}
      <div className="px-3 py-2 bg-muted rounded-lg">
        <p className="text-xs font-semibold text-foreground font-serif line-clamp-1">"{review.bookTitle}"</p>
        <p className="text-xs text-muted-foreground">by {review.bookAuthor}</p>
      </div>

      {/* Review text */}
      <div>
        <p className={cn("text-sm text-foreground/80 leading-relaxed", !expanded && isLong && "line-clamp-3")}>
          {review.text}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent font-medium mt-1 hover:underline"
          >
            {expanded ? "Read less" : "Read more"}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <button
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition-colors",
            liked
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <ThumbsUp className={cn("w-3.5 h-3.5", liked && "fill-accent")} />
          {likeCount > 0 && <span>{likeCount}</span>}
          <span>{liked ? "Helpful!" : "Helpful"}</span>
        </button>
        {review.genre && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
            {review.genre}
          </span>
        )}
      </div>
    </div>
  );
}
