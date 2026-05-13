import { Package, Tag, Cpu, ShoppingBag } from 'lucide-react'
import type { ExtractedProduct } from '../../lib/shopping-types'
import { Badge } from '../ui/badge'

interface Props {
  product: ExtractedProduct
  className?: string
}

export function ProductInfo({ product, className }: Props) {
  const hasSpecs = Object.keys(product.specs || {}).length > 0

  return (
    <div
      className={`bg-card rounded-2xl border border-border p-5 space-y-4 ${className || ''}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-bold text-foreground text-lg leading-tight">{product.name}</h2>
              {product.brand && (
                <p className="text-muted-foreground text-sm mt-0.5">by {product.brand}</p>
              )}
            </div>
            {product.price > 0 && (
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-foreground">
                  ${product.price.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Listed price</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-2">
        {product.category && (
          <Badge variant="secondary" className="gap-1">
            <ShoppingBag className="w-3 h-3" />
            {product.category}
          </Badge>
        )}
        {product.model && (
          <Badge variant="outline" className="gap-1">
            <Cpu className="w-3 h-3" />
            {product.model}
          </Badge>
        )}
        {product.retailer && (
          <Badge variant="outline" className="gap-1">
            <Tag className="w-3 h-3" />
            {product.retailer}
          </Badge>
        )}
      </div>

      {/* Description */}
      {product.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
      )}

      {/* Specs grid */}
      {hasSpecs && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Specifications
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {Object.entries(product.specs).map(([key, value]) => (
              <div key={key} className="flex items-start gap-1.5 text-sm">
                <span className="text-muted-foreground shrink-0">{key}:</span>
                <span className="text-foreground font-medium truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
