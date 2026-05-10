export type ConnectorType =
  | 'snowflake'
  | 'bigquery'
  | 'redshift'
  | 'clickhouse'
  | 'postgres'
  | 'databricks'

export interface ConnectionConfig {
  type: ConnectorType
  name: string
  credentials: Record<string, string>
}

export interface ColumnDef {
  name: string
  type: string
  nullable: boolean
}

export interface QueryResult {
  rows: Record<string, unknown>[]
  columns: ColumnDef[]
  rowCount: number
  executionTimeMs: number
}

export interface TableInfo {
  schema: string
  name: string
  rowCount?: number
  columns: ColumnDef[]
}

export interface FieldMapping {
  sourceField: string
  targetField:
    | 'customer_id'
    | 'event_type'
    | 'occurred_at'
    | 'revenue'
    | 'channel'
    | 'properties'
  confidence: number
}

export interface SchemaDiscoveryResult {
  tables: TableInfo[]
  suggestedMappings: FieldMapping[]
}

export interface ConnectionTestResult {
  success: boolean
  latencyMs: number
  error?: string
}

export interface DataWarehouseConnector {
  type: ConnectorType
  test(): Promise<ConnectionTestResult>
  query(sql: string, params?: unknown[]): Promise<QueryResult>
  discoverSchema(): Promise<SchemaDiscoveryResult>
  listTables(): Promise<TableInfo[]>
  previewTable(table: string, limit?: number): Promise<QueryResult>
}
