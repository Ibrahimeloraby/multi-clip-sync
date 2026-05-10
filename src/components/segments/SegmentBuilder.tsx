import React, { useState } from 'react'
import { Plus, Trash2, Users, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { mockCustomers } from '@/lib/mockData'

type LogicOperator = 'AND' | 'OR'
type RuleOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'contains' | 'not_eq'

interface Rule {
  id: string
  field: string
  operator: RuleOperator
  value: string
}

const AVAILABLE_FIELDS = [
  { value: 'churn_score', label: 'Churn Score', type: 'number', hint: '0.0 – 1.0' },
  { value: 'clv_score', label: 'CLV Score ($)', type: 'number', hint: 'USD' },
  { value: 'total_revenue', label: 'Total Revenue ($)', type: 'number', hint: 'USD' },
  { value: 'transaction_count', label: 'Transaction Count', type: 'number', hint: 'integer' },
  { value: 'days_since_last_event', label: 'Days Since Last Event', type: 'number', hint: 'days' },
  { value: 'rfm_segment', label: 'RFM Segment', type: 'string', hint: 'e.g. Champions' },
  { value: 'channel', label: 'Primary Channel', type: 'string', hint: 'web | mobile | email' },
  { value: 'country', label: 'Country', type: 'string', hint: 'US, GB, DE…' },
  { value: 'rfm_recency', label: 'RFM Recency Score', type: 'number', hint: '1–5' },
  { value: 'rfm_frequency', label: 'RFM Frequency Score', type: 'number', hint: '1–5' },
  { value: 'rfm_monetary', label: 'RFM Monetary Score', type: 'number', hint: '1–5' },
]

const NUMBER_OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'eq', label: '=' },
]

const STRING_OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: 'eq', label: 'is' },
  { value: 'not_eq', label: 'is not' },
  { value: 'contains', label: 'contains' },
]

function estimateCount(rules: Rule[], logic: LogicOperator): number {
  if (rules.length === 0) return mockCustomers.length

  const matchCustomer = (customer: typeof mockCustomers[0]) => {
    const results = rules.map((rule) => {
      const rawValue = (customer as Record<string, unknown>)[rule.field]
      const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue))
      const ruleValue = parseFloat(rule.value)

      if (!isNaN(numValue) && !isNaN(ruleValue)) {
        switch (rule.operator) {
          case 'gte': return numValue >= ruleValue
          case 'lte': return numValue <= ruleValue
          case 'gt': return numValue > ruleValue
          case 'lt': return numValue < ruleValue
          case 'eq': return numValue === ruleValue
          default: return false
        }
      }

      const strValue = String(rawValue ?? '').toLowerCase()
      const ruleStr = rule.value.toLowerCase()
      switch (rule.operator) {
        case 'eq': return strValue === ruleStr
        case 'not_eq': return strValue !== ruleStr
        case 'contains': return strValue.includes(ruleStr)
        default: return false
      }
    })

    return logic === 'AND' ? results.every(Boolean) : results.some(Boolean)
  }

  return mockCustomers.filter(matchCustomer).length
}

interface SegmentBuilderProps {
  onSave?: (name: string, rules: Rule[], logic: LogicOperator) => void
  initialName?: string
  initialRules?: Rule[]
}

export function SegmentBuilder({ onSave, initialName = '', initialRules = [] }: SegmentBuilderProps) {
  const [name, setName] = useState(initialName)
  const [logic, setLogic] = useState<LogicOperator>('AND')
  const [rules, setRules] = useState<Rule[]>(
    initialRules.length > 0 ? initialRules : [{
      id: crypto.randomUUID(),
      field: 'churn_score',
      operator: 'gte',
      value: '0.7',
    }]
  )

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { id: crypto.randomUUID(), field: 'churn_score', operator: 'gte', value: '' },
    ])
  }

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const updateRule = (id: string, patch: Partial<Rule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const previewCount = estimateCount(rules.filter((r) => r.value !== ''), logic)
  const validRules = rules.filter((r) => r.value !== '')

  return (
    <div className="space-y-4">
      {/* Segment name */}
      <div>
        <Label className="text-xs text-gray-400 mb-1.5 block">Segment Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. High Churn Risk - Loyal"
          className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600"
        />
      </div>

      {/* Logic operator */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">Match</span>
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {(['AND', 'OR'] as const).map((op) => (
            <button
              key={op}
              onClick={() => setLogic(op)}
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                logic === op ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              )}
            >
              {op}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">of the following rules</span>
      </div>

      {/* Rules */}
      <div className="space-y-2">
        {rules.map((rule, idx) => {
          const fieldDef = AVAILABLE_FIELDS.find((f) => f.value === rule.field)
          const isNumber = fieldDef?.type === 'number'
          const operators = isNumber ? NUMBER_OPERATORS : STRING_OPERATORS

          return (
            <div key={rule.id} className="flex items-center gap-2 group">
              {idx > 0 && (
                <span className="text-xs text-gray-600 w-7 text-right flex-shrink-0">{logic}</span>
              )}
              {idx === 0 && <div className="w-7 flex-shrink-0" />}

              <div className="flex-1 flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5">
                <Filter className="w-3 h-3 text-gray-600 flex-shrink-0" />

                <Select value={rule.field} onValueChange={(v) => updateRule(rule.id, { field: v, value: '' })}>
                  <SelectTrigger className="h-6 border-0 bg-transparent text-xs text-gray-300 w-44 p-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {AVAILABLE_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="text-xs text-gray-300">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={rule.operator} onValueChange={(v) => updateRule(rule.id, { operator: v as RuleOperator })}>
                  <SelectTrigger className="h-6 border-0 bg-transparent text-xs text-gray-400 w-14 p-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {operators.map((op) => (
                      <SelectItem key={op.value} value={op.value} className="text-xs text-gray-300">
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                  placeholder={fieldDef?.hint ?? 'value'}
                  className="h-6 border-0 bg-transparent text-xs text-gray-200 placeholder:text-gray-600 w-28 p-0 focus-visible:ring-0"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeRule(rule.id)}
                disabled={rules.length <= 1}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )
        })}
      </div>

      {/* Add rule + preview */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={addRule} className="text-xs text-gray-400 hover:text-gray-200 -ml-2">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add rule
        </Button>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users className="w-3.5 h-3.5" />
          <span>
            ~<span className="text-gray-300 font-semibold">{previewCount}</span> customers match
          </span>
        </div>
      </div>

      {/* Save */}
      {onSave && (
        <Button
          onClick={() => onSave(name, validRules, logic)}
          disabled={!name.trim() || validRules.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
        >
          Create Segment ({previewCount} customers)
        </Button>
      )}
    </div>
  )
}
