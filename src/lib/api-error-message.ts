export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ClientApiError'
  }
}

interface ErrorEnvelope {
  error?: {
    code?: unknown
    message?: unknown
  }
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return typeof value === 'object' && value !== null && 'error' in value
}

export async function errorFromResponse(res: Response): Promise<ClientApiError> {
  const fallback = `HTTP ${res.status}`
  const payload = await res.json().catch((): unknown => null)

  if (isErrorEnvelope(payload)) {
    const code = typeof payload.error?.code === 'string' ? payload.error.code : undefined
    const message = typeof payload.error?.message === 'string' ? payload.error.message : fallback
    return new ClientApiError(message, res.status, code)
  }

  return new ClientApiError(fallback, res.status)
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  return (
    error instanceof ClientApiError &&
    (error.code === 'DATABASE_UNAVAILABLE' || error.status === 503)
  )
}

export function friendlyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ClientApiError) return error.message
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}
