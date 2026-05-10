import type { ConnectionConfig, ConnectionTestResult, DataWarehouseConnector } from './types'
import { SnowflakeConnector } from './snowflake'
import { BigQueryConnector } from './bigquery'
import { RedshiftConnector } from './redshift'
import { ClickHouseConnector } from './clickhouse'
import { PostgresConnector } from './postgres'
import { DatabricksConnector } from './databricks'

export { type DataWarehouseConnector, type ConnectionConfig, type ConnectionTestResult }
export { type QueryResult, type TableInfo, type ColumnDef, type FieldMapping, type SchemaDiscoveryResult } from './types'

export function createConnector(config: ConnectionConfig): DataWarehouseConnector {
  switch (config.type) {
    case 'snowflake':
      return new SnowflakeConnector(config)
    case 'bigquery':
      return new BigQueryConnector(config)
    case 'redshift':
      return new RedshiftConnector(config)
    case 'clickhouse':
      return new ClickHouseConnector(config)
    case 'postgres':
      return new PostgresConnector(config)
    case 'databricks':
      return new DatabricksConnector(config)
    default: {
      const _exhaustive: never = config.type
      throw new Error(`Unknown connector type: ${String(_exhaustive)}`)
    }
  }
}

export async function testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
  const connector = createConnector(config)
  return connector.test()
}
