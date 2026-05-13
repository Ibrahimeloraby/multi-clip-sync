import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ScrapedListing {
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
  isOfficialRetailer: boolean
  dealScore: 'A' | 'B' | 'C' | 'D'
  region: string
  savingsAmount?: number
  savingsPercent?: number
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))
  ])
}

// Extract price from string like "$29.99", "29.99", "29,99"
function parsePrice(str: string): number | null {
  if (!str) return null
  const cleaned = str.replace(/[^0-9.,]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// Extract JSON-LD structured data from HTML
function extractJsonLd(html: string): any[] {
  const results: any[] = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      results.push(data)
    } catch {}
  }
  return results
}

// Calculate deal score based on savings percentage
function calcDealScore(savingsPercent?: number): 'A' | 'B' | 'C' | 'D' {
  if (!savingsPercent) return 'C'
  if (savingsPercent >= 30) return 'A'
  if (savingsPercent >= 15) return 'B'
  if (savingsPercent >= 5) return 'C'
  return 'D'
}

// Scrape Google Shopping
async function scrapeGoogleShopping(query: string): Promise<ScrapedListing[]> {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop&hl=en&gl=us`
  const res = await fetch(url, { headers: BROWSER_HEADERS })
  const html = await res.text()

  const listings: ScrapedListing[] = []

  // Try to extract from embedded JSON data
  const dataMatch = html.match(/window\.google\.pla\s*=\s*({[\s\S]+?});/)
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1])
      // Parse Google's pla data structure
    } catch {}
  }

  // Parse product cards from HTML
  // Google Shopping product cards: div with class "sh-dgr__content" or similar
  const productBlocks = html.match(/<div[^>]+class="[^"]*sh-dgr__content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g) || []

  for (const block of productBlocks.slice(0, 8)) {
    try {
      // Extract title
      const titleMatch = block.match(/<h3[^>]*class="[^"]*tAxDx[^"]*"[^>]*>(.*?)<\/h3>/) ||
                         block.match(/<h4[^>]*>(.*?)<\/h4>/)
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null
      if (!title) continue

      // Extract price
      const priceMatch = block.match(/\$[\d,]+\.?\d*/)
      const price = priceMatch ? parsePrice(priceMatch[0]) : null
      if (!price) continue

      // Extract retailer
      const retailerMatch = block.match(/<div[^>]*class="[^"]*aULzUe[^"]*"[^>]*>(.*?)<\/div>/) ||
                             block.match(/<span[^>]*class="[^"]*E5ocAb[^"]*"[^>]*>(.*?)<\/span>/)
      const retailer = retailerMatch ? retailerMatch[1].replace(/<[^>]+>/g, '').trim() : 'Google Shopping'

      listings.push({
        title,
        price,
        currency: 'USD',
        retailer: retailer.toLowerCase().replace(/\s+/g, '-'),
        retailerDisplayName: retailer,
        productUrl: `https://www.google.com/search?q=${encodeURIComponent(title)}&tbm=shop`,
        inStock: true,
        condition: 'new',
        isOfficialRetailer: ['amazon', 'walmart', 'target', 'best buy', 'apple', 'costco'].includes(retailer.toLowerCase()),
        dealScore: 'C',
        region: 'US',
      })
    } catch {}
  }

  return listings
}

// Scrape eBay search results
async function scrapeEbay(query: string): Promise<ScrapedListing[]> {
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=12&LH_BIN=1`
  const res = await fetch(url, { headers: BROWSER_HEADERS })
  const html = await res.text()

  const listings: ScrapedListing[] = []

  // eBay product cards are in <li class="s-item">
  const itemRegex = /<li[^>]+class="[^"]*s-item[^"]*"[^>]*>([\s\S]*?)<\/li>/g
  let match
  let count = 0

  while ((match = itemRegex.exec(html)) !== null && count < 8) {
    const block = match[1]

    // Skip "More items" or header rows
    if (block.includes('s-item__placeholder')) continue

    // Title
    const titleMatch = block.match(/<span[^>]+role="heading"[^>]*>(.*?)<\/span>/) ||
                        block.match(/<div[^>]+class="[^"]*s-item__title[^"]*"[^>]*>(.*?)<\/div>/)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null
    if (!title || title === 'Shop on eBay') continue

    // Price
    const priceMatch = block.match(/<span[^>]+class="[^"]*s-item__price[^"]*"[^>]*>(.*?)<\/span>/)
    const priceStr = priceMatch ? priceMatch[1].replace(/<[^>]+>/g, '') : ''
    const price = parsePrice(priceStr)
    if (!price) continue

    // URL
    const urlMatch = block.match(/<a[^>]+href="(https:\/\/www\.ebay\.com\/itm\/[^"]+)"/)
    const productUrl = urlMatch ? urlMatch[1].split('?')[0] : 'https://www.ebay.com'

    // Condition
    const conditionMatch = block.match(/<span[^>]+class="[^"]*SECONDARY_INFO[^"]*"[^>]*>(.*?)<\/span>/)
    const conditionStr = conditionMatch ? conditionMatch[1].toLowerCase() : 'new'
    const condition: 'new' | 'refurbished' | 'used' =
      conditionStr.includes('refurb') ? 'refurbished' :
      conditionStr.includes('used') || conditionStr.includes('pre-owned') ? 'used' : 'new'

    // Shipping
    const shippingMatch = block.match(/<span[^>]+class="[^"]*s-item__shipping[^"]*"[^>]*>(.*?)<\/span>/)
    const shippingInfo = shippingMatch ? shippingMatch[1].replace(/<[^>]+>/g, '').trim() : undefined

    // Rating
    const ratingMatch = block.match(/aria-label="([\d.]+) out of 5 stars"/)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined

    listings.push({
      title,
      price,
      currency: 'USD',
      retailer: 'ebay',
      retailerDisplayName: 'eBay',
      productUrl,
      rating,
      inStock: true,
      condition,
      shippingInfo,
      isOfficialRetailer: false,
      dealScore: calcDealScore(),
      region: 'US',
    })
    count++
  }

  return listings
}

// Scrape Walmart
async function scrapeWalmart(query: string): Promise<ScrapedListing[]> {
  const url = `https://www.walmart.com/search?q=${encodeURIComponent(query)}&sort=best_match`
  const res = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      'Accept': 'text/html,application/xhtml+xml',
    }
  })
  const html = await res.text()

  const listings: ScrapedListing[] = []

  // Walmart embeds __NEXT_DATA__ JSON
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1])
      const items = nextData?.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items || []

      for (const item of items.slice(0, 8)) {
        if (!item.name || !item.priceInfo?.currentPrice?.price) continue

        const price = item.priceInfo.currentPrice.price
        const originalPrice = item.priceInfo?.wasPrice?.price || undefined
        const savingsAmount = originalPrice ? originalPrice - price : undefined
        const savingsPercent = originalPrice ? ((originalPrice - price) / originalPrice) * 100 : undefined

        listings.push({
          title: item.name,
          price,
          originalPrice,
          currency: 'USD',
          retailer: 'walmart',
          retailerDisplayName: 'Walmart',
          productUrl: `https://www.walmart.com${item.canonicalUrl || '/ip/' + item.usItemId}`,
          imageUrl: item.imageInfo?.thumbnailUrl,
          rating: item.rating?.averageRating,
          reviewCount: item.rating?.numberOfReviews,
          inStock: item.availabilityStatus !== 'OUT_OF_STOCK',
          condition: 'new',
          returnPolicy: '90 days free returns',
          isOfficialRetailer: true,
          dealScore: calcDealScore(savingsPercent),
          region: 'US',
          savingsAmount,
          savingsPercent,
        })
      }
    } catch (e) {
      console.error('Walmart parse error:', e)
    }
  }

  return listings
}

// Scrape Best Buy
async function scrapeBestBuy(query: string): Promise<ScrapedListing[]> {
  const url = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(query)}&intl=nosplash`
  const res = await fetch(url, { headers: BROWSER_HEADERS })
  const html = await res.text()

  const listings: ScrapedListing[] = []

  // Best Buy embeds product data in script tags
  const dataMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]+?);<\/script>/) ||
                    html.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/)

  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1])
      const products = data?.response?.products ||
                       data?.props?.pageProps?.searchResults?.products || []

      for (const product of products.slice(0, 6)) {
        if (!product.names?.title || !product.priceblock?.customerPrice) continue

        const price = product.priceblock.customerPrice
        const originalPrice = product.priceblock?.regularPrice || undefined
        const savingsAmount = originalPrice && originalPrice > price ? originalPrice - price : undefined
        const savingsPercent = savingsAmount && originalPrice ? (savingsAmount / originalPrice) * 100 : undefined

        listings.push({
          title: product.names.title,
          price,
          originalPrice,
          currency: 'USD',
          retailer: 'bestbuy',
          retailerDisplayName: 'Best Buy',
          productUrl: `https://www.bestbuy.com${product.url || ''}`,
          imageUrl: product.images?.standard,
          rating: product.customerReviewAverage,
          reviewCount: product.customerReviewCount,
          inStock: product.inStoreAvailability !== false,
          condition: 'new',
          returnPolicy: '15-day return policy',
          isOfficialRetailer: true,
          dealScore: calcDealScore(savingsPercent),
          region: 'US',
          savingsAmount,
          savingsPercent,
        })
      }
    } catch {}
  }

  return listings
}

// Scrape Amazon (limited without API)
async function scrapeAmazon(query: string): Promise<ScrapedListing[]> {
  const url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}&ref=nb_sb_noss`
  const res = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      'Accept-Language': 'en-US,en;q=0.9',
    }
  })
  const html = await res.text()

  const listings: ScrapedListing[] = []

  // Amazon search results have data-component-type="s-search-result"
  const resultRegex = /data-component-type="s-search-result"[^>]*>([\s\S]*?)(?=data-component-type="s-search-result"|<\/div>\s*<div[^>]+class="[^"]*s-pagination)/g
  let match
  let count = 0

  while ((match = resultRegex.exec(html)) !== null && count < 6) {
    const block = match[0]

    // Title - from h2 or span.a-size-base-plus
    const titleMatch = block.match(/<span[^>]+class="[^"]*a-size-medium[^"]*"[^>]*>(.*?)<\/span>/) ||
                        block.match(/<h2[^>]*><a[^>]*>(.*?)<\/a>/)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null
    if (!title) continue

    // Price - from span.a-price-whole
    const priceWholeMatch = block.match(/<span[^>]+class="[^"]*a-price-whole[^"]*"[^>]*>([\d,]+)/)
    const priceFracMatch = block.match(/<span[^>]+class="[^"]*a-price-fraction[^"]*"[^>]*>(\d+)/)
    let price: number | null = null
    if (priceWholeMatch) {
      const whole = parseInt(priceWholeMatch[1].replace(',', ''))
      const frac = priceFracMatch ? parseInt(priceFracMatch[1]) / 100 : 0
      price = whole + frac
    }
    if (!price) continue

    // ASIN for URL
    const asinMatch = block.match(/data-asin="([A-Z0-9]{10})"/)
    const asin = asinMatch ? asinMatch[1] : null

    // Rating
    const ratingMatch = block.match(/(\d+\.?\d*) out of 5 stars/)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined

    // Review count
    const reviewMatch = block.match(/(\d[\d,]*)\s*ratings?/)
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(',', '')) : undefined

    listings.push({
      title,
      price,
      currency: 'USD',
      retailer: 'amazon',
      retailerDisplayName: 'Amazon',
      productUrl: asin ? `https://www.amazon.com/dp/${asin}` : `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
      rating,
      reviewCount,
      inStock: true,
      condition: 'new',
      returnPolicy: '30-day return policy',
      shippingInfo: 'Free shipping with Prime',
      isOfficialRetailer: true,
      dealScore: 'C',
      region: 'US',
    })
    count++
  }

  return listings
}

// Search for refurbished options on eBay
async function scrapeRefurbished(query: string): Promise<ScrapedListing[]> {
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query + ' refurbished')}&LH_ItemCondition=2500&LH_BIN=1`
  const res = await fetch(url, { headers: BROWSER_HEADERS })
  const html = await res.text()

  const listings: ScrapedListing[] = []
  const itemRegex = /<li[^>]+class="[^"]*s-item[^"]*"[^>]*>([\s\S]*?)<\/li>/g
  let match
  let count = 0

  while ((match = itemRegex.exec(html)) !== null && count < 4) {
    const block = match[1]
    if (block.includes('s-item__placeholder')) continue

    const titleMatch = block.match(/<span[^>]+role="heading"[^>]*>(.*?)<\/span>/)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null
    if (!title) continue

    const priceMatch = block.match(/<span[^>]+class="[^"]*s-item__price[^"]*"[^>]*>(.*?)<\/span>/)
    const price = priceMatch ? parsePrice(priceMatch[1].replace(/<[^>]+>/g, '')) : null
    if (!price) continue

    const urlMatch = block.match(/<a[^>]+href="(https:\/\/www\.ebay\.com\/itm\/[^"]+)"/)
    const productUrl = urlMatch ? urlMatch[1].split('?')[0] : 'https://www.ebay.com'

    listings.push({
      title,
      price,
      currency: 'USD',
      retailer: 'ebay-refurb',
      retailerDisplayName: 'eBay Refurbished',
      productUrl,
      inStock: true,
      condition: 'refurbished',
      isOfficialRetailer: false,
      dealScore: calcDealScore(25),
      region: 'US',
    })
    count++
  }

  return listings
}

// Search international options (UK, CA, AU)
async function scrapeInternational(query: string): Promise<ScrapedListing[]> {
  const internationalSources = [
    { url: `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1`,
      retailer: 'ebay-uk', display: 'eBay UK', region: 'UK', currency: 'GBP' },
    { url: `https://www.ebay.ca/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_BIN=1`,
      retailer: 'ebay-ca', display: 'eBay Canada', region: 'CA', currency: 'CAD' },
  ]

  const listings: ScrapedListing[] = []

  for (const source of internationalSources) {
    try {
      const res = await fetch(source.url, { headers: BROWSER_HEADERS })
      const html = await res.text()

      const priceMatch = html.match(/<span[^>]+class="[^"]*s-item__price[^"]*"[^>]*>(.*?)<\/span>/)
      if (priceMatch) {
        const price = parsePrice(priceMatch[1].replace(/<[^>]+>/g, ''))
        const titleMatch = html.match(/<span[^>]+role="heading"[^>]*>(.*?)<\/span>/)
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : query

        if (price && title) {
          listings.push({
            title,
            price,
            currency: source.currency,
            retailer: source.retailer,
            retailerDisplayName: source.display,
            productUrl: source.url,
            inStock: true,
            condition: 'new',
            isOfficialRetailer: false,
            dealScore: 'C',
            region: source.region,
          })
        }
      }
    } catch {}
  }

  return listings
}

// Generate AI recommendation using Claude
async function generateAiRecommendation(
  product: any,
  listings: ScrapedListing[],
  priceHistory: any[]
): Promise<any> {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
  if (!ANTHROPIC_API_KEY) return null

  const priceRange = listings.length > 0 ? {
    min: Math.min(...listings.map(l => l.price)),
    max: Math.max(...listings.map(l => l.price)),
    avg: listings.reduce((s, l) => s + l.price, 0) / listings.length,
  } : null

  const prompt = `You are a shopping expert AI. Analyze this product and provide a buy recommendation.

Product: ${product.name} by ${product.brand || 'Unknown'}
Original Price: $${product.original_price || 'Unknown'}
Current Price Range Found: ${priceRange ? `$${priceRange.min.toFixed(2)} - $${priceRange.max.toFixed(2)} (avg $${priceRange.avg.toFixed(2)})` : 'No results found'}
Number of listings found: ${listings.length}
Price History Data Points: ${priceHistory.length}

Return ONLY a JSON object:
{
  "buyNow": true/false,
  "dealRating": "excellent|good|fair|poor",
  "reasoning": "2-3 sentence explanation of why or why not to buy now",
  "bestTimeToBuy": "specific advice on when to buy if not now, null if buy now",
  "priceTrend": "rising|falling|stable",
  "savingsTip": "one specific actionable tip to save more money on this purchase"
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) return null
  const result = await response.json()
  const text = result.content[0].text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(text)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const {
      productId,
      searchQuery,
      alternativeQueries = [],
      productName,
      brand,
      originalPrice,
      userSessionId,
      includeInternational = false,
      includeRefurbished = true,
    } = await req.json()

    if (!searchQuery) {
      return new Response(JSON.stringify({ error: 'searchQuery required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch product from DB if productId provided
    let product: any = { name: productName, brand, original_price: originalPrice }
    if (productId) {
      const { data } = await supabase.from('shopping_products').select('*').eq('id', productId).single()
      if (data) product = data
    }

    // Fetch existing price history
    let priceHistory: any[] = []
    if (productId) {
      const { data } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_id', productId)
        .order('recorded_at', { ascending: true })
        .limit(90)
      priceHistory = data || []
    }

    // Run all scrapers in parallel with 10s timeout each
    const scraperPromises = [
      withTimeout(scrapeEbay(searchQuery), 10000, []),
      withTimeout(scrapeWalmart(searchQuery), 10000, []),
      withTimeout(scrapeBestBuy(searchQuery), 10000, []),
      withTimeout(scrapeAmazon(searchQuery), 10000, []),
      withTimeout(scrapeGoogleShopping(searchQuery), 10000, []),
    ]

    if (includeRefurbished) {
      scraperPromises.push(withTimeout(scrapeRefurbished(searchQuery), 10000, []))
    }
    if (includeInternational) {
      scraperPromises.push(withTimeout(scrapeInternational(searchQuery), 10000, []))
    }

    const results = await Promise.allSettled(scraperPromises)

    let allListings: ScrapedListing[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') allListings = allListings.concat(r.value)
    }

    // Deduplicate and sort by price
    const seen = new Set<string>()
    const uniqueListings = allListings.filter(l => {
      const key = `${l.retailer}-${l.price}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).sort((a, b) => a.price - b.price)

    // Calculate price statistics
    const mainListings = uniqueListings.filter(l => l.condition === 'new')
    const priceRange = mainListings.length > 0 ? {
      min: Math.min(...mainListings.map(l => l.price)),
      max: Math.max(...mainListings.map(l => l.price)),
      avg: mainListings.reduce((s, l) => s + l.price, 0) / mainListings.length,
      median: mainListings.sort((a, b) => a.price - b.price)[Math.floor(mainListings.length / 2)]?.price || 0,
    } : { min: 0, max: 0, avg: 0, median: 0 }

    // Generate AI recommendation
    const aiRecommendation = await withTimeout(
      generateAiRecommendation(product, mainListings, priceHistory),
      8000,
      {
        buyNow: mainListings.length > 0,
        dealRating: 'fair',
        reasoning: 'Analysis based on available market data.',
        priceTrend: 'stable',
        savingsTip: 'Compare prices across multiple retailers before purchasing.',
      }
    )

    // Save results to database if productId provided
    if (productId && uniqueListings.length > 0) {
      // Delete old scraped listings for this product
      await supabase.from('scraped_listings').delete().eq('product_id', productId)

      // Insert new listings
      await supabase.from('scraped_listings').insert(
        uniqueListings.map(l => ({
          product_id: productId,
          title: l.title,
          price: l.price,
          original_price: l.originalPrice,
          currency: l.currency,
          retailer: l.retailer,
          retailer_display_name: l.retailerDisplayName,
          product_url: l.productUrl,
          image_url: l.imageUrl,
          rating: l.rating,
          review_count: l.reviewCount,
          in_stock: l.inStock,
          condition: l.condition,
          return_policy: l.returnPolicy,
          shipping_info: l.shippingInfo,
          seller_name: l.sellerName,
          is_official_retailer: l.isOfficialRetailer,
          deal_score: l.dealScore,
          region: l.region,
          savings_amount: l.savingsAmount,
          savings_percent: l.savingsPercent,
        }))
      )

      // Record price history for new data points
      const historyEntries = uniqueListings.filter(l => l.condition === 'new').map(l => ({
        product_id: productId,
        retailer: l.retailerDisplayName,
        price: l.price,
        currency: l.currency,
        in_stock: l.inStock,
      }))
      if (historyEntries.length > 0) {
        await supabase.from('price_history').insert(historyEntries)
      }

      // Save AI recommendation
      if (aiRecommendation) {
        await supabase.from('ai_recommendations').upsert({
          product_id: productId,
          buy_now: aiRecommendation.buyNow,
          deal_rating: aiRecommendation.dealRating,
          reasoning: aiRecommendation.reasoning,
          best_time_to_buy: aiRecommendation.bestTimeToBuy,
          price_trend: aiRecommendation.priceTrend,
          savings_tip: aiRecommendation.savingsTip,
          generated_at: new Date().toISOString(),
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      listings: uniqueListings,
      priceRange,
      priceHistory,
      aiRecommendation,
      scrapedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('scrape-prices error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
