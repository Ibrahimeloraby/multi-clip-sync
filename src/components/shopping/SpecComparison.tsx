import type { ScrapedListing } from '../../lib/shopping-types'
import { cn } from '../../lib/utils'

interface Props {
  listings: ScrapedListing[]
}

export function SpecComparison({ listings }: Props) {
  const top = listings.slice(0, 4)

  if (top.length < 2) return null

  const rows: {
    label: string
    render: (l: ScrapedListing) => string
    highlight?: 'min' | 'max-num'
  }[] = [
    { label: 'Price', render: l => `$${l.price.toFixed(2)}`, highlight: 'min' },
    { label: 'Retailer', render: l => l.retailerDisplayName },
    {
      label: 'Rating',
      render: l =>
        l.rating
          ? `${l.rating.toFixed(1)} ★ (${l.reviewCount?.toLocaleString() || 0})`
          : '—',
      highlight: 'max-num',
    },
    {
      label: 'Condition',
      render: l => l.condition.charAt(0).toUpperCase() + l.condition.slice(1),
    },
    { label: 'Shipping', render: l => l.shippingInfo || '—' },
    { label: 'Returns', render: l => l.returnPolicy || '—' },
    { label: 'Official Store', render: l => (l.isOfficialRetailer ? '✓' : '—') },
    { label: 'Deal Score', render: l => l.dealScore },
  ]

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left p-3 text-muted-foreground font-medium w-28">Compare</th>
            {top.map((l, i) => (
              <th key={i} className="text-center p-3 font-medium text-foreground min-w-32">
                <div className="flex flex-col items-center gap-1">
                  <span className="truncate max-w-[120px] text-xs">{l.retailerDisplayName}</span>
                  <span className="font-bold text-base">${l.price.toFixed(2)}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const values = top.map(l => row.render(l))
            return (
              <tr key={ri} className={cn('border-b border-border/50', ri % 2 === 0 && 'bg-muted/10')}>
                <td className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">
                  {row.label}
                </td>
                {values.map((v, ci) => {
                  const isBest =
                    row.highlight === 'min'
                      ? top[ci].price === Math.min(...top.map(l => l.price))
                      : false
                  return (
                    <td
                      key={ci}
                      className={cn('p-3 text-center', isBest && 'text-green-600 font-semibold')}
                    >
                      {v}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
