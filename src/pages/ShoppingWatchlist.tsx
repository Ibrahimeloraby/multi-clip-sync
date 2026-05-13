import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Package, Plus, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { WatchlistItem } from '../components/shopping/WatchlistItem'
import { AlertDialog } from '../components/shopping/AlertDialog'
import { useWatchlist } from '../hooks/useWatchlist'
import { usePriceAlerts } from '../hooks/usePriceAlerts'
import { formatDistanceToNow } from 'date-fns'
import type { WatchlistEntry } from '../lib/shopping-types'

export default function ShoppingWatchlist() {
  const navigate = useNavigate()
  const { watchlist, isLoading, removeFromWatchlist } = useWatchlist()
  const { alerts, triggeredAlerts, createAlert, deleteAlert, isCreating } = usePriceAlerts()

  const [alertTarget, setAlertTarget] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts'>('watchlist')

  const handleViewResults = (entry: WatchlistEntry) => {
    navigate('/shop/results', {
      state: {
        product: {
          name: entry.product.name,
          brand: entry.product.brand || '',
          price: entry.product.original_price || 0,
          currency: entry.product.currency || 'USD',
          description: '',
          category: entry.product.category || '',
          specs: entry.product.specs || {},
          searchQuery: entry.product.name,
          alternativeSearchQueries: [],
        },
        productId: entry.productId,
      },
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/shop')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-foreground flex-1">My Watchlist</h1>
          <Button size="sm" className="gap-2" onClick={() => navigate('/shop')}>
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Triggered alerts banner */}
        {triggeredAlerts.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold text-green-800">
                {triggeredAlerts.length} Price Alert
                {triggeredAlerts.length !== 1 ? 's' : ''} Triggered!
              </h2>
            </div>
            {triggeredAlerts.map((alert: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm bg-white rounded-xl p-3 border border-green-100"
              >
                <div>
                  <p className="font-medium text-foreground">{alert.shopping_products?.name}</p>
                  <p className="text-muted-foreground text-xs">
                    Triggered{' '}
                    {formatDistanceToNow(new Date(alert.last_triggered_at), { addSuffix: true })}
                    {alert.trigger_count > 1 && ` · ${alert.trigger_count} times total`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleViewResults({
                      id: '',
                      productId: alert.product_id,
                      addedAt: '',
                      product: alert.shopping_products || { id: alert.product_id, name: '' },
                    } as WatchlistEntry)
                  }
                >
                  View Deal
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'watchlist'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            Watchlist ({watchlist.length})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'alerts'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            Active Alerts ({alerts.length})
          </button>
        </div>

        {/* Watchlist tab */}
        {activeTab === 'watchlist' && (
          <div className="space-y-3">
            {isLoading &&
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
              ))}
            {!isLoading && watchlist.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h2 className="font-semibold text-lg text-foreground">Your watchlist is empty</h2>
                <p className="text-sm mt-1">Search for products and save them to track prices</p>
                <Button className="mt-5" onClick={() => navigate('/shop')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Product
                </Button>
              </div>
            )}
            {watchlist.map(entry => (
              <WatchlistItem
                key={entry.id}
                entry={entry}
                onRemove={removeFromWatchlist}
                onSetAlert={productId => setAlertTarget(productId)}
                onViewResults={handleViewResults}
              />
            ))}
          </div>
        )}

        {/* Alerts tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {alerts.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h2 className="font-semibold text-lg text-foreground">No active alerts</h2>
                <p className="text-sm mt-1">Set price alerts from any product's results page</p>
              </div>
            )}
            {alerts.map(alert => (
              <div
                key={alert.id}
                className="bg-card rounded-2xl border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm text-foreground">Price Alert Active</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive -mt-1 -mr-1"
                    onClick={() => deleteAlert(alert.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {alert.targetPrice && (
                    <div className="bg-muted/50 rounded-xl p-2.5">
                      <p className="text-xs text-muted-foreground">Target Price</p>
                      <p className="font-bold text-foreground">${alert.targetPrice.toFixed(2)}</p>
                    </div>
                  )}
                  {alert.percentageDropThreshold && (
                    <div className="bg-muted/50 rounded-xl p-2.5">
                      <p className="text-xs text-muted-foreground">Drop Threshold</p>
                      <p className="font-bold text-foreground">
                        {alert.percentageDropThreshold}% off
                      </p>
                    </div>
                  )}
                  <div className="bg-muted/50 rounded-xl p-2.5">
                    <p className="text-xs text-muted-foreground">Watching for</p>
                    <p className="font-bold text-foreground">{alert.watchDurationDays} days</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-2.5">
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p className="font-bold text-foreground">
                      {formatDistanceToNow(new Date(alert.expiresAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {alert.notifyOnBackInStock && (
                    <span className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5">
                      <AlertCircle className="w-3 h-3" /> Back in stock
                    </span>
                  )}
                  {alert.notifyOnCoupon && (
                    <span className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5">
                      <AlertCircle className="w-3 h-3" /> New coupons
                    </span>
                  )}
                  {alert.alertEmail && (
                    <span className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5">
                      📧 {alert.alertEmail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Alert dialog for setting alert from watchlist */}
      {alertTarget && (
        <AlertDialog
          open={!!alertTarget}
          onClose={() => setAlertTarget(null)}
          onSave={alert => {
            createAlert({ ...alert, productId: alertTarget })
            setAlertTarget(null)
          }}
          productId={alertTarget}
          isSaving={isCreating}
        />
      )}
    </div>
  )
}
