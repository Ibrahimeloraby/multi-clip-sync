import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import type { PricePoint } from '../../lib/shopping-types'
import { useMemo } from 'react'

interface Props {
  priceHistory: PricePoint[]
  originalPrice?: number
  targetPrice?: number
  currency?: string
}

export function PriceChart({ priceHistory, originalPrice, targetPrice, currency = 'USD' }: Props) {
  const chartData = useMemo(() => {
    // Group by date, take min price per day across all retailers
    const byDate = new Map<string, { prices: number[]; date: string }>()

    for (const point of priceHistory) {
      const date = point.recorded_at.split('T')[0]
      if (!byDate.has(date)) byDate.set(date, { prices: [], date })
      byDate.get(date)!.prices.push(point.price)
    }

    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(({ date, prices }) => ({
        date,
        price: Math.min(...prices),
        avg: prices.reduce((s, p) => s + p, 0) / prices.length,
      }))
  }, [priceHistory])

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-xl">
        No price history yet. Check back after a few days of tracking.
      </div>
    )
  }

  const minPrice = Math.min(...chartData.map(d => d.price))
  const maxPrice = Math.max(...chartData.map(d => d.price))
  const padding = (maxPrice - minPrice) * 0.1 || 5

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-background border border-border rounded-lg p-2.5 shadow-lg text-sm">
        <p className="text-muted-foreground text-xs mb-1">
          {format(new Date(label), 'MMM d, yyyy')}
        </p>
        <p className="font-bold text-foreground">${payload[0].value.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">Best price found</p>
      </div>
    )
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="date"
            tickFormatter={v => format(new Date(v), 'MMM d')}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tickFormatter={v => `$${v.toFixed(0)}`}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          {originalPrice && (
            <ReferenceLine
              y={originalPrice}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={{
                value: 'Original',
                position: 'insideTopRight',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
          )}
          {targetPrice && (
            <ReferenceLine
              y={targetPrice}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              label={{
                value: 'Target',
                position: 'insideTopRight',
                fontSize: 10,
                fill: 'hsl(var(--primary))',
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
