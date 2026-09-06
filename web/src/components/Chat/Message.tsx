import type { Ref } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import { AlertCircle, BookOpen } from 'lucide-react'
import ConfidenceBadge from './ConfidenceBadge'
import SourcesList from './SourcesList'
import FollowUpButtons from './FollowUpButtons'
import EscalateButton from './EscalateButton'
import type { ChatMessage } from '../../hooks/useChat'
import { ANSWER_PROSE } from '../../lib/prose'

interface Props {
  /** Attached to the block so the list can scroll a question into view. */
  ref?: Ref<HTMLDivElement>
  message: ChatMessage
  /** Position in the conversation; the escalation request names the turn by it. */
  index: number
  sessionId: string | null
  isLast: boolean
  /** Tokens are still arriving for this message; show the caret and hold the metadata. */
  isStreaming: boolean
  /** Title open in the source pane, so its chip can show as selected. */
  activeSource: string | null
  onOpenSource: (title: string) => void
  onFollowUp: (q: string) => void
  onEscalated: (index: number, escalationId: string) => void
}

function Question({ text, first, ref }: { text: string; first: boolean; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className={`flex scroll-mt-[22px] flex-col gap-1.5 ${first ? '' : 'border-t border-rule pt-8'}`}>
      <span className="caps text-ink-3">Question</span>
      <p className="font-display text-[21px] leading-[1.3] font-medium tracking-tight text-ink sm:text-[24px]">{text}</p>
    </div>
  )
}

export default function Message({
  ref, message, index, sessionId, isLast, isStreaming, activeSource, onOpenSource, onFollowUp, onEscalated,
}: Props) {
  if (message.role === 'user') {
    return <Question ref={ref} text={message.content} first={index === 0} />
  }

  if (message.refused) {
    return (
      <div ref={ref} className="flex flex-col gap-3">
        <div className="rounded-lg border border-ochre-rule bg-ochre-soft">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-ochre-rule/70 px-4 py-2.5">
            <span className="caps inline-flex items-center gap-2 text-ochre-ink">
              <AlertCircle size={15} aria-hidden="true" className="text-ochre" />
              No matching policy
            </span>
            <ConfidenceBadge confidence={message.confidence} />
          </div>
          <div className="flex flex-col gap-1.5 px-4 py-3.5">
            <p className="text-[15px] leading-[1.55] text-ink">{message.content}</p>
            <p className="text-[13.5px] leading-normal text-ink-2">
              This is different from a policy that exists but says no. Nothing indexed came close enough to answer from.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 px-4 pb-4">
            <EscalateButton
              sessionId={sessionId}
              messageIndex={index}
              reason="refused"
              escalationId={message.escalation_id}
              prominent
              onEscalated={(id) => onEscalated(index, id)}
            />
            <Link
              to="/documents"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-rule-strong bg-paper-3 px-3.5 text-[13.5px] font-medium text-ink transition-colors hover:border-ink-3"
            >
              <BookOpen size={15} aria-hidden="true" className="text-ink-3" />
              See what is indexed
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="flex flex-col gap-5">
      <div className={`${ANSWER_PROSE} ${isStreaming ? 'caret' : ''}`}>
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
      {!isStreaming && (
        <footer className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <ConfidenceBadge confidence={message.confidence} />
            <SourcesList sources={message.sources ?? []} activeSource={activeSource} onOpen={onOpenSource} />
          </div>
          {isLast && (
            <FollowUpButtons questions={message.follow_ups ?? []} onSelect={onFollowUp} />
          )}
          <EscalateButton
            sessionId={sessionId}
            messageIndex={index}
            reason="unhelpful"
            escalationId={message.escalation_id}
            onEscalated={(id) => onEscalated(index, id)}
          />
        </footer>
      )}
    </div>
  )
}
