import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Building2, Plus, Search, Globe, Mail, TrendingUp,
  FileText, ExternalLink, ChevronRight, Tag,
} from 'lucide-react';
import { MOCK_COMPANIES, MOCK_DEALS, MOCK_PROPOSALS } from '@/lib/b2b-data';
import type { Company, CompanySize } from '@/lib/b2b-types';
import { toast } from 'sonner';

const SIZE_LABELS: Record<CompanySize, string> = {
  startup: 'Startup',
  sme: 'SME',
  enterprise: 'Enterprise',
};

const SIZE_COLORS: Record<CompanySize, string> = {
  startup: 'bg-emerald-100 text-emerald-700',
  sme: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-violet-100 text-violet-700',
};

const TAG_COLORS: Record<string, string> = {
  hot: 'bg-red-100 text-red-700',
  strategic: 'bg-purple-100 text-purple-700',
  renewal: 'bg-amber-100 text-amber-700',
  expansion: 'bg-green-100 text-green-700',
  new: 'bg-blue-100 text-blue-700',
};

function fmtRevenue(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [search, setSearch] = useState('');
  const [filterSize, setFilterSize] = useState<string>('all');
  const [selected, setSelected] = useState<Company | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = companies.filter(c => {
    const matchesSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase());
    const matchesSize = filterSize === 'all' || c.size === filterSize;
    return matchesSearch && matchesSize;
  });

  function addCompany(company: Company) {
    setCompanies(prev => [...prev, company]);
    setShowAdd(false);
    toast.success(`${company.name} added to your CRM`);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-violet-600" />
            Companies
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {companies.length} companies · {companies.filter(c => c.size === 'enterprise').length} enterprise
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4" /> Add Company
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(['startup', 'sme', 'enterprise'] as CompanySize[]).map(size => (
          <Card key={size} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className={SIZE_COLORS[size]}>{SIZE_LABELS[size]}</Badge>
                <span className="text-2xl font-bold text-slate-900">
                  {companies.filter(c => c.size === size).length}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Total ARR: {fmtRevenue(companies.filter(c => c.size === size).reduce((s, c) => s + c.annualRevenue, 0))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search companies, contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'startup', 'sme', 'enterprise'].map(s => (
            <button
              key={s}
              onClick={() => setFilterSize(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
                ${filterSize === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Company Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3">Company</th>
              <th className="text-left px-5 py-3">Contact</th>
              <th className="text-left px-5 py-3">Industry</th>
              <th className="text-left px-5 py-3">ARR</th>
              <th className="text-left px-5 py-3">Deals</th>
              <th className="text-left px-5 py-3">Tags</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(company => {
              const deals = MOCK_DEALS.filter(d => d.companyId === company.id);
              const proposals = MOCK_PROPOSALS.filter(p => p.companyId === company.id);
              return (
                <tr
                  key={company.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelected(company)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {company.logo}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{company.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {company.website}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-slate-800">{company.contactName}</div>
                    <div className="text-xs text-slate-400">{company.contactTitle}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-slate-700">{company.industry}</div>
                    <Badge className={`text-xs mt-1 ${SIZE_COLORS[company.size]}`}>{SIZE_LABELS[company.size]}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-semibold text-slate-800">{fmtRevenue(company.annualRevenue)}</div>
                    <div className="text-xs text-slate-400">{company.country}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <TrendingUp className="w-3 h-3 text-violet-500" />
                      {deals.length} deal{deals.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <FileText className="w-3 h-3" />
                      {proposals.length} proposal{proposals.length !== 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {company.tags.map(tag => (
                        <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] ?? 'bg-slate-100 text-slate-600'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">No companies found</div>
        )}
      </div>

      {/* Company Detail */}
      {selected && (
        <CompanyDetailModal
          company={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Add Company */}
      {showAdd && (
        <AddCompanyModal onClose={() => setShowAdd(false)} onAdd={addCompany} />
      )}
    </div>
  );
}

function CompanyDetailModal({ company, onClose }: { company: Company; onClose: () => void }) {
  const deals = MOCK_DEALS.filter(d => d.companyId === company.id);
  const proposals = MOCK_PROPOSALS.filter(p => p.companyId === company.id);
  const totalDealValue = deals.reduce((s, d) => s + d.value, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold">
              {company.logo}
            </div>
            <div>
              {company.name}
              <div className="text-sm font-normal text-slate-500 mt-0.5">{company.industry} · {company.country}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Key Info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-violet-700">{fmtRevenue(company.annualRevenue)}</div>
              <div className="text-xs text-slate-500">Annual Revenue</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-slate-900">{deals.length}</div>
              <div className="text-xs text-slate-500">Active Deals</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-600">
                {totalDealValue > 0 ? `$${(totalDealValue / 1000).toFixed(0)}K` : '—'}
              </div>
              <div className="text-xs text-slate-500">Pipeline Value</div>
            </div>
          </div>

          {/* Contact */}
          <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl">
            <div>
              <div className="font-semibold text-slate-900">{company.contactName}</div>
              <div className="text-sm text-slate-500">{company.contactTitle}</div>
              <div className="flex items-center gap-1 text-sm text-violet-600 mt-1">
                <Mail className="w-3.5 h-3.5" />
                {company.contactEmail}
              </div>
            </div>
            <Button size="sm" variant="outline" className="gap-1">
              <Mail className="w-3.5 h-3.5" /> Reach Out
            </Button>
          </div>

          {/* Tags */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tags</div>
            <div className="flex flex-wrap gap-2">
              {company.tags.map(tag => (
                <span key={tag} className={`text-sm px-3 py-1 rounded-full font-medium ${TAG_COLORS[tag] ?? 'bg-slate-100 text-slate-600'}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Deals */}
          {deals.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Deals</div>
              <div className="space-y-2">
                {deals.map(deal => (
                  <div key={deal.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200">
                    <div className="text-sm font-medium text-slate-800 truncate flex-1">{deal.title}</div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-semibold">${deal.value.toLocaleString()}</span>
                      <Badge className="text-xs bg-slate-100 text-slate-600 capitalize">{deal.stage.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposals */}
          {proposals.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Proposals</div>
              <div className="space-y-2">
                {proposals.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200">
                    <div className="text-sm font-medium text-slate-800 truncate flex-1">{p.title}</div>
                    <Badge className={`text-xs capitalize ${
                      p.status === 'approved' ? 'bg-green-100 text-green-700' :
                      p.status === 'viewed' ? 'bg-violet-100 text-violet-700' :
                      p.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddCompanyModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Company) => void }) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState<CompanySize>('sme');
  const [website, setWebsite] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [country, setCountry] = useState('');
  const [revenue, setRevenue] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onAdd({
      id: `c${Date.now()}`,
      name,
      industry,
      size,
      website,
      logo: name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
      contactName,
      contactEmail,
      contactTitle,
      country,
      annualRevenue: parseFloat(revenue) * 1_000_000 || 0,
      tags: ['new'],
      createdAt: new Date().toISOString().split('T')[0],
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-violet-600" /> Add Company
          </DialogTitle>
          <DialogDescription>Add a new B2B company to your CRM</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Company Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Industry</Label>
              <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Manufacturing" required />
            </div>
            <div>
              <Label>Company Size</Label>
              <Select value={size} onValueChange={v => setSize(v as CompanySize)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="sme">SME</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Website</Label>
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="company.com" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="USA" />
            </div>
            <div>
              <Label>Annual Revenue ($M)</Label>
              <Input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} placeholder="e.g. 50" />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Primary Contact</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Full Name</Label>
                <Input value={contactName} onChange={e => setContactName(e.target.value)} required />
              </div>
              <div>
                <Label>Title</Label>
                <Input value={contactTitle} onChange={e => setContactTitle(e.target.value)} placeholder="e.g. CTO" />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} required />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700">Add Company</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
