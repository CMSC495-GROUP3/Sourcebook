/** Wording for an escalation's webhook delivery, shared by the list and the detail pane. */
import type { Escalation } from '../../types'

export const DELIVERY_LABELS: Record<Escalation['delivery_status'], string> = {
  pending: 'Pending',
  delivered: 'Delivered',
  failed: 'Failed',
  not_configured: 'No webhook configured',
}

/** The sentence above the retry control, or null when there is nothing to act on. */
export function deliveryNotice(escalation: Escalation): string | null {
  if (escalation.delivery_status === 'failed') {
    return escalation.delivery_retryable
      ? 'Delivery to the configured HR webhook failed.'
      : `Delivery failed after ${escalation.delivery_attempts} attempts, the most the server allows.`
  }
  if (escalation.delivery_retryable) {
    return 'This request has not been sent to the HR webhook yet.'
  }
  return null
}

export function formatTime(value: string): string {
  return new Date(value).toLocaleString()
}
