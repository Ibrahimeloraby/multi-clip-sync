import React, { useState } from 'react'
import {
  Globe,
  Smartphone,
  Mail,
  Store,
  Phone,
  ShoppingCart,
  Eye,
  MessageSquare,
  LogIn,
  Search,
  Package,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { MockEvent } from '@/lib/mockData'

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  web: Globe,
  mobile: Smartphone,
  email: Mail,
  in_store: Store,
  call_center: Phone,
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  page_view: Eye,
  product_view: Eye,
  add_to_cart: ShoppingCart,
  purchase: Package,
  review: MessageSquare,
  support_ticket: MessageSquare,
  login: LogIn,
  search: Search,
  email_open: Mail,
  refund: RefreshCw,
}

const CHANNEL_COLORS: Record<string, string> = {
  web: 'bg-blue-900/40 text-blue-400 border-blue-800',
  mobile: 'bg-purple-900/40 text-purple-400 border-purple-800',
  email: 'bg-indigo-900/40 text-indigo-400 border-indigo-800',
  in_store: 'bg-emerald-900/40 text-emerald-400 border-emerald-800',
  call_center: 'bg-orange-900/40 text-orange-400 border-orange-800',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  purchase: 'text-emerald-400',
  refund: 'text-red-400',
  support_ticket: 'text-orange-400',
  default: 'text-gray-400',
}

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

interface CustomerTimelineProps {
  events: MockEvent[]
  pageSize?: number
}

export function CustomerTimeline({ events, pageSize = 20 }: CustomerTimelineProps) {
  const [visible, setVisible] = useState(pageSize)
  const sorted = [...events].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  const shown = sorted.slice(0, visible)

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No events recorded yet.
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {shown.map((event, idx) => {
        const ChannelIcon = CHANNEL_ICONS[event.channel] ?? Globe
        const EventIcon = EVENT_ICONS[event.eventType] ?? Eye
        const channelColor = CHANNEL_COLORS[event.channel] ?? 'bg-gray-800 text-gray-400 border-gray-700'
        const eventColor = EVENT_TYPE_COLORS[event.eventType] ?? EVENT_TYPE_COLORS.default

        return (
          <div key={event.id} className="flex gap-3 py-2.5 group">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 group-hover:border-gray-600 transition-colors">
                <EventIcon className={cn('w-3.5 h-3.5', eventColor)} />
              </div>
              {idx < shown.length - 1 && (
                <div className="w-px flex-1 bg-gray-800 mt-1 min-h-[8px]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-200">
                  {formatEventType(event.eventType)}
                </span>
                <Badge className={cn('text-xs border px-1.5 py-0 h-4', channelColor)}>
                  <ChannelIcon className="w-2.5 h-2.5 mr-1" />
                  {event.channel}
                </Badge>
                {event.revenue && (
                  <span className="text-xs text-emerald-400 font-medium">
                    +${event.revenue.toFixed(2)}
                  </span>
                )}
                <span className="text-xs text-gray-600 ml-auto">
                  {formatTime(event.occurredAt)}
                </span>
              </div>
              {Object.keys(event.properties).filter((k) => event.properties[k] !== undefined).length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {Object.entries(event.properties)
                    .filter(([, v]) => v !== undefined && v !== null)
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(' · ')}
                </p>
              )}
            </div>
          </div>
        )
      })}

      {visible < sorted.length && (
        <div className="pt-2 pb-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-500 hover:text-gray-300"
            onClick={() => setVisible((v) => v + pageSize)}
          >
            Load {Math.min(pageSize, sorted.length - visible)} more events
          </Button>
        </div>
      )}
    </div>
  )
}
