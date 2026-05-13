import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Globe,
  Package,
  Tag as TagIcon,
  ListFilter,
} from 'lucide-react'
import { ResultCard } from '../components/shopping/ResultCard'
import { PriceChart } from '../components/shopping/PriceChart'
import { AlertDialog } from '../components/shopping/AlertDialog'
import { CouponCard } from '../components/shopping/CouponCard'
import { AiRecommendationCard } from '../components/shopping/AiRecommendationCard'
import { SpecComparison } from '../components/shopping/SpecComparison'
import { ProductInfo } from '../components/shopping/ProductInfo'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { usePriceSearch } from '../hooks/usePriceSearch'
import { useWatchlist } from '../hooks/useWatchlist'
import { usePriceAlerts } from '../hooks/usePriceAlerts'
import { toast } from 'sonner'
import type { ExtractedProduct, TabType } from '../lib/shopping-types'

type SortOption = 'price-asc' | 'price-desc' | 'rating' | 'deal-score'

export default function ShoppingResults() {
  const location = useLocation()
  const navigate = useNavigate()
  const { product, productId } = (location.state || {}) as {
    product?: ExtractedProduct
    productId?: string
  }

  const { search, results, isSearching, isFindingCoupons } = usePriceSearch()
  const { isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { createAlert, isCreating, alerts } = usePriceAlerts(productId)

  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('price-asc')
  const [showAlertDialog, setShowAlertDialog] = useState(false)
  const [includeIntl, setIncludeIntl] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!product) {
      navigate('/shop')
      return
    }
    runSearch(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runSearch = async (withIntl: boolean) => {
    if (!product) return
    setHasSearched(false)
    await search({
      productId,
      searchQuery: product.searchQuery,
      alternativeQueries: product.alternativeSearchQueries,
      productName: product.name,
      brand: product.brand,
      originalPrice: product.price,
      includeInternational: withIntl,
      includeRefurbished: true,
    })
    setHasSearched(true)
  }

  const filteredListings = useMemo(() => {
    let list = results.listings

    if (activeTab === 'best-deals') {
      list = list.filter(l => l.dealScore === 'A' || l.dealScore === 'B')
    } else if (activeTab === 'refurbished') {
      list = list.filter(l => l.condition === 'refurbished')
    } else if (activeTab === 'international') {
      list = list.filter(l => l.region !== 'US')
    }

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'deal-score':
          return a.dealScore.charCodeAt(0) - b.dealScore.charCodeAt(0)
        default:
          return 0
      }
    })
  }, [results.listings, activeTab, sortBy])

  const watched = productId ? isWatched(productId) : false
  const existingAlert = alerts[0] || null

  const handleWatchlist = () => {
    if (!productId) {
      toast.error('Save the product first by uploading a screenshot')
      return
    }
    if (watched) removeFromWatchlist(productId)
    else addToWatchlist(productId)
  }

  if (!product) return null

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'all', label: 'All Results', count: results.listings.length },
    {
      id: 'best-deals',
      label: 'Best Deals',
      count: results.listings.filter(l => l.dealScore === 'A' || l.dealScore === 'B').length,
    },
    {
      id: 'refurbished',
      label: 'Refurbished',
      count: results.listings.filter(l => l.condition === 'refurbished').length,
    },
    {
      id: 'international',
      label: 'International',
      count: results.listings.filter(l => l.region !== 'US').length,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/shop')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground truncate">{product.name}</h1>
            {results.scrapedAt && (
              <p className="text-xs text-muted-foreground">
                Updated {new Date(results.scrapedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAlertDialog(true)}
              disabled={!productId}
            >
              <Bell className="w-4 h-4" />
              Alert
              {existingAlert && <span className="w-2 h-2 rounded-full bg-primary" />}
            </Button>
            <Button
              variant={watched ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={handleWatchlist}
              disabled={!productId}
            >
              {watched ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {watched ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Product info */}
        <ProductInfo product={product} />

        {/* Loading state */}
        {isSearching && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Scanning Amazon, Walmart, Best Buy, eBay and more...
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Results */}
        {!isSearching && hasSearched && (
          <>
            {/* Price summary bar */}
            {results.priceRange.min > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                  <p className="text-xs text-green-700 font-medium">Best Price</p>
                  <p className="text-2xl font-bold text-green-800">
                    ${results.priceRange.min.toFixed(2)}
                  </p>
                </div>
                <div className="bg-muted rounded-2xl p-4 text-center border border-border">
                  <p className="text-xs text-muted-foreground font-medium">Average</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${results.priceRange.avg.toFixed(2)}
                  </p>
                </div>
                <div className="bg-muted rounded-2xl p-4 text-center border border-border">
                  <p className="text-xs text-muted-foreground font-medium">Highest</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${results.priceRange.max.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* AI Recommendation */}
            {results.aiRecommendation && (
              <AiRecommendationCard recommendation={results.aiRecommendation} />
            )}

            {/* Coupons section */}
            {(results.coupons.length > 0 || isFindingCoupons) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-green-600" />
                  <h2 className="font-semibold text-foreground">
                    {isFindingCoupons
                      ? 'Finding coupons...'
                      : `${results.coupons.length} Coupon${results.coupons.length !== 1 ? 's' : ''} Found`}
                  </h2>
                  {isFindingCoupons && (
                    <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                {results.coupons.map((c, i) => (
                  <CouponCard key={i} coupon={c} />
                ))}
              </div>
            )}

            {/* Price History Chart */}
            {results.priceHistory.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  Price History
                  <Badge variant="outline" className="text-xs">
                    {results.priceHistory.length} data points
                  </Badge>
                </h2>
                <div className="bg-card rounded-2xl border border-border p-4">
                  <PriceChart
                    priceHistory={results.priceHistory}
                    originalPrice={product.price}
                    targetPrice={existingAlert?.targetPrice || undefined}
                  />
                </div>
              </div>
            )}

            {/* Spec comparison */}
            {filteredListings.length >= 2 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-foreground">Side-by-Side Comparison</h2>
                <SpecComparison listings={filteredListings.slice(0, 4)} />
              </div>
            )}

            {/* Listings tabs + sort */}
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-1 p-1 bg-muted rounded-xl overflow-x-auto">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                        activeTab === tab.id
                          ? 'bg-background shadow text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <ListFilter className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Best Rated</SelectItem>
                      <SelectItem value="deal-score">Best Deal Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Listings grid */}
              {filteredListings.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No results found in this category</p>
                  <p className="text-sm mt-1">Try the All Results tab or refresh</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => runSearch(includeIntl)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Search Again
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredListings.map((listing, i) => (
                    <ResultCard
                      key={listing.id || i}
                      listing={listing}
                      originalPrice={product.price}
                      coupons={results.coupons}
                      rank={i + 1}
                    />
                  ))}
                </div>
              )}

              {/* International toggle */}
              {!includeIntl && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setIncludeIntl(true)
                      runSearch(true)
                    }}
                  >
                    <Globe className="w-4 h-4" />
                    Search International Prices
                  </Button>
                </div>
              )}

              {/* Refresh */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground"
                  onClick={() => runSearch(includeIntl)}
                  disabled={isSearching}
                >
                  <RefreshCw className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                  Refresh prices
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Empty initial state */}
        {!isSearching && !hasSearched && (
          <div className="text-center py-16 text-muted-foreground">
            <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30 animate-spin" />
            <p>Searching for the best prices...</p>
          </div>
        )}
      </main>

      {/* Alert Dialog */}
      {productId && (
        <AlertDialog
          open={showAlertDialog}
          onClose={() => setShowAlertDialog(false)}
          onSave={alert => {
            createAlert({ ...alert, productId: productId })
            setShowAlertDialog(false)
          }}
          productId={productId}
          currentPrice={results.priceRange.min || product.price}
          isSaving={isCreating}
          existingAlert={existingAlert}
        />
      )}
    </div>
  )
}
