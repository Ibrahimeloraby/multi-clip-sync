import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (_client) return _client

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined

  if (!apiKey) {
    console.warn(
      '[Agent] VITE_ANTHROPIC_API_KEY not set. Agent features will be unavailable. ' +
      'Add it to your .env file: VITE_ANTHROPIC_API_KEY=sk-ant-...'
    )
  }

  _client = new Anthropic({
    apiKey: apiKey ?? 'no-key-configured',
    dangerouslyAllowBrowser: true,  // Required for browser usage; in production use an API proxy
    maxRetries: 2,
    timeout: 60000,
  })

  return _client
}

export const CLAUDE_MODEL = 'claude-sonnet-4-6'

// Retry wrapper for transient errors
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const isRetryable =
        lastError.message.includes('529') || // overloaded
        lastError.message.includes('503') || // unavailable
        lastError.message.includes('timeout')

      if (!isRetryable || attempt === maxAttempts) throw lastError

      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError ?? new Error('Unknown error')
}
