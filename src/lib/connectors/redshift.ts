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

interface RedshiftCredentials {
  region: string
  clusterIdentifier?: string
  workgroupName?: string   // for Redshift Serverless
  database: string
  dbUser?: string          // for provisioned clusters
  secretArn?: string       // for Secrets Manager auth
  awsAccessKeyId: string
  awsSecretAccessKey: string
  sessionToken?: string
}

interface DataAPIStatementResponse {
  Id: string
  Status: string
  ResultRows?: number
  ResultSize?: number
}

interface DataAPIResultResponse {
  Records: Array<Array<{ stringValue?: string; longValue?: number; doubleValue?: number; booleanValue?: boolean; isNull?: boolean }>>
  ColumnMetadata: Array<{ name: string; typeName: string; nullable: number }>
  TotalNumRows: number
}

function parseCredentials(raw: Record<string, string>): RedshiftCredentials {
  return {
    region: raw.region ?? 'us-east-1',
    clusterIdentifier: raw.cluster_identifier,
    workgroupName: raw.workgroup_name,
    database: raw.database ?? '',
    dbUser: raw.db_user,
    secretArn: raw.secret_arn,
    awsAccessKeyId: raw.aws_access_key_id ?? '',
    awsSecretAccessKey: raw.aws_secret_access_key ?? '',
    sessionToken: raw.session_token,
  }
}

// AWS Signature V4 implementation
async function signRequest(
  method: string,
  url: string,
  body: string,
  region: string,
  service: string,
  accessKey: string,
  secretKey: string,
  sessionToken?: string
): Promise<Record<string, string>> {
  const now = new Date()
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8)
  const datetime = now.toISOString().replace(/[:-]|\.\d{3}/g, '')

  const urlObj = new URL(url)
  const canonicalUri = urlObj.pathname
  const canonicalQueryString = urlObj.search.slice(1)
  const payloadHash = await sha256hex(body)

  const headers: Record<string, string> = {
    'content-type': 'application/x-amz-json-1.1',
    host: urlObj.host,
    'x-amz-date': datetime,
    'x-amz-target': '',
  }
  if (sessionToken) headers['x-amz-security-token'] = sessionToken

  const signedHeaders = Object.keys(headers).sort().join(';')
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}`)
    .join('\n') + '\n'

  const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const credentialScope = `${date}/${region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', datetime, credentialScope, await sha256hex(canonicalRequest)].join('\n')

  const signingKey = await deriveSigningKey(secretKey, date, region, service)
  const signature = await hmacHex(signingKey, stringToSign)

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return { ...headers, Authorization: authorization }
}

async function sha256hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmacBuf(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const rawKey = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const cryptoKey = await crypto.subtle.importKey('raw', rawKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function deriveSigningKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacBuf(`AWS4${secret}`, date)
  const kRegion = await hmacBuf(kDate, region)
  const kService = await hmacBuf(kRegion, service)
  return hmacBuf(kService, 'aws4_request')
}

export class RedshiftConnector implements DataWarehouseConnector {
  readonly type = 'redshift' as const
  private creds: RedshiftCredentials
  private endpoint: string

  constructor(config: ConnectionConfig) {
    this.creds = parseCredentials(config.credentials)
    this.endpoint = `https://redshift-data.${this.creds.region}.amazonaws.com`
  }

  private async callDataAPI(target: string, body: Record<string, unknown>): Promise<unknown> {
    const bodyStr = JSON.stringify(body)
    const headers = await signRequest(
      'POST',
      this.endpoint,
      bodyStr,
      this.creds.region,
      'redshift-data',
      this.creds.awsAccessKeyId,
      this.creds.awsSecretAccessKey,
      this.creds.sessionToken
    )
    headers['x-amz-target'] = `RedshiftData.${target}`
    headers['content-type'] = 'application/x-amz-json-1.1'

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: bodyStr,
    })

    if (!res.ok) {
      const err = (await res.json()) as { Message?: string; message?: string }
      throw new Error(err.Message ?? err.message ?? `HTTP ${res.status}`)
    }

    return res.json()
  }

  private buildRequestBody(sql: string): Record<string, unknown> {
    const base: Record<string, unknown> = {
      Database: this.creds.database,
      Sql: sql,
    }
    if (this.creds.workgroupName) {
      base.WorkgroupName = this.creds.workgroupName
    } else {
      base.ClusterIdentifier = this.creds.clusterIdentifier
      base.DbUser = this.creds.dbUser
    }
    if (this.creds.secretArn) {
      base.SecretArn = this.creds.secretArn
      delete base.DbUser
    }
    return base
  }

  private async waitForStatement(statementId: string): Promise<void> {
    for (let i = 0; i < 60; i++) {
      const status = (await this.callDataAPI('DescribeStatement', { Id: statementId })) as DataAPIStatementResponse
      if (status.Status === 'FINISHED') return
      if (status.Status === 'FAILED' || status.Status === 'ABORTED') {
        throw new Error(`Statement ${status.Status}: ${statementId}`)
      }
      await new Promise((r) => setTimeout(r, 1000))
    }
    throw new Error('Statement timed out')
  }

  async test(): Promise<ConnectionTestResult> {
    const start = Date.now()
    try {
      const exec = (await this.callDataAPI('ExecuteStatement', this.buildRequestBody('SELECT 1'))) as DataAPIStatementResponse
      await this.waitForStatement(exec.Id)
      return { success: true, latencyMs: Date.now() - start }
    } catch (e) {
      return { success: false, latencyMs: Date.now() - start, error: String(e) }
    }
  }

  async query(sql: string, _params?: unknown[]): Promise<QueryResult> {
    const start = Date.now()
    const exec = (await this.callDataAPI('ExecuteStatement', this.buildRequestBody(sql))) as DataAPIStatementResponse
    await this.waitForStatement(exec.Id)

    const results = (await this.callDataAPI('GetStatementResult', { Id: exec.Id })) as DataAPIResultResponse

    const columns = results.ColumnMetadata.map((col) => ({
      name: col.name,
      type: col.typeName,
      nullable: col.nullable !== 0,
    }))

    const rows = results.Records.map((record) => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => {
        const cell = record[i]
        if (cell.isNull) obj[col.name] = null
        else if (cell.stringValue !== undefined) obj[col.name] = cell.stringValue
        else if (cell.longValue !== undefined) obj[col.name] = cell.longValue
        else if (cell.doubleValue !== undefined) obj[col.name] = cell.doubleValue
        else if (cell.booleanValue !== undefined) obj[col.name] = cell.booleanValue
      })
      return obj
    })

    return { rows, columns, rowCount: results.TotalNumRows, executionTimeMs: Date.now() - start }
  }

  async listTables(): Promise<TableInfo[]> {
    const result = await this.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ('pg_catalog','information_schema')
       ORDER BY table_schema, table_name`
    )

    const tables: TableInfo[] = []
    for (const row of result.rows) {
      const cols = await this.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = '${String(row.table_schema)}'
           AND table_name = '${String(row.table_name)}'
         ORDER BY ordinal_position`
      )
      tables.push({
        schema: String(row.table_schema),
        name: String(row.table_name),
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
    return this.query(`SELECT * FROM public.${table} LIMIT ${limit}`)
  }

  async discoverSchema(): Promise<SchemaDiscoveryResult> {
    const tables = await this.listTables()
    return { tables, suggestedMappings: inferFieldMappings(tables) }
  }
}
