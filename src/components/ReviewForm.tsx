import { useState } from "react";
import { Star, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type Review } from "./ReviewCard";

interface ReviewFormProps {
  onSubmit: (review: Omit<Review, "id" | "likes" | "createdAt">) => void;
  onCancel?: () => void;
}

export default function ReviewForm({ onSubmit, onCancel }: ReviewFormProps) {
  const [reviewerName, setReviewerName] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewerName || !bookTitle || !bookAuthor || !rating || !text) return;
    onSubmit({ reviewerName, bookTitle, bookAuthor, rating, text });
    setSubmitted(true);
    setTimeout(() => {
      setReviewerName("");
      setBookTitle("");
      setBookAuthor("");
      setRating(0);
      setText("");
      setSubmitted(false);
    }, 2500);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <span className="text-5xl">📚</span>
        <h3 className="font-serif text-xl font-semibold text-primary">Thank you for your review!</h3>
        <p className="text-sm text-muted-foreground">Your review helps other readers find their next great book.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Your Name *</label>
          <Input
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="e.g. Sarah K."
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Book Title *</label>
          <Input
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder="e.g. The Alchemist"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Author *</label>
          <Input
            value={bookAuthor}
            onChange={(e) => setBookAuthor(e.target.value)}
            placeholder="e.g. Paulo Coelho"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Your Rating *</label>
          <div className="flex gap-1 items-center h-10">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoverRating(i + 1)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i + 1)}
                className="focus-visible:outline-none"
              >
                <Star
                  className={cn(
                    "w-6 h-6 transition-colors",
                    i < (hoverRating || rating)
                      ? "fill-accent text-accent"
                      : "text-muted-foreground/40"
                  )}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="text-sm text-muted-foreground ml-1">
                {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Your Review *</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you love about this book? Would you recommend it to a friend? Share your honest thoughts..."
          rows={5}
          required
          className="resize-none"
        />
        <span className="text-xs text-muted-foreground text-right">{text.length} / 1000</span>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} size="sm">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={!reviewerName || !bookTitle || !bookAuthor || !rating || !text}
        >
          <Send className="w-4 h-4 mr-2" />
          Post Review
        </Button>
      </div>
    </form>
  );
}
