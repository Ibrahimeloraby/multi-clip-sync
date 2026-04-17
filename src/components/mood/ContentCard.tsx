import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPosterUrl } from "@/lib/tmdb";
import { getPlatformById } from "@/lib/platforms";
import type { Recommendation } from "@/agent/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Star, Tv, Film, ChevronDown, ChevronUp } from "lucide-react";

const MATCH_CONFIG = {
  high:   { label: "Perfect Match", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  medium: { label: "Good Match",    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  low:    { label: "Worth a Try",   color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

interface ContentCardProps {
  item: Recommendation;
  onMarkWatched: (item: Recommendation) => void;
  watched?: boolean;
  rank: number;
}

export default function ContentCard({ item, onMarkWatched, watched, rank }: ContentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const posterUrl = getPosterUrl(item.poster_path);
  const year = item.release_date?.slice(0, 4) ?? "";
  const matchCfg = MATCH_CONFIG[item.mood_match];

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden transition-all duration-200",
        watched ? "opacity-60" : "hover:border-primary/40 hover:shadow-lg hover:shadow-black/10"
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Rank + Poster */}
        <div className="relative flex-shrink-0">
          <div className="absolute -top-1 -left-1 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
            {rank}
          </div>
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={item.title}
              className="w-20 h-28 object-cover rounded-lg"
              loading="lazy"
            />
          ) : (
            <div className="w-20 h-28 rounded-lg bg-muted flex items-center justify-center">
              {item.content_type === "tv" ? (
                <Tv className="w-8 h-8 text-muted-foreground" />
              ) : (
                <Film className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">{item.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{year}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {item.content_type === "tv" ? "Series" : "Movie"}
                </span>
                {item.vote_average > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                      <Star className="w-3 h-3 fill-current" />
                      {item.vote_average.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            </div>
            {watched && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
          </div>

          {/* Mood match badge */}
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0", matchCfg.color)}>
            {matchCfg.label}
          </Badge>

          {/* Platforms */}
          {item.available_platforms.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.available_platforms.map((p) => {
                const config = getPlatformById(p.id);
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-medium"
                  >
                    {config?.emoji ?? "📺"} {p.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Explanation (expandable) */}
      <div className="px-3 pb-3 space-y-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Hide" : "Why this matches"}
        </button>

        {expanded && (
          <p className="text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200">
            {item.explanation}
          </p>
        )}

        {!watched && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMarkWatched(item)}
            className="w-full h-8 text-xs gap-1.5 mt-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark as Watched
          </Button>
        )}
      </div>
    </div>
  );
}
