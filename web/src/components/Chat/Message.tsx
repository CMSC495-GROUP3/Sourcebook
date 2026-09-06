import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import ConfidenceBadge from './ConfidenceBadge'
import SourcesList from './SourcesList'
import FollowUpButtons from './FollowUpButtons'
import EscalateButton from './EscalateButton'
import type { ChatMessage } from '../../hooks/useChat'

interface Props {
  message: ChatMessage
  /** Position in the conversation; the escalation request names the turn by it. */
  index: number
  sessionId: string | null
  isLast: boolean
  /** Tokens are still arriving for this message; show the caret and hold the metadata. */
  isStreaming: boolean
  onFollowUp: (q: string) => void
  onEscalated: (index: number, escalationId: string) => void
}

// Markdown inside an answer, kept close to the surrounding UI type.
const PROSE = [
  'prose max-w-none text-[15px] leading-[1.65] text-ink',
  'prose-p:my-2.5 prose-p:text-ink',
  'prose-headings:font-display prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-ink',
  'prose-h1:text-[22px] prose-h1:mt-4 prose-h1:mb-1.5 prose-h2:text-[19px] prose-h2:mt-4 prose-h2:mb-1.5 prose-h3:text-[16px] prose-h3:mt-3 prose-h3:mb-1',
  'prose-ul:my-2 prose-ul:pl-5 prose-ol:my-2 prose-ol:pl-5 prose-li:my-1 prose-li:marker:text-ink-3',
  'prose-strong:font-semibold prose-strong:text-ink prose-em:text-ink-2',
  'prose-a:text-accent prose-a:underline-offset-3 hover:prose-a:text-accent-ink',
  'prose-code:rounded prose-code:bg-paper-2 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-normal prose-code:text-ink prose-code:before:content-none prose-code:after:content-none',
  'prose-pre:rounded-lg prose-pre:border prose-pre:border-rule prose-pre:bg-paper-2 prose-pre:text-[13px] prose-pre:text-ink',
  'prose-blockquote:border-l-rule-strong prose-blockquote:text-ink-2 prose-blockquote:not-italic prose-blockquote:font-normal',
  'prose-hr:border-rule prose-table:text-[14px] prose-th:text-ink prose-td:text-ink',
].join(' ')

function Question({ text, first }: { text: string; first: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${first ? '' : 'border-t border-rule pt-7'}`}>
      <span className="caps text-ink-3">Question</span>
      <p className="font-display text-[20px] leading-[1.3] font-medium tracking-tight text-ink sm:text-[22px]">{text}</p>
    </div>
  )
}

export default function Message({ message, index, sessionId, isLast, isStreaming, onFollowUp, onEscalated }: Props) {
  if (message.role === 'user') {
    return <Question text={message.content} first={index === 0} />
  }

  if (message.refused) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3.5 rounded-lg border border-ochre-rule bg-ochre-soft px-4 py-4 sm:px-4.5">
          <AlertCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-ochre" />
          <div className="flex flex-col gap-1.5">
            <span className="caps text-ochre-ink">No matching policy</span>
            <p className="text-[15px] leading-[1.55] text-ink">{message.content}</p>
            <p className="text-[13.5px] leading-normal text-ink-2">
              This is different from a policy that exists but says no.{' '}
              <Link to="/documents" className="text-accent underline-offset-3 hover:text-accent-ink hover:underline">
                Check the Policy Library
              </Link>{' '}
              to see what is loaded today.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2.5">
          <ConfidenceBadge confidence={message.confidence} />
          <EscalateButton
            sessionId={sessionId}
            messageIndex={index}
            reason="refused"
            escalationId={message.escalation_id}
            prominent
            onEscalated={(id) => onEscalated(index, id)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`${PROSE} ${isStreaming ? 'caret' : ''}`}>
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
      {!isStreaming && (
        <div className="flex flex-col gap-3.5">
          <ConfidenceBadge confidence={message.confidence} />
          <SourcesList sources={message.sources ?? []} />
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
        </div>
      )}
    </div>
  )
}
