import type {
  DataWarehouseConnector,
  ConnectionConfig,
  ConnectionTestResult,
  QueryResult,
  SchemaDiscoveryResult,
  TableInfo,
  ColumnDef,
  FieldMapping,
} from './types'

interface SnowflakeCredentials {
  account: string      // e.g. myorg-myaccount
  username: string
  password: string
  warehouse: string
  database: string
  schema: string
  role?: string
}

interface SnowflakeQueryResponse {
  data: unknown[][]
  resultSetMetaData: {
    numRows: number
    rowType: Array<{ name: string; type: string; nullable: boolean }>
  }
  message?: string
  code?: string
}

function parseCredentials(raw: Record<string, string>): SnowflakeCredentials {
  return {
    account: raw.account ?? '',
    username: raw.username ?? '',
    password: raw.password ?? '',
    warehouse: raw.warehouse ?? 'COMPUTE_WH',
    database: raw.database ?? '',
    schema: raw.schema ?? 'PUBLIC',
    role: raw.role,
  }
}

export class SnowflakeConnector implements DataWarehouseConnector {
  readonly type = 'snowflake' as const
  private creds: SnowflakeCredentials
  private baseUrl: string
  private token: string | null = null
  private tokenExpiry: number = 0

  constructor(config: ConnectionConfig) {
    this.creds = parseCredentials(config.credentials)
    this.baseUrl = `https://${this.creds.account}.snowflakecomputing.com`
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) return this.token

    const res = await fetch(`${this.baseUrl}/session/v1/login-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        data: {
          CLIENT_APP_ID: 'CustomerJourneyPlatform',
          CLIENT_APP_VERSION: '1.0.0',
          SVN_REVISION: '1',
          ACCOUNT_NAME: this.creds.account,
          LOGIN_NAME: this.creds.username,
          PASSWORD: this.creds.password,
          SESSION_PARAMETERS: {
            WAREHOUSE: this.creds.warehouse,
            DATABASE: this.creds.database,
            SCHEMA: this.creds.schema,
            ROLE: this.creds.role ?? '',
          },
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Snowflake auth failed: ${res.status} ${text}`)
    }

    const json = (await res.json()) as { data?: { token?: string }; message?: string }
    if (!json.data?.token) throw new Error(json.message ?? 'No token returned')

    this.token = json.data.token
    this.tokenExpiry = Date.now() + 55 * 60 * 1000 // 55 min
    return this.token
  }

  private async executeSQL(sql: string): Promise<SnowflakeQueryResponse> {
    const token = await this.getToken()
    const res = await fetch(`${this.baseUrl}/api/v2/statements`, {
      method: 'POST',
      headers: {
        Authorization: `Snowflake Token="${token}"`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Snowflake-Authorization-Token-Type': 'SESSION',
      },
      body: JSON.stringify({
        statement: sql,
        timeout: 60,
        database: this.creds.database,
        schema: this.creds.schema,
        warehouse: this.creds.warehouse,
        role: this.creds.role,
      }),
    })

    if (!res.ok) {
      const err = (await res.json()) as { message?: string }
      throw new Error(err.message ?? `HTTP ${res.status}`)
    }

    return (await res.json()) as SnowflakeQueryResponse
  }

  async test(): Promise<ConnectionTestResult> {
    const start = Date.now()
    try {
      await this.executeSQL('SELECT CURRENT_VERSION()')
      return { success: true, latencyMs: Date.now() - start }
    } catch (e) {
      return { success: false, latencyMs: Date.now() - start, error: String(e) }
    }
  }

  async query(sql: string, _params?: unknown[]): Promise<QueryResult> {
    const start = Date.now()
    const result = await this.executeSQL(sql)
    const columns: ColumnDef[] = result.resultSetMetaData.rowType.map((col) => ({
      name: col.name,
      type: col.type,
      nullable: col.nullable,
    }))
    const rows = result.data.map((row) => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => { obj[col.name] = (row as unknown[])[i] })
      return obj
    })
    return { rows, columns, rowCount: result.resultSetMetaData.numRows, executionTimeMs: Date.now() - start }
  }

  async listTables(): Promise<TableInfo[]> {
    const result = await this.query(
      `SELECT TABLE_SCHEMA, TABLE_NAME, ROW_COUNT
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_CATALOG = '${this.creds.database}'
         AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_SCHEMA, TABLE_NAME`
    )

    const tables: TableInfo[] = []
    for (const row of result.rows) {
      const cols = await this.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_CATALOG = '${this.creds.database}'
           AND TABLE_SCHEMA = '${String(row.TABLE_SCHEMA)}'
           AND TABLE_NAME = '${String(row.TABLE_NAME)}'
         ORDER BY ORDINAL_POSITION`
      )
      tables.push({
        schema: String(row.TABLE_SCHEMA),
        name: String(row.TABLE_NAME),
        rowCount: Number(row.ROW_COUNT ?? 0),
        columns: cols.rows.map((c) => ({
          name: String(c.COLUMN_NAME),
          type: String(c.DATA_TYPE),
          nullable: c.IS_NULLABLE === 'YES',
        })),
      })
    }
    return tables
  }

  async previewTable(table: string, limit = 100): Promise<QueryResult> {
    return this.query(`SELECT * FROM ${this.creds.schema}.${table} LIMIT ${limit}`)
  }

  async discoverSchema(): Promise<SchemaDiscoveryResult> {
    const tables = await this.listTables()
    const suggestedMappings = inferFieldMappings(tables)
    return { tables, suggestedMappings }
  }
}

export function inferFieldMappings(tables: TableInfo[]): FieldMapping[] {
  const mappings: FieldMapping[] = []
  const fieldPatterns: Array<{ pattern: RegExp; target: FieldMapping['targetField']; confidence: number }> = [
    { pattern: /customer_id|user_id|client_id|account_id/i, target: 'customer_id', confidence: 0.95 },
    { pattern: /event_type|event_name|action|event_kind/i, target: 'event_type', confidence: 0.9 },
    { pattern: /occurred_at|event_time|timestamp|created_at|event_date/i, target: 'occurred_at', confidence: 0.88 },
    { pattern: /revenue|amount|total|price|value|gmv/i, target: 'revenue', confidence: 0.8 },
    { pattern: /channel|source|medium|platform/i, target: 'channel', confidence: 0.75 },
    { pattern: /properties|metadata|attributes|payload|extra/i, target: 'properties', confidence: 0.7 },
  ]

  for (const table of tables) {
    for (const col of table.columns) {
      for (const { pattern, target, confidence } of fieldPatterns) {
        if (pattern.test(col.name)) {
          mappings.push({
            sourceField: `${table.schema}.${table.name}.${col.name}`,
            targetField: target,
            confidence,
          })
        }
      }
    }
  }

  return mappings
}
