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

interface BigQueryCredentials {
  projectId: string
  datasetId: string
  serviceAccountEmail: string
  privateKey: string  // PEM format, base64-encoded in config
  location?: string
}

interface BigQueryJobResponse {
  jobComplete: boolean
  jobReference: { jobId: string; projectId: string }
  schema?: { fields: Array<{ name: string; type: string; mode: string }> }
  rows?: Array<{ f: Array<{ v: unknown }> }>
  totalRows?: string
  errors?: Array<{ message: string }>
}

function parseCredentials(raw: Record<string, string>): BigQueryCredentials {
  return {
    projectId: raw.project_id ?? raw.projectId ?? '',
    datasetId: raw.dataset_id ?? raw.datasetId ?? '',
    serviceAccountEmail: raw.client_email ?? raw.serviceAccountEmail ?? '',
    privateKey: raw.private_key ?? raw.privateKey ?? '',
    location: raw.location ?? 'US',
  }
}

// Create a JWT for service account authentication
async function createServiceAccountJWT(email: string, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: email,
    sub: email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/bigquery',
  }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const signingInput = `${encode(header)}.${encode(payload)}`

  // Import the RSA private key
  const keyData = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${signingInput}.${sigB64}`
}

export class BigQueryConnector implements DataWarehouseConnector {
  readonly type = 'bigquery' as const
  private creds: BigQueryCredentials
  private accessToken: string | null = null
  private tokenExpiry = 0

  constructor(config: ConnectionConfig) {
    this.creds = parseCredentials(config.credentials)
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken

    const jwt = await createServiceAccountJWT(this.creds.serviceAccountEmail, this.creds.privateKey)

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!res.ok) throw new Error(`BigQuery auth failed: ${res.status}`)
    const json = (await res.json()) as { access_token: string; expires_in: number }

    this.accessToken = json.access_token
    this.tokenExpiry = Date.now() + (json.expires_in - 60) * 1000
    return this.accessToken
  }

  private async runQuery(sql: string): Promise<BigQueryJobResponse> {
    const token = await this.getAccessToken()
    const baseUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${this.creds.projectId}`

    // Submit job
    const jobRes = await fetch(`${baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        configuration: {
          query: {
            query: sql,
            useLegacySql: false,
            defaultDataset: { projectId: this.creds.projectId, datasetId: this.creds.datasetId },
            location: this.creds.location,
          },
        },
      }),
    })

    if (!jobRes.ok) {
      const err = (await jobRes.json()) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `HTTP ${jobRes.status}`)
    }

    const job = (await jobRes.json()) as { jobReference: { jobId: string } }
    const jobId = job.jobReference.jobId

    // Poll for completion
    let attempts = 0
    while (attempts < 30) {
      const pollRes = await fetch(
        `${baseUrl}/jobs/${jobId}?location=${this.creds.location}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const status = (await pollRes.json()) as {
        status: { state: string; errorResult?: { message: string } }
        statistics: Record<string, unknown>
      }

      if (status.status.state === 'DONE') {
        if (status.status.errorResult) throw new Error(status.status.errorResult.message)

        // Fetch results
        const resultsRes = await fetch(`${baseUrl}/queries/${jobId}?location=${this.creds.location}&maxResults=10000`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        return (await resultsRes.json()) as BigQueryJobResponse
      }

      await new Promise((r) => setTimeout(r, 1000))
      attempts++
    }

    throw new Error('BigQuery job timed out')
  }

  async test(): Promise<ConnectionTestResult> {
    const start = Date.now()
    try {
      await this.runQuery('SELECT 1')
      return { success: true, latencyMs: Date.now() - start }
    } catch (e) {
      return { success: false, latencyMs: Date.now() - start, error: String(e) }
    }
  }

  async query(sql: string, _params?: unknown[]): Promise<QueryResult> {
    const start = Date.now()
    const result = await this.runQuery(sql)

    const fields = result.schema?.fields ?? []
    const columns: ColumnDef[] = fields.map((f) => ({
      name: f.name,
      type: f.type,
      nullable: f.mode !== 'REQUIRED',
    }))

    const rows = (result.rows ?? []).map((row) => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => { obj[col.name] = row.f[i]?.v })
      return obj
    })

    return {
      rows,
      columns,
      rowCount: parseInt(result.totalRows ?? '0', 10),
      executionTimeMs: Date.now() - start,
    }
  }

  async listTables(): Promise<TableInfo[]> {
    const token = await this.getAccessToken()
    const baseUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${this.creds.projectId}`

    const res = await fetch(
      `${baseUrl}/datasets/${this.creds.datasetId}/tables`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) throw new Error(`Failed to list tables: ${res.status}`)
    const json = (await res.json()) as { tables?: Array<{ tableReference: { tableId: string } }> }
    const tableRefs = json.tables ?? []

    const tables: TableInfo[] = []
    for (const ref of tableRefs) {
      const tableId = ref.tableReference.tableId
      const detailRes = await fetch(
        `${baseUrl}/datasets/${this.creds.datasetId}/tables/${tableId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const detail = (await detailRes.json()) as {
        schema?: { fields: Array<{ name: string; type: string; mode: string }> }
        numRows?: string
      }
      tables.push({
        schema: this.creds.datasetId,
        name: tableId,
        rowCount: parseInt(detail.numRows ?? '0', 10),
        columns: (detail.schema?.fields ?? []).map((f) => ({
          name: f.name,
          type: f.type,
          nullable: f.mode !== 'REQUIRED',
        })),
      })
    }
    return tables
  }

  async previewTable(table: string, limit = 100): Promise<QueryResult> {
    return this.query(
      `SELECT * FROM \`${this.creds.projectId}.${this.creds.datasetId}.${table}\` LIMIT ${limit}`
    )
  }

  async discoverSchema(): Promise<SchemaDiscoveryResult> {
    const tables = await this.listTables()
    return { tables, suggestedMappings: inferFieldMappings(tables) }
  }
}
