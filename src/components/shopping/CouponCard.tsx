import { Tag, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { CouponResult } from '../../lib/shopping-types'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

interface Props {
  coupon: CouponResult
}

export function CouponCard({ coupon }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(coupon.code)
    setCopied(true)
    toast.success(`Coupon code ${coupon.code} copied!`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-green-300 bg-green-50">
      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
        <Tag className="w-4 h-4 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded tracking-wider">
            {coupon.code}
          </code>
          {!coupon.verified && (
            <span className="text-xs text-muted-foreground">(unverified)</span>
          )}
        </div>
        <p className="text-xs text-green-700 mt-0.5">
          {coupon.discountType === 'percentage'
            ? `${coupon.discountValue}% off`
            : `$${coupon.discountValue} off`}
          {coupon.description && ` · ${coupon.description}`}
          {coupon.retailer && ` at ${coupon.retailer}`}
        </p>
      </div>
      <button
        onClick={copy}
        className={cn(
          'p-1.5 rounded-lg transition-colors shrink-0',
          copied
            ? 'bg-green-600 text-white'
            : 'bg-white hover:bg-green-100 text-green-700 border border-green-200'
        )}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// Compact badge version for use inside result cards
export function CouponBadge({ coupon }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(coupon.code)
    setCopied(true)
    toast.success(`Copied: ${coupon.code}`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium hover:bg-green-200 transition-colors border border-green-200"
    >
      <Tag className="w-2.5 h-2.5" />
      {coupon.code}
      {coupon.discountValue > 0 &&
        ` (-${coupon.discountType === 'percentage' ? coupon.discountValue + '%' : '$' + coupon.discountValue})`}
      {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
    </button>
  )
}
