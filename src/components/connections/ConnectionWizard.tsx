import React, { useState } from 'react'
import { CheckCircle, XCircle, Loader2, ChevronRight, Database, Zap, Map } from 'lucide-react'
import type { ConnectorType, ConnectionConfig } from '@/lib/connectors/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ConnectionWizardProps {
  open: boolean
  connectorType: ConnectorType
  connectorName: string
  onClose: () => void
  onConnect: (config: ConnectionConfig) => void
}

const CREDENTIAL_FIELDS: Record<ConnectorType, Array<{ key: string; label: string; placeholder: string; secret?: boolean }>> = {
  snowflake: [
    { key: 'account', label: 'Account Identifier', placeholder: 'myorg-myaccount' },
    { key: 'username', label: 'Username', placeholder: 'your_username' },
    { key: 'password', label: 'Password', placeholder: '••••••••', secret: true },
    { key: 'warehouse', label: 'Warehouse', placeholder: 'COMPUTE_WH' },
    { key: 'database', label: 'Database', placeholder: 'MY_DATABASE' },
    { key: 'schema', label: 'Schema', placeholder: 'PUBLIC' },
    { key: 'role', label: 'Role (optional)', placeholder: 'ANALYST' },
  ],
  bigquery: [
    { key: 'project_id', label: 'Project ID', placeholder: 'my-gcp-project' },
    { key: 'dataset_id', label: 'Dataset ID', placeholder: 'analytics' },
    { key: 'client_email', label: 'Service Account Email', placeholder: 'sa@project.iam.gserviceaccount.com' },
    { key: 'private_key', label: 'Private Key (PEM)', placeholder: '-----BEGIN PRIVATE KEY-----\n...', secret: true },
    { key: 'location', label: 'Dataset Location', placeholder: 'US' },
  ],
  redshift: [
    { key: 'cluster_identifier', label: 'Cluster Identifier (or leave blank for serverless)', placeholder: 'my-redshift-cluster' },
    { key: 'workgroup_name', label: 'Workgroup Name (serverless)', placeholder: 'my-workgroup' },
    { key: 'database', label: 'Database', placeholder: 'analytics' },
    { key: 'db_user', label: 'DB User', placeholder: 'awsuser' },
    { key: 'region', label: 'AWS Region', placeholder: 'us-east-1' },
    { key: 'aws_access_key_id', label: 'AWS Access Key ID', placeholder: 'AKIA...' },
    { key: 'aws_secret_access_key', label: 'AWS Secret Access Key', placeholder: '••••••••', secret: true },
  ],
  clickhouse: [
    { key: 'host', label: 'Host', placeholder: 'my-cluster.clickhouse.cloud' },
    { key: 'port', label: 'Port', placeholder: '8443' },
    { key: 'database', label: 'Database', placeholder: 'default' },
    { key: 'username', label: 'Username', placeholder: 'default' },
    { key: 'password', label: 'Password', placeholder: '••••••••', secret: true },
  ],
  postgres: [
    { key: 'host', label: 'Host', placeholder: 'db.example.com' },
    { key: 'port', label: 'Port', placeholder: '5432' },
    { key: 'database', label: 'Database', placeholder: 'analytics' },
    { key: 'username', label: 'Username', placeholder: 'postgres' },
    { key: 'password', label: 'Password', placeholder: '••••••••', secret: true },
    { key: 'ssl', label: 'SSL Mode', placeholder: 'require' },
  ],
  databricks: [
    { key: 'host', label: 'Workspace Host', placeholder: 'adb-123.azuredatabricks.net' },
    { key: 'token', label: 'Personal Access Token', placeholder: 'dapi...', secret: true },
    { key: 'http_path', label: 'SQL Warehouse HTTP Path', placeholder: '/sql/1.0/warehouses/abc123' },
    { key: 'catalog', label: 'Catalog (Unity Catalog)', placeholder: 'hive_metastore' },
    { key: 'schema', label: 'Schema', placeholder: 'default' },
  ],
}

const SUGGESTED_MAPPINGS = [
  { sourceField: 'user_id', targetField: 'customer_id', confidence: 0.95 },
  { sourceField: 'event_name', targetField: 'event_type', confidence: 0.88 },
  { sourceField: 'timestamp', targetField: 'occurred_at', confidence: 0.92 },
  { sourceField: 'revenue', targetField: 'revenue', confidence: 0.85 },
  { sourceField: 'platform', targetField: 'channel', confidence: 0.75 },
  { sourceField: 'metadata', targetField: 'properties', confidence: 0.70 },
]

type Step = 'credentials' | 'test' | 'mapping'

export function ConnectionWizard({ open, connectorType, connectorName, onClose, onConnect }: ConnectionWizardProps) {
  const [step, setStep] = useState<Step>('credentials')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null)

  const fields = CREDENTIAL_FIELDS[connectorType]

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    await new Promise((r) => setTimeout(r, 2000)) // Simulate test
    // In production, call createConnector(config).test()
    setTestResult({ success: true, latencyMs: 142 })
    setTesting(false)
    setTimeout(() => setStep('mapping'), 800)
  }

  const handleConnect = () => {
    onConnect({ type: connectorType, name: connectorName, credentials })
    onClose()
  }

  const STEPS = [
    { key: 'credentials', label: 'Credentials', icon: Database },
    { key: 'test', label: 'Test', icon: Zap },
    { key: 'mapping', label: 'Map Fields', icon: Map },
  ] as const

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Connect to {connectorName}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((s, idx) => {
            const Icon = s.icon
            const isActive = step === s.key
            const stepIndex = STEPS.findIndex((st) => st.key === step)
            const isDone = idx < stepIndex

            return (
              <React.Fragment key={s.key}>
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' :
                  isDone ? 'text-emerald-400' : 'text-gray-600'
                )}>
                  {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {s.label}
                </div>
                {idx < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />}
              </React.Fragment>
            )
          })}
        </div>

        {/* Step 1: Credentials */}
        {step === 'credentials' && (
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.key}>
                <Label className="text-xs text-gray-400 mb-1 block">{field.label}</Label>
                <Input
                  type={field.secret ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={credentials[field.key] ?? ''}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-gray-100 text-sm placeholder:text-gray-600"
                />
              </div>
            ))}
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
              onClick={() => setStep('test')}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Test Connection */}
        {step === 'test' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              {!testing && !testResult && (
                <>
                  <div className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400 text-center">
                    Ready to test your connection to {connectorName}. This will verify your credentials and measure latency.
                  </p>
                  <Button onClick={handleTest} className="bg-indigo-600 hover:bg-indigo-700 px-8">
                    Test Connection
                  </Button>
                </>
              )}

              {testing && (
                <>
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                  <p className="text-sm text-gray-400 animate-pulse">Connecting to {connectorName}...</p>
                </>
              )}

              {testResult && (
                <>
                  {testResult.success ? (
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-400" />
                  )}
                  <div className="text-center">
                    <p className={cn('text-sm font-medium', testResult.success ? 'text-emerald-400' : 'text-red-400')}>
                      {testResult.success ? 'Connection successful!' : 'Connection failed'}
                    </p>
                    {testResult.latencyMs && (
                      <p className="text-xs text-gray-500 mt-1">Latency: {testResult.latencyMs}ms</p>
                    )}
                    {testResult.error && (
                      <p className="text-xs text-red-400 mt-1">{testResult.error}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Field Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              We discovered your schema and suggested field mappings. You can adjust these before connecting.
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-3 text-xs text-gray-600 font-medium mb-1 px-1">
                <span>Source Field</span>
                <span>Maps To</span>
                <span>Confidence</span>
              </div>
              {SUGGESTED_MAPPINGS.map((mapping) => (
                <div key={mapping.sourceField} className="grid grid-cols-3 items-center bg-gray-800 rounded-lg px-3 py-2 text-xs">
                  <span className="text-gray-300 font-mono">{mapping.sourceField}</span>
                  <span className="text-indigo-400 font-mono">{mapping.targetField}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${mapping.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-500 w-8 text-right">{Math.round(mapping.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-gray-700 text-gray-300" onClick={() => setStep('test')}>
                Back
              </Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleConnect}>
                Connect
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
