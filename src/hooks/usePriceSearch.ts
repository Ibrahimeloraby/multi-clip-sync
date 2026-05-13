import { useState, useCallback } from 'react'
import { scrapePrices, findCoupons } from '../lib/shopping-api'
import type {
  ScrapedListing,
  PricePoint,
  CouponResult,
  AiRecommendation,
  PriceRange,
} from '../lib/shopping-types'

interface SearchState {
  listings: ScrapedListing[]
  priceRange: PriceRange
  priceHistory: PricePoint[]
  coupons: CouponResult[]
  aiRecommendation: AiRecommendation | null
  scrapedAt: string | null
}

const EMPTY_STATE: SearchState = {
  listings: [],
  priceRange: { min: 0, max: 0, avg: 0, median: 0 },
  priceHistory: [],
  coupons: [],
  aiRecommendation: null,
  scrapedAt: null,
}

export function usePriceSearch() {
  const [isSearching, setIsSearching] = useState(false)
  const [isFindingCoupons, setIsFindingCoupons] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SearchState>(EMPTY_STATE)

  const search = useCallback(
    async (params: {
      productId?: string
      searchQuery: string
      alternativeQueries?: string[]
      productName?: string
      brand?: string
      originalPrice?: number
      includeInternational?: boolean
      includeRefurbished?: boolean
    }) => {
      setIsSearching(true)
      setError(null)
      try {
        const data = await scrapePrices(params)
        setResults({
          listings: data.listings,
          priceRange: data.priceRange,
          priceHistory: data.priceHistory,
          coupons: [],
          aiRecommendation: data.aiRecommendation,
          scrapedAt: data.scrapedAt,
        })

        // Find coupons in background
        if (params.productId || params.productName) {
          setIsFindingCoupons(true)
          findCoupons({
            productId: params.productId,
            productName: params.productName || '',
            brand: params.brand,
            retailers: [...new Set(data.listings.map(l => l.retailer))].slice(0, 4),
          })
            .then(coupons => {
              setResults(prev => ({ ...prev, coupons }))
            })
            .catch(console.error)
            .finally(() => setIsFindingCoupons(false))
        }

        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed'
        setError(message)
        return null
      } finally {
        setIsSearching(false)
      }
    },
    []
  )

  const reset = useCallback(() => setResults(EMPTY_STATE), [])

  return { search, results, isSearching, isFindingCoupons, error, reset }
}
