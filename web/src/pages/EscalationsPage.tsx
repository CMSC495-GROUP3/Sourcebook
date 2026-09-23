/**
 * The Human Resources queue: employee escalations, newest first. A handler
 * reads the question, the assistant's answer, and the employee's note, then
 * resolves the request with a note, reopens it, or retries a failed webhook
 * delivery. The same operations exist as API routes; see docs/api.md.
 */
import { useEffect, useRef, useState } from 'react'
import {
  getEscalations,
  updateEscalation,
  retryEscalationDelivery,
  escalationErrorMessage,
} from '../api/escalations'
import type { Escalation, EscalationStatus } from '../types'

const DETAIL_SCROLL: ScrollIntoViewOptions = { block: 'start', behavior: 'smooth' }

const DELIVERY_LABELS: Record<Escalation['delivery_status'], string> = {
  pending: 'Pending',
  delivered: 'Delivered',
  failed: 'Failed',
  not_configured: 'No webhook configured',
}

function deliveryNotice(escalation: Escalation): string {
  if (escalation.delivery_status !== 'failed') {
    return 'This request has not been sent to the HR webhook yet.'
  }
  if (escalation.delivery_retryable) {
    return 'Delivery to the configured HR webhook failed.'
  }
  return `Delivery failed after ${escalation.delivery_attempts} attempts, the most the server allows.`
}

function formatCreatedTime(value: string) {
  return new Date(value).toLocaleString()
}

export default function EscalationsPage() {
  const [status, setStatus] = useState<EscalationStatus>('open')
  const [escalations, setEscalations] = useState<Escalation[]>([])
  // The list returns at most 50 items; `total` is the full count for the status.
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [resolution, setResolution] = useState('')
  const [action, setAction] = useState<
    'resolve' | 'reopen' | 'retry' | null
  >(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function loadEscalations(currentStatus: EscalationStatus) {
    try {
      setLoading(true)
      setError(null)

      const data = await getEscalations(currentStatus)
      setEscalations(data.items)
      setTotal(data.total)
    } catch {
      setError('Unable to load HR requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function fetchEscalations() {
      try {
        const data = await getEscalations(status)

        if (!cancelled) {
          setEscalations(data.items)
          setTotal(data.total)
          setError(null)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load HR requests.')
          setLoading(false)
        }
      }
    }

    void fetchEscalations()

    return () => {
      cancelled = true
    }
  }, [status])

  const selectedEscalation =
    escalations.find(
      (escalation) => escalation.escalation_id === selectedId
    ) ?? null

  // The detail panel renders below the list, so picking a request scrolls to
  // it. The effect runs after the panel for the new selection has mounted.
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedId) {
      detailRef.current?.scrollIntoView(DETAIL_SCROLL)
    }
  }, [selectedId])

  function selectEscalation(escalationId: string) {
    if (escalationId === selectedId) {
      // Already open: scroll back to it and keep any note being typed.
      detailRef.current?.scrollIntoView(DETAIL_SCROLL)
      return
    }

    setSelectedId(escalationId)
    setResolution('')
    setActionError(null)
  }

  function changeStatus(nextStatus: EscalationStatus) {
    if (nextStatus === status) {
      return
    }

    setSelectedId(null)
    setResolution('')
    setActionError(null)
    setLoading(true)
    setStatus(nextStatus)
  }

  async function handleResolve() {
    if (!selectedEscalation || !resolution.trim()) {
      return
    }

    try {
      setAction('resolve')
      setActionError(null)

      await updateEscalation(
        selectedEscalation.escalation_id,
        'resolved',
        resolution.trim()
      )

      setSelectedId(null)
      setResolution('')
      await loadEscalations('open')
    } catch (error) {
      setActionError(escalationErrorMessage(error, 'Unable to resolve this request.'))
    } finally {
      setAction(null)
    }
  }

  async function handleReopen() {
    if (!selectedEscalation) {
      return
    }

    try {
      setAction('reopen')
      setActionError(null)

      await updateEscalation(
        selectedEscalation.escalation_id,
        'open'
      )

      setSelectedId(null)
      await loadEscalations('resolved')
    } catch (error) {
      setActionError(escalationErrorMessage(error, 'Unable to reopen this request.'))
    } finally {
      setAction(null)
    }
  }

  async function handleRetryDelivery() {
    if (!selectedEscalation) {
      return
    }

    try {
      setAction('retry')
      setActionError(null)

      const updated = await retryEscalationDelivery(
        selectedEscalation.escalation_id
      )

      setEscalations((current) =>
        current.map((escalation) =>
          escalation.escalation_id === updated.escalation_id
            ? updated
            : escalation
        )
      )

      if (updated.delivery_status !== 'delivered') {
        setActionError('Delivery was retried and failed again.')
      }
    } catch (error) {
      setActionError(escalationErrorMessage(error, 'Unable to retry delivery.'))
    } finally {
      setAction(null)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-paper">
      <header className="flex h-15 shrink-0 items-center justify-between border-b border-rule px-5">
        <h1 className="font-display text-[22px] font-medium tracking-tight text-ink">
          HR Requests
        </h1>

        {!loading && !error && (
          <span className="text-[13px] text-ink-3">
            {total} {status}
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => changeStatus('open')}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
              status === 'open'
                ? 'border-accent bg-accent text-white'
                : 'border-rule-strong bg-paper-2 text-ink-2 hover:bg-paper-3'
            }`}
          >
            Open
          </button>

          <button
            type="button"
            onClick={() => changeStatus('resolved')}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
              status === 'resolved'
                ? 'border-accent bg-accent text-white'
                : 'border-rule-strong bg-paper-2 text-ink-2 hover:bg-paper-3'
            }`}
          >
            Resolved
          </button>
        </div>

        {loading && (
          <p className="text-[14px] text-ink-3">
            Loading requests...
          </p>
        )}

        {error && (
          <div className="rounded-md border border-rule bg-paper-2 p-4">
            <p role="alert" className="text-[14px] text-ink">
              {error}
            </p>

            <button
              type="button"
              onClick={() => loadEscalations(status)}
              className="mt-3 cursor-pointer text-[13px] font-medium text-accent hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && escalations.length === 0 && (
          <div className="rounded-md border border-rule bg-paper-2 p-5">
            <h2 className="font-display text-[18px] font-medium text-ink">
              {status === 'open'
                ? 'No open requests'
                : 'No resolved requests'}
            </h2>

            <p className="mt-1 text-[13.5px] text-ink-3">
              {status === 'open'
                ? 'Employee escalations that need Human Resources review will appear here.'
                : 'Requests resolved by Human Resources will appear here.'}
            </p>
          </div>
        )}

        {!loading && !error && escalations.length > 0 && (
          <div className="flex max-w-3xl flex-col gap-3">
            {escalations.map((escalation) => (
              <button
                key={escalation.escalation_id}
                type="button"
                onClick={() => selectEscalation(escalation.escalation_id)}
                className={`w-full cursor-pointer rounded-md border p-4 text-left transition-colors ${
                  selectedId === escalation.escalation_id
                    ? 'border-accent bg-accent-soft'
                    : 'border-rule bg-paper-2 hover:bg-paper-3'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-medium text-ink">
                    {escalation.question}
                  </span>

                  <span className="shrink-0 text-[12px] text-ink-3">
                    {formatCreatedTime(escalation.created_at)}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-[13.5px] text-ink-2">
                  {escalation.answer_excerpt}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
                  <span>
                    Reason: {escalation.reason}
                  </span>

                  <span>
                    Confidence:{' '}
                    {escalation.confidence === null
                      ? 'Unavailable'
                      : `${Math.round(escalation.confidence)}%`}
                  </span>

                  <span>
                    Delivery: {DELIVERY_LABELS[escalation.delivery_status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedEscalation && (
          <div ref={detailRef} className="mt-5 max-w-3xl scroll-mt-5 rounded-md border border-rule bg-paper-2 p-5">
            <div className="flex items-start justify-between gap-4 border-b border-rule pb-4">
              <div>
                <p className="caps text-ink-3">
                  HR Request
                </p>

                <h2 className="mt-1 font-display text-[20px] font-medium text-ink">
                  {selectedEscalation.question}
                </h2>
              </div>

              <span className="shrink-0 text-[12px] text-ink-3">
                {formatCreatedTime(selectedEscalation.created_at)}
              </span>
            </div>

            <div className="mt-5">
              <p className="caps text-ink-3">
                Assistant response
              </p>

              <p className="mt-2 text-[14px] leading-6 text-ink-2">
                {selectedEscalation.answer_excerpt ||
                  'No answer was provided.'}
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="caps text-ink-3">
                  Reason
                </p>

                <p className="mt-1 text-[14px] capitalize text-ink">
                  {selectedEscalation.reason}
                </p>
              </div>

              <div>
                <p className="caps text-ink-3">
                  Confidence
                </p>

                <p className="mt-1 text-[14px] text-ink">
                  {selectedEscalation.confidence === null
                    ? 'Unavailable'
                    : `${Math.round(selectedEscalation.confidence)}%`}
                </p>
              </div>

              <div>
                <p className="caps text-ink-3">
                  Delivery status
                </p>

                <p className="mt-1 text-[14px] text-ink">
                  {DELIVERY_LABELS[selectedEscalation.delivery_status]}
                </p>
              </div>

              <div>
                <p className="caps text-ink-3">
                  Delivery attempts
                </p>

                <p className="mt-1 text-[14px] text-ink">
                  {selectedEscalation.delivery_attempts}
                </p>
              </div>
            </div>

            {selectedEscalation.delivery_last_attempt_at && (
              <div className="mt-5">
                <p className="caps text-ink-3">
                  Last delivery attempt
                </p>

                <p className="mt-1 text-[14px] text-ink">
                  {formatCreatedTime(
                    selectedEscalation.delivery_last_attempt_at
                  )}
                </p>
              </div>
            )}

            {(selectedEscalation.delivery_retryable ||
              selectedEscalation.delivery_status === 'failed') && (
              <div className="mt-5 rounded-md border border-rule bg-paper-3 p-4">
                <p className="text-[13.5px] text-ink-2">
                  {deliveryNotice(selectedEscalation)}
                </p>

                {/* The server says whether a retry would send; the attempt
                    limit and an in-flight claim both turn it off. */}
                {selectedEscalation.delivery_retryable && (
                  <button
                    type="button"
                    onClick={handleRetryDelivery}
                    disabled={action !== null}
                    className="mt-3 cursor-pointer rounded-md border border-rule-strong bg-paper-2 px-4 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action === 'retry'
                      ? 'Sending...'
                      : selectedEscalation.delivery_status === 'failed'
                        ? 'Retry delivery'
                        : 'Send to webhook'}
                  </button>
                )}
              </div>
            )}

            <div className="mt-5">
              <p className="caps text-ink-3">
                Sources
              </p>

              {selectedEscalation.sources.length > 0 ? (
                <ul className="mt-2 space-y-1 text-[14px] text-ink">
                  {selectedEscalation.sources.map((source) => (
                    <li key={source}>
                      {source}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[14px] text-ink-3">
                  No sources available.
                </p>
              )}
            </div>

            <div className="mt-5">
              <p className="caps text-ink-3">
                Employee note
              </p>

              <p className="mt-2 text-[14px] leading-6 text-ink">
                {selectedEscalation.note || 'No note provided.'}
              </p>
            </div>

            {selectedEscalation.status === 'resolved' &&
              selectedEscalation.resolution && (
                <div className="mt-5">
                  <p className="caps text-ink-3">
                    Resolution
                  </p>

                  <p className="mt-2 text-[14px] leading-6 text-ink">
                    {selectedEscalation.resolution}
                  </p>
                </div>
              )}

            {actionError && (
              <p role="alert" className="mt-5 text-[13px] text-brick">
                {actionError}
              </p>
            )}

            {selectedEscalation.status === 'open' && (
              <div className="mt-5 border-t border-rule pt-5">
                <label
                  htmlFor="resolution"
                  className="caps text-ink-3"
                >
                  Resolution note
                </label>

                <textarea
                  id="resolution"
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  placeholder="Describe how this request was resolved..."
                  rows={4}
                  className="mt-2 w-full resize-y rounded-md border border-rule-strong bg-paper-3 p-3 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
                />

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleResolve}
                    disabled={!resolution.trim() || action !== null}
                    className="cursor-pointer rounded-md bg-accent px-4 py-2 text-[13.5px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action === 'resolve'
                      ? 'Resolving...'
                      : 'Resolve request'}
                  </button>
                </div>
              </div>
            )}

            {selectedEscalation.status === 'resolved' && (
              <div className="mt-5 border-t border-rule pt-5">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleReopen}
                    disabled={action !== null}
                    className="cursor-pointer rounded-md border border-rule-strong bg-paper-3 px-4 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action === 'reopen'
                      ? 'Reopening...'
                      : 'Reopen request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}