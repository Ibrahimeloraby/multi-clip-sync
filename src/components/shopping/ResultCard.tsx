import { ExternalLink, Star, ShieldCheck, RotateCcw, Truck, Tag, Store } from 'lucide-react'
import { DealScore } from './DealScore'
import { CouponBadge } from './CouponCard'
import type { ScrapedListing, CouponResult } from '../../lib/shopping-types'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

interface Props {
  listing: ScrapedListing
  originalPrice?: number
  coupons?: CouponResult[]
  rank?: number
}

const CONDITION_LABEL = {
  new: 'New',
  refurbished: 'Refurbished',
  used: 'Used',
}

const CONDITION_COLOR = {
  new: 'bg-green-50 text-green-700 border-green-200',
  refurbished: 'bg-blue-50 text-blue-700 border-blue-200',
  used: 'bg-orange-50 text-orange-700 border-orange-200',
}

export function ResultCard({ listing, originalPrice, coupons = [], rank }: Props) {
  const savings = originalPrice ? originalPrice - listing.price : listing.savingsAmount
  const savingsPercent = originalPrice
    ? Math.round(((originalPrice - listing.price) / originalPrice) * 100)
    : listing.savingsPercent

  const matchingCoupons = coupons.filter(
    c => c.retailer === listing.retailer || c.retailer === 'general'
  )

  return (
    <div
      className={cn(
        'group relative bg-card rounded-2xl border border-border p-4 transition-all hover:shadow-md hover:border-primary/30',
        rank === 1 && 'ring-2 ring-primary/30 border-primary/30'
      )}
    >
      {rank === 1 && (
        <div className="absolute -top-2.5 left-4">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full">
            Best Price
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Product image */}
        {listing.imageUrl && (
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="w-full h-full object-contain p-1"
              onError={e => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground line-clamp-2 leading-snug">
                {listing.title}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <div className="flex items-center gap-1">
                  {listing.isOfficialRetailer && <ShieldCheck className="w-3 h-3 text-blue-500" />}
                  <span className="text-xs text-muted-foreground font-medium">
                    {listing.retailerDisplayName}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded border font-medium',
                    CONDITION_COLOR[listing.condition]
                  )}
                >
                  {CONDITION_LABEL[listing.condition]}
                </span>
                {listing.region !== 'US' && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                    {listing.region}
                  </Badge>
                )}
              </div>
            </div>
            <DealScore score={listing.dealScore} size="sm" />
          </div>

          {/* Rating */}
          {listing.rating && (
            <div className="flex items-center gap-1 mt-1.5">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-muted-foreground">
                {listing.rating.toFixed(1)}
                {listing.reviewCount && ` (${listing.reviewCount.toLocaleString()})`}
              </span>
            </div>
          )}

          {/* Price row */}
          <div className="flex items-end gap-2 mt-2">
            <span className="text-xl font-bold text-foreground">${listing.price.toFixed(2)}</span>
            {savings && savings > 0 && (
              <>
                <span className="text-sm text-muted-foreground line-through">
                  ${(listing.originalPrice || originalPrice || 0).toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-green-600">-{savingsPercent}%</span>
              </>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            {listing.shippingInfo && (
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {listing.shippingInfo}
              </span>
            )}
            {listing.returnPolicy && (
              <span className="flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                {listing.returnPolicy}
              </span>
            )}
          </div>

          {/* Coupons */}
          {matchingCoupons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {matchingCoupons.slice(0, 2).map((c, i) => (
                <CouponBadge key={i} coupon={c} />
              ))}
            </div>
          )}

          {/* Action */}
          <div className="mt-3">
            <Button
              size="sm"
              className="w-full gap-2 h-8"
              onClick={() => window.open(listing.productUrl, '_blank')}
            >
              View Deal
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
