import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Package, Plus, Check, Edit2, DollarSign,
  Users, Zap, BarChart3, Tag,
} from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/b2b-data';
import type { Product, PricingModel } from '@/lib/b2b-types';
import { toast } from 'sonner';

const CATEGORY_COLORS: Record<string, string> = {
  Platform: 'bg-violet-100 text-violet-700',
  'AI Add-on': 'bg-amber-100 text-amber-700',
  Module: 'bg-blue-100 text-blue-700',
};

const PRICING_LABELS: Record<PricingModel, string> = {
  fixed: 'Fixed Annual',
  per_seat: 'Per Seat / Mo',
  usage: 'Usage-based',
  custom: 'Custom Quote',
};

const PRICING_ICONS: Record<PricingModel, React.ReactNode> = {
  fixed: <DollarSign className="w-3.5 h-3.5" />,
  per_seat: <Users className="w-3.5 h-3.5" />,
  usage: <Zap className="w-3.5 h-3.5" />,
  custom: <BarChart3 className="w-3.5 h-3.5" />,
};

function fmtPrice(p: Product) {
  if (p.pricingModel === 'custom') return 'Custom';
  if (p.pricingModel === 'per_seat') return `$${p.price}/seat/mo`;
  return `$${p.price.toLocaleString()}/yr`;
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = products.filter(p => {
    const matchesCat = filterCategory === 'all' || p.category === filterCategory;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  function toggleActive(id: string) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  }

  function saveProduct(product: Product) {
    if (editing) {
      setProducts(prev => prev.map(p => p.id === product.id ? product : p));
      toast.success('Product updated');
    } else {
      setProducts(prev => [...prev, product]);
      toast.success('Product added to catalog');
    }
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-violet-600" />
            Product Catalog
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {products.filter(p => p.isActive).length} active products · used in proposals and deals
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Products', value: products.length, color: 'text-slate-700' },
          { label: 'Active', value: products.filter(p => p.isActive).length, color: 'text-green-600' },
          { label: 'AI-Powered Add-ons', value: products.filter(p => p.category === 'AI Add-on').length, color: 'text-violet-600' },
        ].map(s => (
          <Card key={s.label} className="border-slate-200">
            <CardContent className="p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
                ${filterCategory === cat
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(product => (
          <Card
            key={product.id}
            className={`border-slate-200 transition-all ${!product.isActive ? 'opacity-60' : 'hover:shadow-md'}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge className={`text-xs mb-2 ${CATEGORY_COLORS[product.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {product.category}
                  </Badge>
                  <h3 className="font-semibold text-slate-900">{product.name}</h3>
                </div>
                <Switch
                  checked={product.isActive}
                  onCheckedChange={() => toggleActive(product.id)}
                  className="flex-shrink-0"
                />
              </div>

              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{product.description}</p>

              {/* Pricing */}
              <div className="flex items-center gap-2 mb-4 bg-slate-50 rounded-lg px-3 py-2">
                <div className="text-slate-400">{PRICING_ICONS[product.pricingModel]}</div>
                <div>
                  <div className="text-lg font-bold text-slate-900">{fmtPrice(product)}</div>
                  <div className="text-xs text-slate-400">{PRICING_LABELS[product.pricingModel]}</div>
                </div>
                {product.minSeats && (
                  <div className="ml-auto text-xs text-slate-400">Min {product.minSeats} seats</div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-1.5 mb-4">
                {product.features.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
                {product.features.length > 4 && (
                  <li className="text-xs text-slate-400 pl-5">+{product.features.length - 4} more features</li>
                )}
              </ul>

              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1"
                onClick={() => { setEditing(product); setShowForm(true); }}
              >
                <Edit2 className="w-3 h-3" /> Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">No products match your filter</div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <ProductFormModal
          product={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={saveProduct}
        />
      )}
    </div>
  );
}

function ProductFormModal({
  product, onClose, onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [pricingModel, setPricingModel] = useState<PricingModel>(product?.pricingModel ?? 'fixed');
  const [category, setCategory] = useState(product?.category ?? 'Platform');
  const [featuresText, setFeaturesText] = useState(product?.features.join('\n') ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: product?.id ?? `p${Date.now()}`,
      name,
      description,
      price: parseFloat(price) || 0,
      currency: 'USD',
      pricingModel,
      category,
      features: featuresText.split('\n').map(s => s.trim()).filter(Boolean),
      isActive: product?.isActive ?? true,
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-violet-600" />
            {product ? 'Edit Product' : 'Add Product'}
          </DialogTitle>
          <DialogDescription>Define your product or service for use in proposals</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div>
            <Label>Product Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Enterprise Suite" required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Short description..." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Pricing Model</Label>
              <Select value={pricingModel} onValueChange={v => setPricingModel(v as PricingModel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Annual</SelectItem>
                  <SelectItem value="per_seat">Per Seat</SelectItem>
                  <SelectItem value="usage">Usage-based</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Platform">Platform</SelectItem>
                <SelectItem value="AI Add-on">AI Add-on</SelectItem>
                <SelectItem value="Module">Module</SelectItem>
                <SelectItem value="Service">Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Features (one per line)</Label>
            <Textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={4} placeholder="Unlimited users&#10;API access&#10;Dedicated support" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
              {product ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
