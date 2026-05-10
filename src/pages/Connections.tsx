import React, { useState } from 'react'
import { CheckCircle, XCircle, RefreshCw, Trash2, ExternalLink, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConnectionWizard } from '@/components/connections/ConnectionWizard'
import type { ConnectorType, ConnectionConfig } from '@/lib/connectors/types'

interface ConnectorCard {
  type: ConnectorType
  name: string
  description: string
  docsUrl: string
  color: string
}

const CONNECTORS: ConnectorCard[] = [
  {
    type: 'snowflake',
    name: 'Snowflake',
    description: 'Cloud data platform with near-unlimited scalability. Connect via SQL API.',
    docsUrl: 'https://docs.snowflake.com',
    color: '#29b5e8',
  },
  {
    type: 'bigquery',
    name: 'BigQuery',
    description: 'Google\'s serverless, highly scalable enterprise data warehouse.',
    docsUrl: 'https://cloud.google.com/bigquery',
    color: '#4285f4',
  },
  {
    type: 'redshift',
    name: 'Amazon Redshift',
    description: 'Fully managed petabyte-scale data warehouse via AWS Data API.',
    docsUrl: 'https://docs.aws.amazon.com/redshift',
    color: '#ff9900',
  },
  {
    type: 'clickhouse',
    name: 'ClickHouse',
    description: 'High-performance columnar database for real-time analytics.',
    docsUrl: 'https://clickhouse.com/docs',
    color: '#f9a600',
  },
  {
    type: 'postgres',
    name: 'PostgreSQL',
    description: 'Connect your existing Postgres database via secure proxy.',
    docsUrl: 'https://postgresql.org/docs',
    color: '#336791',
  },
  {
    type: 'databricks',
    name: 'Databricks',
    description: 'Unified data analytics platform with Delta Lake and SQL Warehouses.',
    docsUrl: 'https://docs.databricks.com',
    color: '#ff3621',
  },
]

interface ActiveConnection {
  id: string
  name: string
  type: ConnectorType
  status: 'active' | 'error' | 'syncing'
  lastSync: string
  schemaDiscovered: boolean
}

const DEMO_CONNECTIONS: ActiveConnection[] = []

export default function Connections() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedConnector, setSelectedConnector] = useState<ConnectorCard | null>(null)
  const [connections, setConnections] = useState<ActiveConnection[]>(DEMO_CONNECTIONS)
  const [testingId, setTestingId] = useState<string | null>(null)

  const openWizard = (connector: ConnectorCard) => {
    setSelectedConnector(connector)
    setWizardOpen(true)
  }

  const handleConnect = (config: ConnectionConfig) => {
    const newConn: ActiveConnection = {
      id: crypto.randomUUID(),
      name: config.name,
      type: config.type,
      status: 'active',
      lastSync: new Date().toISOString(),
      schemaDiscovered: true,
    }
    setConnections((prev) => [...prev, newConn])
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    await new Promise((r) => setTimeout(r, 1500))
    setTestingId(null)
  }

  const handleDisconnect = (id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id))
  }

  const connectedTypes = new Set(connections.map((c) => c.type))

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Data Connections</h1>
        <p className="text-sm text-gray-500 mt-0.5">Connect your data warehouse to start analyzing customer journeys</p>
      </div>

      {/* Active Connections */}
      {connections.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Active Connections ({connections.length})</h2>
          <Card className="bg-gray-900 border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-600 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Last Sync</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Schema</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {connections.map((conn) => {
                  const connector = CONNECTORS.find((c) => c.type === conn.type)
                  return (
                    <tr key={conn.id} className="border-b border-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ background: `${connector?.color}20`, color: connector?.color }}>
                            {conn.type[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-200">{conn.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 capitalize">{connector?.name ?? conn.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {conn.status === 'active' ? (
                            <><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-emerald-400">Active</span></>
                          ) : conn.status === 'error' ? (
                            <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-xs text-red-400">Error</span></>
                          ) : (
                            <><RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" /><span className="text-xs text-indigo-400">Syncing</span></>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-500">{new Date(conn.lastSync).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {conn.schemaDiscovered ? (
                          <Badge className="text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-800">Discovered</Badge>
                        ) : (
                          <Badge className="text-xs bg-gray-800 text-gray-500 border border-gray-700">Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-gray-500"
                            disabled={testingId === conn.id}
                            onClick={() => handleTest(conn.id)}
                          >
                            {testingId === conn.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            Test
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-gray-600 hover:text-red-400" onClick={() => handleDisconnect(conn.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Available Connectors */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Available Connectors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONNECTORS.map((connector) => {
            const isConnected = connectedTypes.has(connector.type)
            return (
              <Card key={connector.type} className="bg-gray-900 border-gray-800 p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{ background: `${connector.color}20`, color: connector.color }}
                      >
                        {connector.name[0]}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-200">{connector.name}</h3>
                      </div>
                    </div>
                  </div>
                  {isConnected && (
                    <Badge className="text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-800 flex-shrink-0">
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{connector.description}</p>
                <div className="flex items-center gap-2">
                  <Button
                    className="flex-1 text-sm h-8"
                    style={{ background: connector.color }}
                    onClick={() => openWizard(connector)}
                  >
                    {isConnected ? 'Add Another' : 'Connect'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-gray-600 hover:text-gray-300"
                    onClick={() => window.open(connector.docsUrl, '_blank')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Wizard */}
      {selectedConnector && (
        <ConnectionWizard
          open={wizardOpen}
          connectorType={selectedConnector.type}
          connectorName={selectedConnector.name}
          onClose={() => { setWizardOpen(false); setSelectedConnector(null) }}
          onConnect={handleConnect}
        />
      )}
    </div>
  )
}
