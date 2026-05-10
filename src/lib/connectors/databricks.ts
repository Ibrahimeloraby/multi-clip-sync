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

interface DatabricksCredentials {
  host: string           // e.g. adb-1234567890.azuredatabricks.net
  token: string          // personal access token or OAuth token
  httpPath: string       // e.g. /sql/1.0/warehouses/abc123
  catalog?: string       // Unity Catalog catalog name
  schema?: string        // schema / database name
}

interface DatabricksStatementResponse {
  statement_id: string
  status: {
    state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CLOSED'
    error?: { message: string }
  }
  result?: {
    data_array?: unknown[][]
    row_count?: number
  }
  manifest?: {
    schema: {
      columns: Array<{ name: string; type_text: string; nullable: boolean }>
    }
  }
}

function parseCredentials(raw: Record<string, string>): DatabricksCredentials {
  return {
    host: raw.host ?? '',
    token: raw.token ?? '',
    httpPath: raw.http_path ?? raw.httpPath ?? '',
    catalog: raw.catalog,
    schema: raw.schema ?? 'default',
  }
}

export class DatabricksConnector implements DataWarehouseConnector {
  readonly type = 'databricks' as const
  private creds: DatabricksCredentials
  private apiBase: string

  constructor(config: ConnectionConfig) {
    this.creds = parseCredentials(config.credentials)
    this.apiBase = `https://${this.creds.host}/api/2.0`
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.creds.token}`,
      'Content-Type': 'application/json',
    }
  }

  private async executeStatement(sql: string): Promise<DatabricksStatementResponse> {
    const body: Record<string, unknown> = {
      statement: sql,
      warehouse_id: this.creds.httpPath.split('/').pop(), // extract warehouse ID
      wait_timeout: '30s',
      on_wait_timeout: 'CONTINUE',
      format: 'JSON_ARRAY',
      disposition: 'INLINE',
    }

    if (this.creds.catalog) {
      body.catalog = this.creds.catalog
    }
    if (this.creds.schema) {
      body.schema = this.creds.schema
    }

    const res = await fetch(`${this.apiBase}/sql/statements`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = (await res.json()) as { message?: string }
      throw new Error(err.message ?? `HTTP ${res.status}`)
    }

    return (await res.json()) as DatabricksStatementResponse
  }

  private async pollStatement(statementId: string): Promise<DatabricksStatementResponse> {
    for (let i = 0; i < 60; i++) {
      const res = await fetch(`${this.apiBase}/sql/statements/${statementId}`, {
        headers: this.authHeaders(),
      })
      const data = (await res.json()) as DatabricksStatementResponse
      if (data.status.state === 'SUCCEEDED') return data
      if (data.status.state === 'FAILED') {
        throw new Error(data.status.error?.message ?? 'Statement failed')
      }
      await new Promise((r) => setTimeout(r, 1000))
    }
    throw new Error('Statement timed out')
  }

  async test(): Promise<ConnectionTestResult> {
    const start = Date.now()
    try {
      let stmt = await this.executeStatement('SELECT 1')
      if (stmt.status.state !== 'SUCCEEDED') stmt = await this.pollStatement(stmt.statement_id)
      return { success: true, latencyMs: Date.now() - start }
    } catch (e) {
      return { success: false, latencyMs: Date.now() - start, error: String(e) }
    }
  }

  async query(sql: string, _params?: unknown[]): Promise<QueryResult> {
    const start = Date.now()
    let stmt = await this.executeStatement(sql)
    if (stmt.status.state !== 'SUCCEEDED') {
      stmt = await this.pollStatement(stmt.statement_id)
    }

    const schemaCols = stmt.manifest?.schema.columns ?? []
    const columns: ColumnDef[] = schemaCols.map((c) => ({
      name: c.name,
      type: c.type_text,
      nullable: c.nullable,
    }))

    const dataArray = stmt.result?.data_array ?? []
    const rows = dataArray.map((row) => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => { obj[col.name] = (row as unknown[])[i] })
      return obj
    })

    return {
      rows,
      columns,
      rowCount: stmt.result?.row_count ?? rows.length,
      executionTimeMs: Date.now() - start,
    }
  }

  async listTables(): Promise<TableInfo[]> {
    const catalogPrefix = this.creds.catalog ? `${this.creds.catalog}.` : ''
    const schemaName = this.creds.schema ?? 'default'

    const result = await this.query(
      `SHOW TABLES IN ${catalogPrefix}${schemaName}`
    )

    const tables: TableInfo[] = []
    for (const row of result.rows) {
      const tableName = String(row.tableName ?? row.table_name ?? '')
      const colResult = await this.query(
        `DESCRIBE TABLE ${catalogPrefix}${schemaName}.${tableName}`
      )
      const columns: ColumnDef[] = colResult.rows
        .filter((c) => !String(c.col_name ?? '').startsWith('#'))
        .map((c) => ({
          name: String(c.col_name ?? ''),
          type: String(c.data_type ?? ''),
          nullable: true,
        }))
      tables.push({ schema: schemaName, name: tableName, columns })
    }
    return tables
  }

  async previewTable(table: string, limit = 100): Promise<QueryResult> {
    const catalogPrefix = this.creds.catalog ? `${this.creds.catalog}.` : ''
    const schema = this.creds.schema ?? 'default'
    return this.query(`SELECT * FROM ${catalogPrefix}${schema}.${table} LIMIT ${limit}`)
  }

  async discoverSchema(): Promise<SchemaDiscoveryResult> {
    const tables = await this.listTables()
    return { tables, suggestedMappings: inferFieldMappings(tables) }
  }
}
