import { motion } from 'framer-motion'
import { Star, Clock, ExternalLink } from 'lucide-react'
import type { ScoredItem } from '../engine/types'
import { PLATFORM_META } from '../integrations/deeplinks'
import { openContent } from '../integrations/deeplinks'
import { cn } from '../lib/utils'

interface Props {
  item: ScoredItem
  index: number
  onInteract?: (itemId: string, type: string) => void
}

export function ContentCard({ item: { item, reason, score }, index, onInteract }: Props) {
  const platform = PLATFORM_META[item.platform]
  const confidencePct = Math.round(score * 100)

  function handleOpen() {
    onInteract?.(item.id, 'click')
    openContent(item)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group rounded-2xl bg-surface-card border border-surface-border overflow-hidden cursor-pointer
                 hover:border-surface-raised hover:bg-surface-raised transition-all duration-200
                 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
                 tv:focus-visible:scale-105 tv:transition-transform"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] bg-surface-raised overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {item.contentType === 'music' ? '🎵' : item.contentType === 'movie' ? '🎬' : '📺'}
          </div>
        )}

        {/* Platform badge */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
          style={{ backgroundColor: platform?.color ?? '#333' }}
        >
          {platform?.name ?? item.platform}
        </div>

        {/* Match confidence bar */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-black/30">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-light"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="font-semibold text-white text-[14px] leading-tight line-clamp-1 mb-0.5">
          {item.title}
        </h4>

        {item.subtitle && (
          <p className="text-[12px] text-white/40 mb-2 line-clamp-1">{item.subtitle}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2">
          {item.rating != null && (
            <span className="flex items-center gap-0.5 text-[12px] text-yellow-400">
              <Star size={11} fill="currentColor" />
              {item.rating.toFixed(1)}
            </span>
          )}
          {item.year && (
            <span className="text-[12px] text-white/30">{item.year}</span>
          )}
          {item.durationMinutes && (
            <span className="flex items-center gap-0.5 text-[12px] text-white/30">
              <Clock size={11} />
              {item.durationMinutes}m
            </span>
          )}
        </div>

        {/* Genre pills */}
        {item.genres && item.genres.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {item.genres.slice(0, 2).map(g => (
              <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-surface-border text-white/35 capitalize">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Algorithm reason */}
        <p className="text-[11px] text-accent-light/70 leading-snug line-clamp-2">{reason}</p>

        {/* Open button */}
        <button
          className={cn(
            'mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-medium transition-all',
            'bg-surface border border-surface-border text-white/60',
            'hover:bg-accent/10 hover:border-accent/40 hover:text-accent-light',
          )}
          onClick={(e) => { e.stopPropagation(); handleOpen() }}
        >
          <ExternalLink size={12} />
          Open in {platform?.name ?? 'app'}
        </button>
      </div>
    </motion.div>
  )
}
