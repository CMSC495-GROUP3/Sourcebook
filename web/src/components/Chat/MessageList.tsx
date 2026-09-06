/**
 * MessageList — the conversation, laid out as a Q&A column.
 * Auto-scrolls to the bottom when a new message arrives.
 * Shows a status line while retrieval runs and before the first token.
 */
import { useEffect, useRef } from 'react'
import Message from './Message'
import type { ChatMessage } from '../../hooks/useChat'

interface Props {
  messages: ChatMessage[]
  sessionId: string | null
  loading: boolean
  streaming: boolean
  activeSource: string | null
  onOpenSource: (title: string) => void
  onFollowUp: (q: string) => void
  onEscalated: (index: number, escalationId: string) => void
}

export default function MessageList({
  messages, sessionId, loading, streaming, activeSource, onOpenSource, onFollowUp, onEscalated,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const lastIndex = messages.length - 1

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-190 flex-col gap-8 px-5 pt-8 pb-6 sm:px-8 sm:pt-12">
        {messages.map((msg, i) => (
          <Message
            key={i}
            message={msg}
            index={i}
            sessionId={sessionId}
            isLast={i === lastIndex && msg.role === 'assistant'}
            isStreaming={streaming && i === lastIndex && msg.role === 'assistant'}
            activeSource={activeSource}
            onOpenSource={onOpenSource}
            onFollowUp={onFollowUp}
            onEscalated={onEscalated}
          />
        ))}

        {loading && (
          <p role="status" className="flex items-center gap-2.5 text-[13px] text-ink-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent motion-reduce:animate-none" aria-hidden="true" />
            Searching the indexed policies…
          </p>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
