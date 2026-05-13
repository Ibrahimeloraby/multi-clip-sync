export interface ExtractedProduct {
  name: string
  brand: string
  model?: string | null
  price: number
  currency: string
  description: string
  category: string
  specs: Record<string, string>
  imageUrl?: string
  retailer?: string | null
  retailerUrl?: string | null
  searchQuery: string
  alternativeSearchQueries: string[]
}

export interface ScrapedListing {
  id?: string
  title: string
  price: number
  originalPrice?: number
  currency: string
  retailer: string
  retailerDisplayName: string
  productUrl: string
  imageUrl?: string
  rating?: number
  reviewCount?: number
  inStock: boolean
  condition: 'new' | 'refurbished' | 'used'
  returnPolicy?: string
  shippingInfo?: string
  sellerName?: string
  sellerRating?: number
  isOfficialRetailer: boolean
  dealScore: 'A' | 'B' | 'C' | 'D'
  region: string
  savingsAmount?: number
  savingsPercent?: number
}

export interface PricePoint {
  id?: string
  retailer: string
  price: number
  currency: string
  inStock: boolean
  recorded_at: string
}

export interface CouponResult {
  id?: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  retailer: string
  expiresAt?: string
  verified: boolean
  description?: string
  confidence?: 'low' | 'medium' | 'high'
}

export interface AiRecommendation {
  buyNow: boolean
  dealRating: 'excellent' | 'good' | 'fair' | 'poor'
  reasoning: string
  bestTimeToBuy?: string | null
  priceTrend: 'rising' | 'falling' | 'stable'
  savingsTip?: string | null
}

export interface PriceRange {
  min: number
  max: number
  avg: number
  median: number
}

export interface SearchResult {
  productId?: string
  product: ExtractedProduct
  listings: ScrapedListing[]
  priceRange: PriceRange
  priceHistory: PricePoint[]
  coupons: CouponResult[]
  aiRecommendation: AiRecommendation
  scrapedAt: string
}

export interface PriceAlert {
  id: string
  userSessionId: string
  productId: string
  targetPrice?: number | null
  percentageDropThreshold?: number | null
  watchDurationDays: number
  expiresAt: string
  active: boolean
  notifyOnBackInStock: boolean
  notifyOnCoupon: boolean
  alertEmail?: string | null
  createdAt: string
  lastTriggeredAt?: string | null
  triggerCount: number
}

export interface WatchlistEntry {
  id: string
  productId: string
  addedAt: string
  notes?: string
  product: {
    id: string
    name: string
    brand?: string
    category?: string
    original_price?: number
    currency?: string
    specs?: Record<string, string>
  }
  currentBestPrice?: number
  priceChange24h?: number
  alert?: PriceAlert | null
}

export type TabType = 'all' | 'best-deals' | 'refurbished' | 'international'

export interface FilterState {
  maxPrice?: number
  minRating?: number
  condition: 'all' | 'new' | 'refurbished' | 'used'
  officialOnly: boolean
  inStockOnly: boolean
  region: 'all' | 'US' | 'UK' | 'CA' | 'AU'
}
