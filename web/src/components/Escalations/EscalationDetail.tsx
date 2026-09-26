/**
 * EscalationDetail — everything a handler needs to close one request: the
 * question and answer the employee saw, their note, where the hand-off was
 * delivered, and the resolve, reopen, and retry controls.
 *
 * The page keys this by escalation_id, so the resolution draft belongs to one
 * request and starts empty when another is opened.
 */
import { useState } from 'react'
import type { Escalation } from '../../types'
import { DELIVERY_LABELS, deliveryNotice, formatTime } from './delivery'

export type EscalationAction = 'resolve' | 'reopen' | 'retry'

interface Props {
  escalation: Escalation
  action: EscalationAction | null
  actionError: string | null
  onResolve: (resolution: string) => void
  onReopen: () => void
  onRetry: () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="caps text-ink-3">{label}</p>
      <div className="mt-1 text-[14px] leading-6 text-ink">{children}</div>
    </div>
  )
}

const SECONDARY_BUTTON =
  'cursor-pointer rounded-md border border-rule-strong bg-paper-2 px-4 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-paper-3 disabled:cursor-not-allowed disabled:opacity-40'

export default function EscalationDetail({
  escalation, action, actionError, onResolve, onReopen, onRetry,
}: Props) {
  const [resolution, setResolution] = useState('')
  const notice = deliveryNotice(escalation)

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5 border-b border-rule pb-5">
        <p className="tnum text-[12.5px] text-ink-3">{formatTime(escalation.created_at)}</p>
        <h2 tabIndex={-1} className="font-display text-[24px] leading-tight font-medium tracking-tight text-ink outline-none">
          {escalation.question}
        </h2>
      </header>

      <Field label="Assistant response">
        <p className="text-ink-2">{escalation.answer_excerpt || 'No answer was provided.'}</p>
      </Field>

      <Field label="Employee note">
        <p>{escalation.note || 'No note provided.'}</p>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Reason">
          <p className="capitalize">{escalation.reason}</p>
        </Field>
        <Field label="Confidence">
          <p className="tnum">
            {escalation.confidence === null ? 'Unavailable' : `${Math.round(escalation.confidence)}%`}
          </p>
        </Field>
        <Field label="Sources">
          {escalation.sources.length > 0 ? (
            <ul className="space-y-0.5">
              {escalation.sources.map((source) => <li key={source}>{source}</li>)}
            </ul>
          ) : (
            <p className="text-ink-3">No sources available.</p>
          )}
        </Field>
        <Field label="Delivery">
          <p>{DELIVERY_LABELS[escalation.delivery_status]}</p>
          <p className="tnum text-[12.5px] text-ink-3">
            {escalation.delivery_attempts} attempt{escalation.delivery_attempts === 1 ? '' : 's'}
            {escalation.delivery_last_attempt_at &&
              `, last ${formatTime(escalation.delivery_last_attempt_at)}`}
          </p>
        </Field>
      </div>

      {notice && (
        <div className="rounded-md border border-rule bg-paper-3 p-4">
          <p className="text-[13.5px] text-ink-2">{notice}</p>
          {/* The server says whether a retry would send; the attempt limit and
              an in-flight claim both turn it off. */}
          {escalation.delivery_retryable && (
            <button type="button" onClick={onRetry} disabled={action !== null} className={`mt-3 ${SECONDARY_BUTTON}`}>
              {action === 'retry'
                ? 'Sending…'
                : escalation.delivery_status === 'failed'
                  ? 'Retry delivery'
                  : 'Send to webhook'}
            </button>
          )}
        </div>
      )}

      {escalation.status === 'resolved' && escalation.resolution && (
        <Field label="Resolution">
          <p>{escalation.resolution}</p>
        </Field>
      )}

      {actionError && (
        <p role="alert" className="text-[13px] text-brick">{actionError}</p>
      )}

      {escalation.status === 'open' ? (
        <form
          className="flex flex-col gap-3 border-t border-rule pt-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (resolution.trim()) onResolve(resolution.trim())
          }}
        >
          <label htmlFor="resolution" className="caps text-ink-3">Resolution note</label>
          <textarea
            id="resolution"
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            placeholder="What you told the employee, or where you pointed them."
            rows={4}
            className="w-full resize-y rounded-md border border-rule-strong bg-paper-3 p-3 text-[16px] text-ink transition-colors placeholder:text-ink-3 focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none sm:text-[14px]"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!resolution.trim() || action !== null}
              className="cursor-pointer rounded-md bg-accent px-4 py-2 text-[13.5px] font-medium text-paper transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {action === 'resolve' ? 'Resolving…' : 'Resolve request'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end border-t border-rule pt-5">
          <button type="button" onClick={onReopen} disabled={action !== null} className={SECONDARY_BUTTON}>
            {action === 'reopen' ? 'Reopening…' : 'Reopen request'}
          </button>
        </div>
      )}
    </article>
  )
}
