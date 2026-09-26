/**
 * EscalationListItem — one row in the HR queue. Carries enough to pick the
 * right request: the question, the start of the answer, and when and why it
 * was sent. Everything else is in the detail pane.
 */
import type { Escalation } from '../../types'
import { DELIVERY_LABELS, formatTime } from './delivery'

interface Props {
  escalation: Escalation
  selected: boolean
  onSelect: (escalationId: string) => void
}

const REASON_LABELS: Record<Escalation['reason'], string> = {
  refused: 'Refused',
  unhelpful: 'Unhelpful',
}

export default function EscalationListItem({ escalation, selected, onSelect }: Props) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(escalation.escalation_id)}
        data-row-id={escalation.escalation_id}
        aria-current={selected ? 'true' : undefined}
        className={`flex w-full cursor-pointer flex-col gap-1 rounded-md px-3 py-3 text-left transition-colors ${
          selected ? 'bg-accent-soft' : 'hover:bg-paper-3'
        }`}
      >
        <span className={`text-[14.5px] leading-snug font-medium ${selected ? 'text-accent-ink' : 'text-ink'}`}>
          {escalation.question}
        </span>
        {escalation.answer_excerpt && (
          <span className="line-clamp-2 text-[12.5px] leading-normal text-ink-2">
            {escalation.answer_excerpt}
          </span>
        )}
        <span className="tnum flex flex-wrap items-center gap-x-2 text-[12px] text-ink-2">
          <span className="caps text-[10px]">{REASON_LABELS[escalation.reason]}</span>
          <span>{formatTime(escalation.created_at)}</span>
          <span>· {DELIVERY_LABELS[escalation.delivery_status]}</span>
        </span>
      </button>
    </li>
  )
}
