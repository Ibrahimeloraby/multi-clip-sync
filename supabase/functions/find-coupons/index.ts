import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

// Search retailer's coupons page
async function scrapeRetailerCoupons(retailer: string): Promise<any[]> {
  const couponSites: Record<string, string> = {
    walmart: 'https://www.retailmenot.com/view/walmart.com',
    amazon: 'https://www.retailmenot.com/view/amazon.com',
    bestbuy: 'https://www.retailmenot.com/view/bestbuy.com',
    target: 'https://www.retailmenot.com/view/target.com',
  }

  const url = couponSites[retailer.toLowerCase()]
  if (!url) return []

  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS })
    const html = await res.text()

    const coupons: any[] = []

    // RetailMeNot coupon codes
    const codeRegex = /data-code="([^"]+)"|class="[^"]*code[^"]*"[^>]*>([^<]+)<\/[^>]+>/g
    const discountRegex = /(\d+)%\s*off/gi

    let match
    const codes = new Set<string>()

    while ((match = codeRegex.exec(html)) !== null) {
      const code = (match[1] || match[2] || '').trim().toUpperCase()
      if (code && code.length > 2 && code.length < 20 && !codes.has(code)) {
        codes.add(code)

        // Find associated discount
        const discountMatch = discountRegex.exec(html)
        const discount = discountMatch ? parseInt(discountMatch[1]) : 10

        coupons.push({
          code,
          discountType: 'percentage',
          discountValue: discount,
          verified: false,
          retailer,
        })
      }
      if (coupons.length >= 5) break
    }

    return coupons
  } catch {
    return []
  }
}

// Use Claude to find coupon codes via web knowledge
async function findCouponsWithAI(productName: string, brand: string, retailer: string): Promise<any[]> {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
  if (!ANTHROPIC_API_KEY) return []

  const prompt = `As a coupon expert, provide currently active or commonly valid coupon codes for purchasing "${productName}" by "${brand}" from ${retailer}.

Return ONLY a JSON array of coupon objects (max 5):
[
  {
    "code": "COUPON10",
    "discountType": "percentage",
    "discountValue": 10,
    "description": "10% off sitewide",
    "verified": false,
    "confidence": "low|medium|high"
  }
]

If you don't know of specific current codes, suggest commonly used patterns or seasonal codes that might work. Return [] if truly nothing applicable.`

  try {
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

    const result = await response.json()
    const text = result.content[0].text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    return JSON.parse(text) || []
  } catch {
    return []
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { productId, productName, brand, retailers = [] } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if we have cached coupons less than 6 hours old
    if (productId) {
      const { data: cached } = await supabase
        .from('coupons')
        .select('*')
        .eq('product_id', productId)
        .gt('found_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())

      if (cached && cached.length > 0) {
        return new Response(JSON.stringify({ success: true, coupons: cached, fromCache: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Scrape and AI-find coupons in parallel
    const retailerList = retailers.length > 0 ? retailers : ['walmart', 'amazon', 'bestbuy', 'target']

    const couponPromises = [
      ...retailerList.map(r => scrapeRetailerCoupons(r)),
      findCouponsWithAI(productName || '', brand || '', retailerList[0] || 'amazon'),
    ]

    const results = await Promise.allSettled(couponPromises)
    let allCoupons: any[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') allCoupons = allCoupons.concat(r.value)
    }

    // Deduplicate by code
    const seen = new Set<string>()
    const uniqueCoupons = allCoupons.filter(c => {
      if (seen.has(c.code)) return false
      seen.add(c.code)
      return true
    })

    // Save to DB
    if (productId && uniqueCoupons.length > 0) {
      await supabase.from('coupons').delete().eq('product_id', productId)
      await supabase.from('coupons').insert(
        uniqueCoupons.map(c => ({
          product_id: productId,
          retailer: c.retailer || retailers[0] || 'general',
          code: c.code,
          discount_type: c.discountType || 'percentage',
          discount_value: c.discountValue || 0,
          verified: c.verified || false,
        }))
      )
    }

    return new Response(JSON.stringify({ success: true, coupons: uniqueCoupons }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
