import { useEffect, useState } from 'react'
import {
  getEscalations,
  updateEscalation,
  retryEscalationDelivery,
} from '../api/escalations'
import type { Escalation, EscalationStatus } from '../types'

function formatCreatedTime(value: string) {
  return new Date(value).toLocaleString()
}

export default function EscalationsPage() {
  const [status, setStatus] = useState<EscalationStatus>('open')
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [resolution, setResolution] = useState('')
  const [action, setAction] = useState<'resolve' | 'reopen' | 'retry' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function loadEscalations(currentStatus: EscalationStatus) {
    try {
      setLoading(true)
      setError(null)

      const data = await getEscalations(currentStatus)
      setEscalations(data.items)
    } catch {
      setError('Unable to load HR requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSelectedId(null)
    setResolution('')
    setActionError(null)
    loadEscalations(status)
  }, [status])

  const selectedEscalation =
    escalations.find(
      (escalation) => escalation.escalation_id === selectedId
    ) ?? null

  function selectEscalation(escalationId: string) {
    setSelectedId(escalationId)
    setResolution('')
    setActionError(null)
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
    } catch {
      setActionError('Unable to resolve this request.')
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
    } catch {
      setActionError('Unable to reopen this request.')
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
    } catch {
      setActionError(
        'Unable to retry delivery. Delivery may not be configured or the retry limit may have been reached.'
      )
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
            {escalations.length} {status}
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setStatus('open')}
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
            onClick={() => setStatus('resolved')}
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
            <p className="text-[14px] text-ink">
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
                  <h2 className="font-medium text-ink">
                    {escalation.question}
                  </h2>

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

                  <span className="capitalize">
                    Delivery: {escalation.delivery_status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedEscalation && (
          <div className="mt-5 max-w-3xl rounded-md border border-rule bg-paper-2 p-5">
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
                {selectedEscalation.answer_excerpt || 'No answer was provided.'}
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

                <p className="mt-1 text-[14px] capitalize text-ink">
                  {selectedEscalation.delivery_status}
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

            {selectedEscalation.delivery_status === 'failed' && (
              <div className="mt-5 rounded-md border border-rule bg-paper-3 p-4">
                <p className="text-[13.5px] text-ink-2">
                  Delivery to the configured HR webhook failed.
                </p>

                <button
                  type="button"
                  onClick={handleRetryDelivery}
                  disabled={action !== null}
                  className="mt-3 cursor-pointer rounded-md border border-rule-strong bg-paper-2 px-4 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {action === 'retry'
                    ? 'Retrying...'
                    : 'Retry delivery'}
                </button>
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
              <p className="mt-5 text-[13px] text-brick">
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