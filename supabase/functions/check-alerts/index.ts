import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const body = req.method === 'POST' ? await req.json() : {}
    const { userSessionId } = body

    // Fetch active, non-expired alerts
    let query = supabase
      .from('price_alerts')
      .select(`
        *,
        shopping_products (*)
      `)
      .eq('active', true)
      .gt('expires_at', new Date().toISOString())

    if (userSessionId) {
      query = query.eq('user_session_id', userSessionId)
    }

    const { data: alerts, error } = await query
    if (error) throw error

    const triggered: any[] = []
    const updates: any[] = []

    for (const alert of alerts || []) {
      const product = alert.shopping_products
      if (!product) continue

      // Get the latest price for this product
      const { data: latestPrices } = await supabase
        .from('price_history')
        .select('price, retailer, recorded_at')
        .eq('product_id', alert.product_id)
        .order('recorded_at', { ascending: false })
        .limit(10)

      if (!latestPrices || latestPrices.length === 0) continue

      const currentBestPrice = Math.min(...latestPrices.map(p => p.price))
      const originalPrice = product.original_price

      let shouldTrigger = false
      let triggerReason = ''

      // Check target price threshold
      if (alert.target_price && currentBestPrice <= alert.target_price) {
        shouldTrigger = true
        triggerReason = `Price dropped to $${currentBestPrice.toFixed(2)} (target: $${alert.target_price})`
      }

      // Check percentage drop threshold
      if (alert.percentage_drop_threshold && originalPrice) {
        const dropPercent = ((originalPrice - currentBestPrice) / originalPrice) * 100
        if (dropPercent >= alert.percentage_drop_threshold) {
          shouldTrigger = true
          triggerReason = `Price dropped ${dropPercent.toFixed(1)}% (threshold: ${alert.percentage_drop_threshold}%)`
        }
      }

      // Check back in stock (from scraped_listings)
      if (alert.notify_on_back_in_stock) {
        const { data: stockCheck } = await supabase
          .from('scraped_listings')
          .select('in_stock')
          .eq('product_id', alert.product_id)
          .eq('in_stock', true)
          .limit(1)

        if (stockCheck && stockCheck.length > 0) {
          shouldTrigger = true
          triggerReason = 'Product is back in stock'
        }
      }

      // Check for new coupons
      if (alert.notify_on_coupon) {
        const { data: newCoupons } = await supabase
          .from('coupons')
          .select('code, discount_value')
          .eq('product_id', alert.product_id)
          .gt('found_at', alert.last_triggered_at || alert.created_at)
          .limit(1)

        if (newCoupons && newCoupons.length > 0) {
          shouldTrigger = true
          triggerReason = `New coupon found: ${newCoupons[0].code} (${newCoupons[0].discount_value}% off)`
        }
      }

      if (shouldTrigger) {
        triggered.push({
          alertId: alert.id,
          productId: alert.product_id,
          productName: product.name,
          currentPrice: currentBestPrice,
          originalPrice,
          triggerReason,
          alertEmail: alert.alert_email,
          userSessionId: alert.user_session_id,
        })

        updates.push({
          id: alert.id,
          last_triggered_at: new Date().toISOString(),
          trigger_count: (alert.trigger_count || 0) + 1,
        })
      }
    }

    // Update triggered alerts
    for (const update of updates) {
      await supabase
        .from('price_alerts')
        .update({
          last_triggered_at: update.last_triggered_at,
          trigger_count: update.trigger_count,
        })
        .eq('id', update.id)
    }

    return new Response(JSON.stringify({
      success: true,
      checked: alerts?.length || 0,
      triggered: triggered.length,
      alerts: triggered,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
