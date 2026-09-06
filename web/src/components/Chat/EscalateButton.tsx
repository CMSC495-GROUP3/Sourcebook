/**
 * EscalateButton — hands a question to a person.
 *
 * Rendered under every assistant turn. On a refusal it is the main call to
 * action; under an answer it is a quiet "not what you needed?" link. Both post
 * the same request, and `reason` records which one was used.
 *
 * The request names the message by its position in the stored conversation and
 * the server copies the question from its own record. The client never sends
 * the text, so it cannot escalate an exchange that did not happen.
 */
import { useState } from 'react'
import { AxiosError } from 'axios'
import { Check, LifeBuoy } from 'lucide-react'
import client from '../../api/client'
import { ESCALATION_CONTACT } from '../../config'
import type { Escalation, EscalationReason } from '../../types'

interface Props {
  sessionId: string | null
  messageIndex: number
  reason: EscalationReason
  /** Set once this message has been escalated, in this session or a previous one. */
  escalationId?: string
  /** Full button rather than a text link. Used on the refusal card. */
  prominent?: boolean
  onEscalated: (escalationId: string) => void
}

type Phase = 'idle' | 'composing' | 'sending' | 'error'

/** Characters of the id shown to the employee, enough to quote back to HR. */
const REFERENCE_LENGTH = 8
/** Mirrors ESCALATION_NOTE_MAX_LENGTH in policy_assistant/rag/config.py; the server enforces the real limit. */
const NOTE_MAX_LENGTH = 2000

function explain(error: unknown): string {
  const status = error instanceof AxiosError ? error.response?.status : undefined
  if (status === 400) return 'This conversation is out of sync. Reload the page and try again.'
  if (status === 429) return 'Too many requests. Wait a minute and try again.'
  return `Could not reach ${ESCALATION_CONTACT} right now. Try again in a moment.`
}

export default function EscalateButton({
  sessionId, messageIndex, reason, escalationId, prominent = false, onEscalated,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  if (escalationId) {
    return (
      <p className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
        <Check size={14} strokeWidth={2.25} aria-hidden="true" className="text-moss" />
        Sent to {ESCALATION_CONTACT}
        <span className="tnum text-ink-3">· ref {escalationId.slice(0, REFERENCE_LENGTH)}</span>
      </p>
    )
  }

  // Every message in the UI belongs to a stored conversation, so this only
  // guards the moment before the first conversation exists.
  if (!sessionId) return null

  async function submit() {
    setPhase('sending')
    setError('')
    try {
      const res = await client.post<Escalation>('/api/escalations', {
        session_id: sessionId,
        message_index: messageIndex,
        reason,
        note: note.trim() || null,
      })
      onEscalated(res.data.escalation_id)
    } catch (err) {
      setError(explain(err))
      setPhase('error')
    }
  }

  if (phase === 'idle') {
    return prominent ? (
      <button
        type="button"
        onClick={() => setPhase('composing')}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-accent px-3.5 text-[13.5px] font-medium text-paper transition-colors hover:bg-accent-ink"
      >
        <LifeBuoy size={15} aria-hidden="true" />
        Ask {ESCALATION_CONTACT}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setPhase('composing')}
        className="cursor-pointer self-start text-[12.5px] text-ink-3 transition-colors hover:text-ink"
      >
        Not what you needed?{' '}
        <span className="text-ink-2 underline underline-offset-3">Ask {ESCALATION_CONTACT}</span>
      </button>
    )
  }

  const sending = phase === 'sending'

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void submit() }}
      className="flex w-full flex-col gap-3 rounded-lg border border-rule-strong bg-paper-3 p-4"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-[14px] font-medium text-ink">Send to {ESCALATION_CONTACT}</h3>
        <p className="text-[13px] leading-normal text-ink-2">
          They get your question and this answer. You get a reference number to quote if you follow up.
        </p>
      </div>
      <textarea
        id={`escalation-note-${messageIndex}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={NOTE_MAX_LENGTH}
        rows={3}
        disabled={sending}
        autoFocus
        aria-label={`Note for ${ESCALATION_CONTACT} (optional)`}
        placeholder="Add context if it helps. For example: my manager said this changed last quarter."
        className="w-full resize-none rounded-md border border-rule bg-paper px-3 py-2 text-[16px] leading-normal text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60 sm:text-[14px]"
      />
      {phase === 'error' && (
        <p role="alert" className="text-[12.5px] text-brick">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sending}
          className="h-9 cursor-pointer rounded-md bg-accent px-4 text-[13.5px] font-medium text-paper transition-colors hover:bg-accent-ink disabled:cursor-default disabled:bg-rule disabled:text-ink-3"
        >
          {sending ? 'Sending…' : phase === 'error' ? 'Try again' : 'Send'}
        </button>
        <button
          type="button"
          disabled={sending}
          onClick={() => { setPhase('idle'); setNote(''); setError('') }}
          className="h-9 cursor-pointer px-2 text-[13.5px] text-ink-2 transition-colors hover:text-ink disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
