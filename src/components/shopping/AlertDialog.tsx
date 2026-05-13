import { useState } from 'react'
import { Bell, Mail, TrendingDown, RotateCcw, Tag, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Slider } from '../ui/slider'
import type { PriceAlert } from '../../lib/shopping-types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'lastTriggeredAt' | 'triggerCount'>) => void
  productId: string
  currentPrice?: number
  isSaving?: boolean
  existingAlert?: PriceAlert | null
}

export function AlertDialog({
  open,
  onClose,
  onSave,
  productId,
  currentPrice,
  isSaving,
  existingAlert,
}: Props) {
  const [targetPrice, setTargetPrice] = useState(existingAlert?.targetPrice?.toString() || '')
  const [percentageDrop, setPercentageDrop] = useState(
    existingAlert?.percentageDropThreshold || 10
  )
  const [usePercentage, setUsePercentage] = useState(!existingAlert?.targetPrice)
  const [watchDays, setWatchDays] = useState(existingAlert?.watchDurationDays || 30)
  const [email, setEmail] = useState(existingAlert?.alertEmail || '')
  const [notifyBackInStock, setNotifyBackInStock] = useState(
    existingAlert?.notifyOnBackInStock || false
  )
  const [notifyOnCoupon, setNotifyOnCoupon] = useState(existingAlert?.notifyOnCoupon || false)

  const estimatedPrice = currentPrice ? currentPrice * (1 - percentageDrop / 100) : null

  const handleSave = () => {
    onSave({
      userSessionId: '',
      productId,
      targetPrice: !usePercentage ? parseFloat(targetPrice) || null : null,
      percentageDropThreshold: usePercentage ? percentageDrop : null,
      watchDurationDays: watchDays,
      expiresAt: '',
      active: true,
      notifyOnBackInStock,
      notifyOnCoupon,
      alertEmail: email || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Set Price Alert
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Alert type toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setUsePercentage(false)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                !usePercentage ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
              }`}
            >
              Target Price
            </button>
            <button
              onClick={() => setUsePercentage(true)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                usePercentage ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
              }`}
            >
              % Drop
            </button>
          </div>

          {/* Price input */}
          {!usePercentage ? (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                Alert me when price drops to
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={e => setTargetPrice(e.target.value)}
                  className="pl-7"
                />
              </div>
              {currentPrice && (
                <p className="text-xs text-muted-foreground">
                  Current best price: <strong>${currentPrice.toFixed(2)}</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                Alert me when price drops by {percentageDrop}%
              </Label>
              <Slider
                value={[percentageDrop]}
                onValueChange={([v]) => setPercentageDrop(v)}
                min={5}
                max={60}
                step={5}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5%</span>
                {estimatedPrice && (
                  <span className="text-primary font-medium">~${estimatedPrice.toFixed(2)}</span>
                )}
                <span>60%</span>
              </div>
            </div>
          )}

          {/* Watch duration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Watch for {watchDays} days
            </Label>
            <Slider
              value={[watchDays]}
              onValueChange={([v]) => setWatchDays(v)}
              min={7}
              max={90}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>7 days</span>
              <span>90 days</span>
            </div>
          </div>

          {/* Extra notifications */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-xl">
            <p className="text-sm font-medium">Also notify me when:</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
                Back in stock
              </div>
              <Switch checked={notifyBackInStock} onCheckedChange={setNotifyBackInStock} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-muted-foreground" />
                New coupon found
              </div>
              <Switch checked={notifyOnCoupon} onCheckedChange={setNotifyOnCoupon} />
            </div>
          </div>

          {/* Email (optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              Email alerts (optional)
            </Label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : 'Set Alert'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
