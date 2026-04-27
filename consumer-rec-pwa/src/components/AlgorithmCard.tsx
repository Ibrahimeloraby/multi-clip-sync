import { motion } from 'framer-motion'
import { ChevronRight, Info } from 'lucide-react'
import { useState } from 'react'
import type { AlgorithmDefinition } from '../engine/types'
import { cn } from '../lib/utils'

interface Props {
  algorithm: AlgorithmDefinition
  isSelected?: boolean
  onSelect: (id: string) => void
  index: number
}

const EXPLORATION_LABELS = { 1: 'Safe pick', 2: 'Balanced', 3: 'Adventurous' }
const EXPLORATION_COLORS = { 1: 'text-green-400', 2: 'text-yellow-400', 3: 'text-orange-400' }

export function AlgorithmCard({ algorithm: alg, isSelected, onSelect, index }: Props) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className={cn(
        'relative rounded-2xl border cursor-pointer select-none overflow-hidden transition-all duration-200',
        isSelected
          ? 'border-accent bg-surface-raised scale-[1.02]'
          : 'border-surface-border bg-surface-card hover:border-surface-raised hover:bg-surface-raised',
      )}
      onClick={() => onSelect(alg.id)}
      // TV D-pad support
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(alg.id)}
      style={isSelected ? { boxShadow: `0 0 24px 2px ${alg.accentColor}55` } : undefined}
    >
      {/* Gradient bar on selected */}
      {isSelected && (
        <div className={cn('absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r', alg.gradient)} />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Emoji with gradient bg */}
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 bg-gradient-to-br',
              alg.gradient,
            )}>
              {alg.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-[15px] leading-tight">{alg.name}</h3>
                {alg.badgeText && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-light">
                    {alg.badgeText}
                  </span>
                )}
              </div>
              <p className="text-sm text-white/60 mt-0.5 leading-tight">{alg.tagline}</p>
            </div>
          </div>

          {/* Info + select indicator */}
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <button
              className="p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-surface-raised transition-colors"
              onClick={(e) => { e.stopPropagation(); setShowDetail(v => !v) }}
              title="How it works"
            >
              <Info size={15} />
            </button>
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
              isSelected ? 'border-accent bg-accent' : 'border-surface-border',
            )}>
              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-white/55 leading-relaxed">
          {alg.description}
        </p>

        {/* Expandable "how it works" */}
        {showDetail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 rounded-xl bg-surface border border-surface-border"
          >
            <p className="text-xs text-white/45 leading-relaxed">
              <span className="text-white/60 font-medium">How the AI works: </span>
              {alg.howItWorks}
            </p>
          </motion.div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-4">
          {/* Vibe pills */}
          <div className="flex gap-1.5 flex-wrap">
            {alg.vibes.map(v => (
              <span key={v} className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-surface-border text-white/40">
                {v}
              </span>
            ))}
          </div>

          {/* Exploration level */}
          <span className={cn('text-[11px] font-medium', EXPLORATION_COLORS[alg.explorationLevel])}>
            {EXPLORATION_LABELS[alg.explorationLevel]}
          </span>
        </div>

        {/* Special inputs hint */}
        {alg.requiresSeed && (
          <div className="mt-3 flex items-center gap-1.5 text-[12px] text-accent-light/70">
            <ChevronRight size={12} />
            You'll pick a seed item after selecting
          </div>
        )}
        {alg.requiresMood && (
          <div className="mt-3 flex items-center gap-1.5 text-[12px] text-accent-light/70">
            <ChevronRight size={12} />
            You'll pick your mood after selecting
          </div>
        )}
        {alg.requiresDuration && (
          <div className="mt-3 flex items-center gap-1.5 text-[12px] text-accent-light/70">
            <ChevronRight size={12} />
            You'll set your available time after selecting
          </div>
        )}
      </div>
    </motion.div>
  )
}
