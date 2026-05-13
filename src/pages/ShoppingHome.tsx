import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, Zap, Bell, TrendingDown, Globe, Shield, Tag } from 'lucide-react'
import { ScreenshotUpload } from '../components/shopping/ScreenshotUpload'
import { ProductInfo } from '../components/shopping/ProductInfo'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useProductExtraction } from '../hooks/useProductExtraction'
import { toast } from 'sonner'
import type { ExtractedProduct } from '../lib/shopping-types'

export default function ShoppingHome() {
  const navigate = useNavigate()
  const { extractFromFile, isExtracting } = useProductExtraction()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [userPrice, setUserPrice] = useState('')
  const [extractedProduct, setExtractedProduct] = useState<{
    product: ExtractedProduct
    productId?: string
  } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelected = useCallback(
    async (file: File) => {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setExtractedProduct(null)

      const result = await extractFromFile(
        file,
        userPrice ? parseFloat(userPrice) : undefined
      )
      if (result) {
        setExtractedProduct(result)
        toast.success('Product identified! Ready to search.')
      } else {
        toast.error('Could not identify product. Try a clearer screenshot.')
      }
    },
    [extractFromFile, userPrice]
  )

  const handleClear = useCallback(() => {
    setPreviewUrl(null)
    setExtractedProduct(null)
    setSelectedFile(null)
    setUserPrice('')
  }, [])

  const handleSearch = useCallback(() => {
    if (!extractedProduct) {
      toast.error('Please upload a product screenshot first')
      return
    }
    navigate('/shop/results', {
      state: {
        product: extractedProduct.product,
        productId: extractedProduct.productId,
      },
    })
  }, [extractedProduct, navigate])

  const features = [
    { icon: Search, title: 'Multi-retailer Search', desc: 'Amazon, Walmart, Best Buy, eBay & more' },
    { icon: TrendingDown, title: 'Price History', desc: 'See how prices changed over time' },
    { icon: Bell, title: 'Price Alerts', desc: 'Get notified when prices drop' },
    { icon: Tag, title: 'Coupon Finder', desc: 'Auto-find discount codes' },
    { icon: Globe, title: 'International Prices', desc: 'Compare prices worldwide' },
    { icon: Shield, title: 'Deal Scoring', desc: 'AI rates every deal A–D' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-lg">PriceLens</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/shop/watchlist')}>
            My Watchlist
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
            <Zap className="w-4 h-4" />
            AI-Powered Shopping Assistant
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Find the best price for
            <br />
            <span className="text-primary">anything, instantly</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Screenshot any product, upload it, and we'll scan the entire internet for the best
            deals — with price alerts, coupons, and AI recommendations.
          </p>
        </div>

        {/* Main upload card */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-5">
          {/* Price input */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">
                Price shown in screenshot (optional)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={userPrice}
                  onChange={e => setUserPrice(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Screenshot upload */}
          <ScreenshotUpload
            onFileSelected={handleFileSelected}
            isLoading={isExtracting}
            preview={previewUrl}
            onClear={handleClear}
          />

          {/* Extracted product preview */}
          {extractedProduct && <ProductInfo product={extractedProduct.product} />}

          {/* Search button */}
          <Button
            size="lg"
            className="w-full h-12 text-base gap-2"
            onClick={handleSearch}
            disabled={!extractedProduct || isExtracting}
          >
            <Search className="w-5 h-5" />
            {isExtracting ? 'Analyzing screenshot...' : 'Find Best Prices'}
          </Button>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card rounded-2xl border border-border p-4 space-y-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="font-semibold text-sm text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
