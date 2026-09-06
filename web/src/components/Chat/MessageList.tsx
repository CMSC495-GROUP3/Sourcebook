/**
 * MessageList — the conversation, laid out as a Q&A column.
 * Auto-scrolls to the bottom when a new message arrives.
 * Shows a pulsing dot row while the assistant is thinking.
 */
import { useEffect, useRef } from 'react'
import Message from './Message'
import type { ChatMessage } from '../../hooks/useChat'

interface Props {
  messages: ChatMessage[]
  sessionId: string | null
  loading: boolean
  streaming: boolean
  onFollowUp: (q: string) => void
  onEscalated: (index: number, escalationId: string) => void
}

export default function MessageList({ messages, sessionId, loading, streaming, onFollowUp, onEscalated }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const lastIndex = messages.length - 1

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-190 flex-col gap-7 px-5 pt-7 pb-6 sm:px-8 sm:pt-11">
        {messages.map((msg, i) => (
          <Message
            key={i}
            message={msg}
            index={i}
            sessionId={sessionId}
            isLast={i === lastIndex && msg.role === 'assistant'}
            isStreaming={streaming && i === lastIndex && msg.role === 'assistant'}
            onFollowUp={onFollowUp}
            onEscalated={onEscalated}
          />
        ))}

        {loading && (
          <div className="flex h-6 items-center gap-1.5" role="status" aria-label="Waiting for an answer">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-3 [animation-delay:0ms] motion-reduce:animate-none" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-3 [animation-delay:150ms] motion-reduce:animate-none" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-3 [animation-delay:300ms] motion-reduce:animate-none" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
