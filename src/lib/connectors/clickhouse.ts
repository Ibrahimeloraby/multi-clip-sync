import type {
  DataWarehouseConnector,
  ConnectionConfig,
  ConnectionTestResult,
  QueryResult,
  SchemaDiscoveryResult,
  TableInfo,
  ColumnDef,
} from './types'
import { inferFieldMappings } from './snowflake'

interface ClickHouseCredentials {
  host: string      // e.g. my-cluster.clickhouse.cloud
  port?: string     // default 8443 (HTTPS) or 8123 (HTTP)
  database: string
  username: string
  password: string
  secure?: string   // 'true' | 'false'
}

function parseCredentials(raw: Record<string, string>): ClickHouseCredentials {
  return {
    host: raw.host ?? '',
    port: raw.port,
    database: raw.database ?? 'default',
    username: raw.username ?? 'default',
    password: raw.password ?? '',
    secure: raw.secure ?? 'true',
  }
}

interface ClickHouseColumnInfo {
  name: string
  type: string
}

export class ClickHouseConnector implements DataWarehouseConnector {
  readonly type = 'clickhouse' as const
  private creds: ClickHouseCredentials
  private baseUrl: string

  constructor(config: ConnectionConfig) {
    this.creds = parseCredentials(config.credentials)
    const protocol = this.creds.secure === 'false' ? 'http' : 'https'
    const port = this.creds.port ?? (this.creds.secure === 'false' ? '8123' : '8443')
    this.baseUrl = `${protocol}://${this.creds.host}:${port}`
  }

  private async executeSQL(sql: string): Promise<string> {
    const url = new URL(this.baseUrl)
    url.searchParams.set('database', this.creds.database)
    url.searchParams.set('default_format', 'JSON')

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'X-ClickHouse-User': this.creds.username,
        'X-ClickHouse-Key': this.creds.password,
        'Content-Type': 'text/plain',
      },
      body: `${sql} FORMAT JSON`,
    })

    const text = await res.text()
    if (!res.ok) {
      throw new Error(`ClickHouse error ${res.status}: ${text.slice(0, 500)}`)
    }
    return text
  }

  async test(): Promise<ConnectionTestResult> {
    const start = Date.now()
    try {
      await this.executeSQL('SELECT 1')
      return { success: true, latencyMs: Date.now() - start }
    } catch (e) {
      return { success: false, latencyMs: Date.now() - start, error: String(e) }
    }
  }

  async query(sql: string, _params?: unknown[]): Promise<QueryResult> {
    const start = Date.now()
    const raw = await this.executeSQL(sql)
    const json = JSON.parse(raw) as {
      data: Record<string, unknown>[]
      meta: ClickHouseColumnInfo[]
      rows: number
      statistics?: { elapsed: number }
    }

    const columns: ColumnDef[] = json.meta.map((m) => ({
      name: m.name,
      type: m.type,
      nullable: m.type.startsWith('Nullable('),
    }))

    return {
      rows: json.data,
      columns,
      rowCount: json.rows,
      executionTimeMs: Math.round((json.statistics?.elapsed ?? 0) * 1000) || (Date.now() - start),
    }
  }

  async listTables(): Promise<TableInfo[]> {
    const result = await this.query(
      `SELECT database, name, total_rows
       FROM system.tables
       WHERE database = '${this.creds.database}'
         AND engine != 'View'
       ORDER BY name`
    )

    const tables: TableInfo[] = []
    for (const row of result.rows) {
      const colResult = await this.query(
        `DESCRIBE TABLE \`${this.creds.database}\`.\`${String(row.name)}\``
      )
      tables.push({
        schema: String(row.database),
        name: String(row.name),
        rowCount: Number(row.total_rows ?? 0),
        columns: colResult.rows.map((c) => ({
          name: String(c.name),
          type: String(c.type),
          nullable: String(c.type).startsWith('Nullable('),
        })),
      })
    }
    return tables
  }

  async previewTable(table: string, limit = 100): Promise<QueryResult> {
    return this.query(`SELECT * FROM \`${this.creds.database}\`.\`${table}\` LIMIT ${limit}`)
  }

  async discoverSchema(): Promise<SchemaDiscoveryResult> {
    const tables = await this.listTables()
    return { tables, suggestedMappings: inferFieldMappings(tables) }
  }
}
