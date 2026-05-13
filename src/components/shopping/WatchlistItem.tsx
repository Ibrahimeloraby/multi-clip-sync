import { Bell, BellOff, Trash2, TrendingDown, TrendingUp, ExternalLink } from 'lucide-react'
import type { WatchlistEntry } from '../../lib/shopping-types'
import { Button } from '../ui/button'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '../../lib/utils'

interface Props {
  entry: WatchlistEntry
  onRemove: (productId: string) => void
  onSetAlert: (productId: string) => void
  onViewResults: (entry: WatchlistEntry) => void
}

export function WatchlistItem({ entry, onRemove, onSetAlert, onViewResults }: Props) {
  const hasAlert = !!entry.alert
  const priceChange = (entry as any).priceChange24h as number | undefined

  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 text-lg">
        🛍️
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{entry.product.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.product.brand && (
            <span className="text-xs text-muted-foreground">{entry.product.brand}</span>
          )}
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            Added {formatDistanceToNow(new Date(entry.addedAt), { addSuffix: true })}
          </span>
        </div>

        {/* Price info */}
        <div className="flex items-center gap-3 mt-1.5">
          {entry.product.original_price && (
            <span className="text-sm font-medium text-foreground">
              ${entry.product.original_price.toFixed(2)}{' '}
              <span className="text-xs text-muted-foreground">original</span>
            </span>
          )}
          {entry.currentBestPrice && (
            <span className="text-sm font-bold text-green-600">
              ${entry.currentBestPrice.toFixed(2)}{' '}
              <span className="text-xs font-normal text-muted-foreground">best now</span>
            </span>
          )}
          {priceChange !== undefined && priceChange !== 0 && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                priceChange < 0 ? 'text-green-600' : 'text-red-500'
              )}
            >
              {priceChange < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              {Math.abs(priceChange).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Alert info */}
        {hasAlert && entry.alert && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-primary">
            <Bell className="w-3 h-3" />
            {entry.alert.targetPrice
              ? `Alert at $${entry.alert.targetPrice}`
              : `Alert at ${entry.alert.percentageDropThreshold}% drop`}
            · expires {formatDistanceToNow(new Date(entry.alert.expiresAt), { addSuffix: true })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewResults(entry)}
          title="View results"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', hasAlert && 'text-primary')}
          onClick={() => onSetAlert(entry.productId)}
          title={hasAlert ? 'Edit alert' : 'Set alert'}
        >
          {hasAlert ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(entry.productId)}
          title="Remove from watchlist"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
