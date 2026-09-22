import { isAxiosError } from 'axios'
import client from './client'
import type { Escalation, EscalationStatus } from '../types'

interface EscalationsResponse {
  items: Escalation[]
  total: number
}

export async function getEscalations(
  status: EscalationStatus
): Promise<EscalationsResponse> {
  const response = await client.get<EscalationsResponse>('/api/escalations', {
    params: {
      status,
    },
  })

  return response.data
}

export async function updateEscalation(
  escalationId: string,
  status: EscalationStatus,
  resolution?: string | null
): Promise<Escalation> {
  const response = await client.patch<Escalation>(
    `/api/escalations/${escalationId}`,
    {
      status,
      ...(resolution !== undefined ? { resolution } : {}),
    }
  )

  return response.data
}

export async function retryEscalationDelivery(
  escalationId: string
): Promise<Escalation> {
  const response = await client.post<Escalation>(
    `/api/escalations/${escalationId}/retry-delivery`
  )

  return response.data
}

/**
 * The server's own explanation for a failed request, or `fallback` when it
 * sent none. Route errors carry it in `detail`; the rate limiter's 429 body
 * uses `error` instead.
 */
export function escalationErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data: unknown = error.response?.data
    if (typeof data === 'object' && data !== null) {
      const { detail, error: message } = data as Record<string, unknown>
      if (typeof detail === 'string') return detail
      if (typeof message === 'string') return message
    }
  }
  return fallback
}
