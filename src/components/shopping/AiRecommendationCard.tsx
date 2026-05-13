import { Sparkles, TrendingDown, TrendingUp, Minus, Clock, Lightbulb } from 'lucide-react'
import type { AiRecommendation } from '../../lib/shopping-types'
import { cn } from '../../lib/utils'

interface Props {
  recommendation: AiRecommendation
}

const RATING_CONFIG = {
  excellent: {
    label: 'Excellent Deal',
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    accent: 'text-green-600',
    iconBg: 'bg-green-100',
    buyBg: 'bg-green-600',
  },
  good: {
    label: 'Good Deal',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    accent: 'text-blue-600',
    iconBg: 'bg-blue-100',
    buyBg: 'bg-blue-600',
  },
  fair: {
    label: 'Fair Price',
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    accent: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    buyBg: 'bg-yellow-600',
  },
  poor: {
    label: 'Better Options Likely',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    accent: 'text-red-600',
    iconBg: 'bg-red-100',
    buyBg: 'bg-red-500',
  },
}

const TREND_ICON = {
  rising: { Icon: TrendingUp, color: 'text-red-500', label: 'Price is rising' },
  falling: { Icon: TrendingDown, color: 'text-green-500', label: 'Price is falling' },
  stable: { Icon: Minus, color: 'text-muted-foreground', label: 'Price is stable' },
}

export function AiRecommendationCard({ recommendation }: Props) {
  const config = RATING_CONFIG[recommendation.dealRating]
  const trend = TREND_ICON[recommendation.priceTrend]

  return (
    <div className={cn('rounded-2xl border p-5 space-y-4', config.bg)}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            config.iconBg
          )}
        >
          <Sparkles className={cn('w-5 h-5', config.accent)} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn('font-bold text-lg', config.text)}>{config.label}</h3>
            <span
              className={cn(
                'text-sm font-semibold px-2 py-0.5 rounded-full text-white',
                recommendation.buyNow ? config.buyBg : 'bg-muted text-muted-foreground'
              )}
            >
              {recommendation.buyNow ? '🛒 Buy Now' : '⏳ Wait'}
            </span>
          </div>
          <p className={cn('text-sm mt-1 leading-relaxed', config.text)}>
            {recommendation.reasoning}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Price trend */}
        <div className="flex items-center gap-2 text-sm">
          <trend.Icon className={cn('w-4 h-4 shrink-0', trend.color)} />
          <span className="text-muted-foreground">{trend.label}</span>
        </div>

        {/* Best time to buy */}
        {recommendation.bestTimeToBuy && (
          <div className="flex items-start gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{recommendation.bestTimeToBuy}</span>
          </div>
        )}
      </div>

      {/* Savings tip */}
      {recommendation.savingsTip && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-white/60">
          <Lightbulb className={cn('w-4 h-4 shrink-0 mt-0.5', config.accent)} />
          <p className={cn('text-sm', config.text)}>
            <strong>Tip:</strong> {recommendation.savingsTip}
          </p>
        </div>
      )}
    </div>
  )
}
