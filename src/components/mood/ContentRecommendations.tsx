import { useState } from "react";
import { cn } from "@/lib/utils";
import ContentCard from "./ContentCard";
import type { MoodAgentResponse, Recommendation, MoodType, WatchHistoryEntry } from "@/agent/types";
import { MOODS } from "@/agent/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Sparkles, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { markAsWatched } from "@/lib/moodAgentService";

interface ContentRecommendationsProps {
  mood: MoodType;
  response: MoodAgentResponse;
  watchHistory: WatchHistoryEntry[];
  userId?: string;
  onReset: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export default function ContentRecommendations({
  mood,
  response,
  watchHistory,
  userId,
  onReset,
  onRefresh,
  loading,
}: ContentRecommendationsProps) {
  const [watchedIds, setWatchedIds] = useState<number[]>(
    watchHistory.map((h) => h.tmdb_id)
  );
  const [dialogItem, setDialogItem] = useState<Recommendation | null>(null);
  const [rating, setRating] = useState(0);
  const [moodAfter, setMoodAfter] = useState("");
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);

  const moodConfig = MOODS.find((m) => m.id === mood);

  const handleMarkWatched = (item: Recommendation) => {
    setDialogItem(item);
    setRating(0);
    setMoodAfter("");
    setReview("");
  };

  const handleSaveWatched = async () => {
    if (!dialogItem) return;
    setSaving(true);
    try {
      if (userId) {
        await markAsWatched(userId, {
          tmdb_id: dialogItem.tmdb_id,
          content_type: dialogItem.content_type,
          title: dialogItem.title,
          poster_path: dialogItem.poster_path,
          mood_at_watch: mood,
          user_rating: rating || undefined,
          mood_after: moodAfter || undefined,
          review: review || undefined,
        });
      }
      setWatchedIds((prev) => [...prev, dialogItem.tmdb_id]);
    } finally {
      setSaving(false);
      setDialogItem(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Change mood
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Mood summary banner */}
      <div
        className={cn(
          "rounded-2xl p-4 bg-gradient-to-br text-white space-y-1",
          moodConfig?.color ?? "from-primary to-primary/80"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{moodConfig?.emoji}</span>
          <div>
            <div className="font-bold">{moodConfig?.label} Mood</div>
            <div className="text-xs text-white/80">{response.mood_summary}</div>
          </div>
        </div>
      </div>

      {/* Agent analysis */}
      <div className="rounded-xl bg-muted/50 border p-3 flex gap-2">
        <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">{response.analysis}</p>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{response.recommendations.length} Picks For You</h3>
          <span className="text-xs text-muted-foreground">
            {watchedIds.length > 0 && `${watchedIds.length} already watched`}
          </span>
        </div>
        {response.recommendations.map((item, i) => (
          <ContentCard
            key={`${item.tmdb_id}-${item.content_type}`}
            item={item}
            rank={i + 1}
            watched={watchedIds.includes(item.tmdb_id)}
            onMarkWatched={handleMarkWatched}
          />
        ))}
      </div>

      {/* Mark as watched dialog */}
      <Dialog open={!!dialogItem} onOpenChange={(open) => !open && setDialogItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Watched "{dialogItem?.title}"?</DialogTitle>
            <DialogDescription>Tell us how it made you feel — it helps your future recommendations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Star rating */}
            <div className="space-y-2">
              <Label className="text-sm">Your rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)}>
                    <Star
                      className={cn(
                        "w-7 h-7 transition-colors",
                        star <= rating ? "text-yellow-400 fill-current" : "text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Mood after */}
            <div className="space-y-2">
              <Label className="text-sm">How did it make you feel?</Label>
              <div className="flex flex-wrap gap-2">
                {["happy", "moved", "excited", "satisfied", "disappointed", "scared", "thoughtful"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMoodAfter(m)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-colors capitalize",
                      moodAfter === m
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Review */}
            <div className="space-y-2">
              <Label className="text-sm">Quick review (optional)</Label>
              <Textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="What did you think?"
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            <Button onClick={handleSaveWatched} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save & Mark Watched"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
