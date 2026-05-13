import { supabase } from '../integrations/supabase/client'
import type {
  ExtractedProduct,
  ScrapedListing,
  PricePoint,
  CouponResult,
  AiRecommendation,
  PriceRange,
  SearchResult,
  PriceAlert,
  WatchlistEntry,
} from './shopping-types'

const SESSION_KEY = 'shopping_session_id'

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export async function extractProductFromImage(
  imageBase64: string,
  mediaType: string = 'image/jpeg',
  userPrice?: number
): Promise<{ product: ExtractedProduct; productId?: string }> {
  const { data, error } = await supabase.functions.invoke('extract-product', {
    body: {
      imageBase64,
      mediaType,
      userPrice,
      userSessionId: getSessionId(),
    },
  })
  if (error) throw error
  if (!data.success) throw new Error(data.error || 'Extraction failed')
  return { product: data.product, productId: data.productId }
}

export async function scrapePrices(params: {
  productId?: string
  searchQuery: string
  alternativeQueries?: string[]
  productName?: string
  brand?: string
  originalPrice?: number
  includeInternational?: boolean
  includeRefurbished?: boolean
}): Promise<{
  listings: ScrapedListing[]
  priceRange: PriceRange
  priceHistory: PricePoint[]
  aiRecommendation: AiRecommendation
  scrapedAt: string
}> {
  const { data, error } = await supabase.functions.invoke('scrape-prices', {
    body: {
      ...params,
      userSessionId: getSessionId(),
    },
  })
  if (error) throw error
  if (!data.success) throw new Error(data.error || 'Scraping failed')
  return data
}

export async function findCoupons(params: {
  productId?: string
  productName: string
  brand?: string
  retailers?: string[]
}): Promise<CouponResult[]> {
  const { data, error } = await supabase.functions.invoke('find-coupons', {
    body: params,
  })
  if (error) throw error
  if (!data.success) throw new Error(data.error)
  return data.coupons || []
}

export async function checkAlerts(): Promise<any[]> {
  const { data, error } = await supabase.functions.invoke('check-alerts', {
    body: { userSessionId: getSessionId() },
  })
  if (error) throw error
  return data.alerts || []
}

export async function addToWatchlist(productId: string, notes?: string): Promise<void> {
  const { error } = await supabase.from('watchlist').upsert({
    user_session_id: getSessionId(),
    product_id: productId,
    notes,
  })
  if (error) throw error
}

export async function removeFromWatchlist(productId: string): Promise<void> {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_session_id', getSessionId())
    .eq('product_id', productId)
  if (error) throw error
}

export async function getWatchlist(): Promise<WatchlistEntry[]> {
  const { data, error } = await supabase
    .from('watchlist')
    .select(
      `
      id,
      product_id,
      added_at,
      notes,
      shopping_products (
        id, name, brand, category, original_price, currency, specs
      )
    `
    )
    .eq('user_session_id', getSessionId())
    .order('added_at', { ascending: false })

  if (error) throw error

  return (data || []).map((item: any) => ({
    id: item.id,
    productId: item.product_id,
    addedAt: item.added_at,
    notes: item.notes,
    product: (item.shopping_products as any) || {},
  }))
}

export async function setAlert(
  alert: Omit<PriceAlert, 'id' | 'createdAt' | 'lastTriggeredAt' | 'triggerCount'>
): Promise<PriceAlert> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + alert.watchDurationDays)

  const { data, error } = await supabase
    .from('price_alerts')
    .upsert({
      user_session_id: getSessionId(),
      product_id: alert.productId,
      target_price: alert.targetPrice || null,
      percentage_drop_threshold: alert.percentageDropThreshold || null,
      watch_duration_days: alert.watchDurationDays,
      expires_at: expiresAt.toISOString(),
      active: true,
      notify_on_back_in_stock: alert.notifyOnBackInStock,
      notify_on_coupon: alert.notifyOnCoupon,
      alert_email: alert.alertEmail || null,
    })
    .select()
    .single()

  if (error) throw error
  return mapAlertFromDB(data)
}

export async function getAlerts(productId?: string): Promise<PriceAlert[]> {
  let query = supabase
    .from('price_alerts')
    .select('*')
    .eq('user_session_id', getSessionId())
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (productId) query = query.eq('product_id', productId)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapAlertFromDB)
}

export async function deleteAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from('price_alerts')
    .update({ active: false })
    .eq('id', alertId)
  if (error) throw error
}

export async function getTriggeredAlerts(): Promise<any[]> {
  const { data, error } = await supabase
    .from('price_alerts')
    .select('*, shopping_products(name, brand)')
    .eq('user_session_id', getSessionId())
    .not('last_triggered_at', 'is', null)
    .order('last_triggered_at', { ascending: false })
    .limit(20)

  if (error) return []
  return data || []
}

function mapAlertFromDB(row: any): PriceAlert {
  return {
    id: row.id,
    userSessionId: row.user_session_id,
    productId: row.product_id,
    targetPrice: row.target_price,
    percentageDropThreshold: row.percentage_drop_threshold,
    watchDurationDays: row.watch_duration_days,
    expiresAt: row.expires_at,
    active: row.active,
    notifyOnBackInStock: row.notify_on_back_in_stock,
    notifyOnCoupon: row.notify_on_coupon,
    alertEmail: row.alert_email,
    createdAt: row.created_at,
    lastTriggeredAt: row.last_triggered_at,
    triggerCount: row.trigger_count || 0,
  }
}

export async function getPriceHistory(productId: string): Promise<PricePoint[]> {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('product_id', productId)
    .order('recorded_at', { ascending: true })
    .limit(180)

  if (error) throw error
  return data || []
}
