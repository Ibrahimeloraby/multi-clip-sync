import React from 'react'
import type { ChurnRiskLevel } from '@/lib/ml/churn'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ChurnRiskBadgeProps {
  level: ChurnRiskLevel
  score?: number
  topDriver?: string
  size?: 'sm' | 'md'
}

const LEVEL_CONFIG: Record<ChurnRiskLevel, { label: string; className: string; dot: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-950/60 text-red-400 border-red-800',
    dot: 'bg-red-400',
  },
  high: {
    label: 'High',
    className: 'bg-orange-950/60 text-orange-400 border-orange-800',
    dot: 'bg-orange-400',
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-950/60 text-yellow-400 border-yellow-800',
    dot: 'bg-yellow-400',
  },
  low: {
    label: 'Low',
    className: 'bg-emerald-950/60 text-emerald-400 border-emerald-800',
    dot: 'bg-emerald-400',
  },
}

export function ChurnRiskBadge({ level, score, topDriver, size = 'md' }: ChurnRiskBadgeProps) {
  const config = LEVEL_CONFIG[level]

  const badge = (
    <Badge
      className={cn(
        'border font-semibold flex items-center gap-1 cursor-default select-none',
        config.className,
        size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
      {score !== undefined && ` (${(score * 100).toFixed(0)}%)`}
    </Badge>
  )

  if (topDriver || score !== undefined) {
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="bg-gray-800 border-gray-700 text-gray-100 max-w-[220px]">
          {score !== undefined && (
            <p className="text-xs mb-1">
              Churn probability: <span className="font-semibold">{(score * 100).toFixed(1)}%</span>
            </p>
          )}
          {topDriver && <p className="text-xs text-gray-400">Top driver: {topDriver}</p>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return badge
}
