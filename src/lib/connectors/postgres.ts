import type {
  DataWarehouseConnector,
  ConnectionConfig,
  ConnectionTestResult,
  QueryResult,
  SchemaDiscoveryResult,
  TableInfo,
} from './types'
import { inferFieldMappings } from './snowflake'

/**
 * Postgres connector — runs queries via a Supabase Edge Function proxy.
 * The browser cannot open TCP connections to Postgres directly, so we relay
 * SQL through an Edge Function that uses the "pg" npm package server-side.
 *
 * Edge function endpoint: /functions/v1/postgres-proxy
 * Request body: { sql, params, credentials }
 * Response body: { rows, columns, rowCount, error }
 */

interface PostgresCredentials {
  host: string
  port?: string
  database: string
  username: string
  password: string
  ssl?: string   // 'true' | 'false' | 'require'
}

interface ProxyResponse {
  rows: Record<string, unknown>[]
  columns: Array<{ name: string; dataTypeID: number; typeName?: string }>
  rowCount: number
  error?: string
}

// Postgres OID → human-readable type name
const PG_OID_MAP: Record<number, string> = {
  16: 'boolean',
  20: 'bigint',
  21: 'smallint',
  23: 'integer',
  25: 'text',
  114: 'json',
  700: 'real',
  701: 'double precision',
  1043: 'varchar',
  1082: 'date',
  1114: 'timestamp',
  1184: 'timestamptz',
  1700: 'numeric',
  2950: 'uuid',
  3802: 'jsonb',
}

function parseCredentials(raw: Record<string, string>): PostgresCredentials {
  return {
    host: raw.host ?? '',
    port: raw.port ?? '5432',
    database: raw.database ?? '',
    username: raw.username ?? 'postgres',
    password: raw.password ?? '',
    ssl: raw.ssl ?? 'require',
  }
}

function getProxyUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL not set')
  return `${supabaseUrl}/functions/v1/postgres-proxy`
}

export class PostgresConnector implements DataWarehouseConnector {
  readonly type = 'postgres' as const
  private creds: PostgresCredentials

  constructor(config: ConnectionConfig) {
    this.creds = parseCredentials(config.credentials)
  }

  private async proxyQuery(sql: string, params?: unknown[]): Promise<ProxyResponse> {
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
    const res = await fetch(getProxyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ sql, params, credentials: this.creds }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Proxy error ${res.status}: ${text.slice(0, 300)}`)
    }

    const json = (await res.json()) as ProxyResponse
    if (json.error) throw new Error(json.error)
    return json
  }

  async test(): Promise<ConnectionTestResult> {
    const start = Date.now()
    try {
      await this.proxyQuery('SELECT 1 AS ok')
      return { success: true, latencyMs: Date.now() - start }
    } catch (e) {
      return { success: false, latencyMs: Date.now() - start, error: String(e) }
    }
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    const start = Date.now()
    const result = await this.proxyQuery(sql, params)

    const columns = result.columns.map((c) => ({
      name: c.name,
      type: c.typeName ?? PG_OID_MAP[c.dataTypeID] ?? String(c.dataTypeID),
      nullable: true, // would need pg_attribute lookup to know for sure
    }))

    return {
      rows: result.rows,
      columns,
      rowCount: result.rowCount,
      executionTimeMs: Date.now() - start,
    }
  }

  async listTables(): Promise<TableInfo[]> {
    const result = await this.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name`
    )

    const tables: TableInfo[] = []
    for (const row of result.rows) {
      const cols = await this.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [row.table_schema, row.table_name]
      )
      const countRes = await this.query(
        `SELECT reltuples::bigint AS estimate
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = $1 AND c.relname = $2`,
        [row.table_schema, row.table_name]
      )
      tables.push({
        schema: String(row.table_schema),
        name: String(row.table_name),
        rowCount: Number(countRes.rows[0]?.estimate ?? 0),
        columns: cols.rows.map((c) => ({
          name: String(c.column_name),
          type: String(c.data_type),
          nullable: c.is_nullable === 'YES',
        })),
      })
    }
    return tables
  }

  async previewTable(table: string, limit = 100): Promise<QueryResult> {
    return this.query(`SELECT * FROM public.${table} LIMIT $1`, [limit])
  }

  async discoverSchema(): Promise<SchemaDiscoveryResult> {
    const tables = await this.listTables()
    return { tables, suggestedMappings: inferFieldMappings(tables) }
  }
}
