import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface SparkPoint {
  value: number
}

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  changePct?: number
  sparkData?: SparkPoint[]
  loading?: boolean
  format?: 'number' | 'currency' | 'percent'
  invertChange?: boolean  // for churn rate: lower is better
  subtitle?: string
}

function formatValue(v: string | number, format?: string, unit?: string): string {
  if (typeof v === 'string') return v
  if (format === 'currency') return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  if (format === 'percent') return `${(v * 100).toFixed(1)}%`
  return `${v.toLocaleString()}${unit ? ' ' + unit : ''}`
}

export function KPICard({
  title,
  value,
  unit,
  changePct,
  sparkData,
  loading = false,
  format,
  invertChange = false,
  subtitle,
}: KPICardProps) {
  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800 p-4">
        <Skeleton className="h-3 w-24 mb-3 bg-gray-800" />
        <Skeleton className="h-7 w-32 mb-2 bg-gray-800" />
        <Skeleton className="h-3 w-20 bg-gray-800" />
      </Card>
    )
  }

  const change = changePct ?? 0
  const isPositive = invertChange ? change < 0 : change > 0
  const isNegative = invertChange ? change > 0 : change < 0
  const isNeutral = change === 0

  return (
    <Card className="bg-gray-900 border-gray-800 p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{formatValue(value, format, unit)}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          {changePct !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 mt-1.5 text-xs font-medium',
                isPositive && 'text-emerald-400',
                isNegative && 'text-red-400',
                isNeutral && 'text-gray-500'
              )}
            >
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {isNeutral && <Minus className="w-3 h-3" />}
              <span>
                {Math.abs(change).toFixed(1)}% vs last period
              </span>
            </div>
          )}
        </div>

        {sparkData && sparkData.length > 1 && (
          <div className="w-20 h-12 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', fontSize: '11px', color: '#e5e7eb' }}
                  itemStyle={{ color: '#6366f1' }}
                  formatter={(v: number) => [formatValue(v, format), '']}
                  labelFormatter={() => ''}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isNegative ? '#ef4444' : '#6366f1'}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  )
}
