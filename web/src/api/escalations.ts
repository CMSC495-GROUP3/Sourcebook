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